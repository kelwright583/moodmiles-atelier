-- Add price_from to activity_suggestions (was missing from remote despite earlier migration)
ALTER TABLE public.activity_suggestions
  ADD COLUMN IF NOT EXISTS price_from TEXT;
