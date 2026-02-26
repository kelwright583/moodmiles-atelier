-- Add marketplace columns to outfit_suggestions for Serper Google Shopping results
ALTER TABLE public.outfit_suggestions
  ADD COLUMN IF NOT EXISTS price TEXT,
  ADD COLUMN IF NOT EXISTS store TEXT,
  ADD COLUMN IF NOT EXISTS product_url TEXT;

-- Add price_from to activity_suggestions for Viator real prices
ALTER TABLE public.activity_suggestions
  ADD COLUMN IF NOT EXISTS price_from TEXT;
