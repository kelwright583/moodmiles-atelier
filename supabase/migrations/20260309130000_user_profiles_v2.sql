-- ============================================================
-- User Profiles v2 — Identity, Handles, Onboarding
-- Migration: 20260309130000
-- ============================================================

-- ── Extend profiles table ─────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle                   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio                      TEXT,
  ADD COLUMN IF NOT EXISTS home_city                TEXT,
  ADD COLUMN IF NOT EXISTS style_vibe               TEXT,
  ADD COLUMN IF NOT EXISTS nationality              TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handle_set               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_completion_score INT NOT NULL DEFAULT 0;

-- is_public on trips (needed for public profile pages)
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Handle format constraint (3-20 chars, lowercase alphanumeric + underscores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'handle_format_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT handle_format_check
      CHECK (handle IS NULL OR handle ~ '^[a-z0-9_]{3,20}$');
  END IF;
END $$;

-- style_vibe constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'style_vibe_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT style_vibe_check
      CHECK (style_vibe IS NULL OR style_vibe IN (
        'classic', 'minimalist', 'bohemian', 'streetwear',
        'resort', 'eclectic', 'preppy', 'avant-garde'
      ));
  END IF;
END $$;

-- ── profiles_handle_history ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles_handle_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  old_handle  TEXT,
  new_handle  TEXT NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles_handle_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own handle history" ON public.profiles_handle_history;
CREATE POLICY "Users can view own handle history"
  ON public.profiles_handle_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_handle_history_user ON public.profiles_handle_history(user_id);

-- ── Profile completion score trigger ──────────────────────────
CREATE OR REPLACE FUNCTION public.update_profile_completion_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  score INT := 0;
BEGIN
  IF NEW.name IS NOT NULL AND trim(NEW.name) <> '' THEN score := score + 20; END IF;
  IF NEW.handle IS NOT NULL AND trim(NEW.handle) <> '' THEN score := score + 20; END IF;
  IF NEW.avatar_url IS NOT NULL AND trim(NEW.avatar_url) <> '' THEN score := score + 20; END IF;
  IF NEW.home_city IS NOT NULL AND trim(NEW.home_city) <> '' THEN score := score + 20; END IF;
  IF NEW.style_vibe IS NOT NULL AND trim(NEW.style_vibe) <> '' THEN score := score + 20; END IF;
  NEW.profile_completion_score := score;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_completion ON public.profiles;
CREATE TRIGGER trg_profile_completion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_completion_score();

-- ── Handle change limit + history trigger ─────────────────────
CREATE OR REPLACE FUNCTION public.check_handle_change_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  change_count INT;
BEGIN
  IF OLD.handle IS DISTINCT FROM NEW.handle AND NEW.handle IS NOT NULL THEN
    -- Count actual changes (not initial set from null)
    SELECT COUNT(*) INTO change_count
      FROM public.profiles_handle_history
      WHERE user_id = NEW.user_id
        AND old_handle IS NOT NULL;

    IF change_count >= 2 AND OLD.handle IS NOT NULL THEN
      RAISE EXCEPTION 'Handle can only be changed twice';
    END IF;

    INSERT INTO public.profiles_handle_history (user_id, old_handle, new_handle)
    VALUES (NEW.user_id, OLD.handle, NEW.handle);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_change ON public.profiles;
CREATE TRIGGER trg_handle_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_handle_change_limit();

-- ── RLS: open profile reads for collaboration ──────────────────
-- Anyone authenticated can read any profile (needed for collaboration features)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- ── Backfill completion scores for existing profiles ───────────
UPDATE public.profiles
SET profile_completion_score = (
  CASE WHEN name IS NOT NULL AND trim(name) <> '' THEN 20 ELSE 0 END +
  CASE WHEN handle IS NOT NULL AND trim(handle) <> '' THEN 20 ELSE 0 END +
  CASE WHEN avatar_url IS NOT NULL AND trim(avatar_url) <> '' THEN 20 ELSE 0 END +
  CASE WHEN home_city IS NOT NULL AND trim(home_city) <> '' THEN 20 ELSE 0 END +
  CASE WHEN style_vibe IS NOT NULL AND trim(style_vibe) <> '' THEN 20 ELSE 0 END
);

-- Mark existing users as onboarding_completed (they already have names set)
UPDATE public.profiles
SET onboarding_completed = true
WHERE name IS NOT NULL AND trim(name) <> '';
