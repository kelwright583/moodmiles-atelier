-- Add booking and promotion fields to activity_suggestions for future monetization
ALTER TABLE public.activity_suggestions
  ADD COLUMN IF NOT EXISTS booking_url text,
  ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_by text;
