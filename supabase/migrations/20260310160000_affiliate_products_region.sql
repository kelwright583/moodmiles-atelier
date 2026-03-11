-- Fix affiliate_products for sync function compatibility + geo-aware region support

-- Allow title to be empty (sync function uses 'name' field, not 'title')
ALTER TABLE public.affiliate_products ALTER COLUMN title SET DEFAULT '';

-- Add name column (used by sync-affiliate-products and get-shoppable-outfits)
ALTER TABLE public.affiliate_products
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Add metadata JSONB (rental prices, condition, original price, etc.)
ALTER TABLE public.affiliate_products
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add region for geo-aware retailer filtering
-- Values: 'za', 'uk', 'us', 'ae', 'au', 'global'
ALTER TABLE public.affiliate_products
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'global';

-- Remove overly strict source CHECK constraint (new retailers added)
ALTER TABLE public.affiliate_products
  DROP CONSTRAINT IF EXISTS affiliate_products_source_check;

-- Index for fast region filtering
CREATE INDEX IF NOT EXISTS idx_affiliate_products_region
  ON public.affiliate_products(region);
