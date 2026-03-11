-- Prompt 22: Booking Email Import

-- Add import token to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS import_token TEXT UNIQUE
  DEFAULT substring(gen_random_uuid()::text from 1 for 8);

-- Backfill existing profiles
UPDATE profiles SET import_token = substring(gen_random_uuid()::text from 1 for 8)
WHERE import_token IS NULL;

-- Imported bookings table
CREATE TABLE IF NOT EXISTS public.imported_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  raw_email TEXT,
  parsed_type TEXT CHECK(parsed_type IN ('flight','hotel','restaurant','activity','transfer','other')),
  parsed_data JSONB,
  trip_id UUID REFERENCES trips,
  event_id UUID REFERENCES trip_events,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','assigned','ignored')),
  received_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.imported_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own imported bookings"
  ON public.imported_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own imported bookings"
  ON public.imported_bookings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own imported bookings"
  ON public.imported_bookings FOR DELETE
  USING (auth.uid() = user_id);

-- Service role needs insert (webhook inserts on behalf of user)
CREATE POLICY "Service role can insert imported bookings"
  ON public.imported_bookings FOR INSERT
  WITH CHECK (true);
