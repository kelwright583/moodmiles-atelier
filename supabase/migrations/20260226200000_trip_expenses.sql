-- Prompt 20: Expenses + Bill Splitter
-- Creates trip_expenses table, RLS policies, and receipts storage bucket

-- ─── trip_expenses table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  paid_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  category      TEXT NOT NULL DEFAULT 'other'
                  CHECK(category IN ('food','transport','accommodation','activity','shopping','other')),
  split_between UUID[] DEFAULT '{}',
  receipt_url   TEXT,
  notes         TEXT,
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;

-- Trip members can view all expenses
CREATE POLICY "Trip members can view expenses"
  ON public.trip_expenses FOR SELECT
  USING (is_trip_member(trip_id));

-- Trip members can add expenses
CREATE POLICY "Trip members can add expenses"
  ON public.trip_expenses FOR INSERT
  WITH CHECK (
    auth.uid() = paid_by
    AND is_trip_member(trip_id)
  );

-- Payer or trip owner can update/delete
CREATE POLICY "Payer or owner can update expenses"
  ON public.trip_expenses FOR UPDATE
  USING (
    auth.uid() = paid_by
    OR EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Payer or owner can delete expenses"
  ON public.trip_expenses FOR DELETE
  USING (
    auth.uid() = paid_by
    OR EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- Index for fast per-trip queries
CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id
  ON public.trip_expenses(trip_id, expense_date DESC);

-- ─── Receipts storage bucket ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif'];

-- Authenticated users can upload receipts
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

-- Authenticated users can read receipts
CREATE POLICY "Authenticated users can read receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts');

-- Uploader can delete own receipt
CREATE POLICY "Uploader can delete own receipt"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts' AND owner = auth.uid());
