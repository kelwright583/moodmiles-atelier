-- Create chat-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload chat images'
  ) THEN
    CREATE POLICY "Users can upload chat images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'chat-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can view chat images'
  ) THEN
    CREATE POLICY "Anyone can view chat images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'chat-images');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete own chat images'
  ) THEN
    CREATE POLICY "Users can delete own chat images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'chat-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
