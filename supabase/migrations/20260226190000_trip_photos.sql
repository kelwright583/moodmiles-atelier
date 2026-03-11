-- Prompt 19: Shared Photo Album
-- Creates trip_photos table, RLS policies, and storage bucket setup

-- ─── trip_photos table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption      TEXT,
  width        INTEGER,
  height       INTEGER,
  taken_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_photos ENABLE ROW LEVEL SECURITY;

-- Trip members can view all photos for trips they belong to
CREATE POLICY "Trip members can view photos"
  ON public.trip_photos FOR SELECT
  USING (is_trip_member(trip_id));

-- Trip members can upload photos
CREATE POLICY "Trip members can upload photos"
  ON public.trip_photos FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND is_trip_member(trip_id)
  );

-- Uploader can delete their own photos; trip owner can delete any
CREATE POLICY "Uploader or owner can delete photos"
  ON public.trip_photos FOR DELETE
  USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = trip_id AND user_id = auth.uid()
    )
  );

-- Index for fast per-trip photo queries
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id
  ON public.trip_photos(trip_id, created_at DESC);

-- ─── Storage bucket (trip-photos) ────────────────────────────────────────────
-- Create the bucket via SQL — note: bucket creation is idempotent
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-photos',
  'trip-photos',
  true,
  20971520,  -- 20 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif'];

-- Storage RLS: authenticated users can upload to trip-photos
CREATE POLICY "Authenticated users can upload trip photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'trip-photos');

-- Storage RLS: public can read trip photos (bucket is public)
CREATE POLICY "Public can read trip photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'trip-photos');

-- Storage RLS: uploader can delete their own photo
CREATE POLICY "Uploader can delete own trip photo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'trip-photos'
    AND owner = auth.uid()
  );
