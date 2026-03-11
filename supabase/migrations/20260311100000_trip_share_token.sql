-- Add share_token to trips for public sharing
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();

-- Backfill existing trips that don't have a share_token
UPDATE public.trips SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- Make it non-nullable and unique
ALTER TABLE public.trips ALTER COLUMN share_token SET NOT NULL;
ALTER TABLE public.trips ADD CONSTRAINT trips_share_token_unique UNIQUE (share_token);

-- Allow public read of trips by share_token when is_public = true
-- (existing RLS lets trip owners/collaborators see trips; this adds public access)
DROP POLICY IF EXISTS "Public can view shared trips" ON public.trips;
CREATE POLICY "Public can view shared trips"
  ON public.trips FOR SELECT
  USING (is_public = true);
