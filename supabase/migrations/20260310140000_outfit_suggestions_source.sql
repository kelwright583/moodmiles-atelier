-- Add source column to outfit_suggestions (editorial vs shoppable)
ALTER TABLE public.outfit_suggestions
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'editorial';

-- Add enriched_items JSONB for storing enriched product details
ALTER TABLE public.outfit_suggestions
  ADD COLUMN IF NOT EXISTS enriched_items JSONB;
