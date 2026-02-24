
-- Add origin fields to trips table
ALTER TABLE public.trips ADD COLUMN origin_city text;
ALTER TABLE public.trips ADD COLUMN origin_country text;
