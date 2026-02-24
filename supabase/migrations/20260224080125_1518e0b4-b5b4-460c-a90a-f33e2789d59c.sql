
-- Storage bucket for AI-generated outfit images
INSERT INTO storage.buckets (id, name, public) VALUES ('outfit-images', 'outfit-images', true);

-- Public read access
CREATE POLICY "Outfit images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'outfit-images');

-- Service role can insert (edge function uses service role)
CREATE POLICY "Service role can upload outfit images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'outfit-images');

CREATE POLICY "Service role can delete outfit images"
ON storage.objects FOR DELETE
USING (bucket_id = 'outfit-images');

-- Add image_url column to outfit_suggestions
ALTER TABLE public.outfit_suggestions ADD COLUMN image_url TEXT;
