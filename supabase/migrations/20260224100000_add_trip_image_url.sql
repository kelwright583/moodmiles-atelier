-- Add image_url to trips for destination hero/card images
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS image_url TEXT;
