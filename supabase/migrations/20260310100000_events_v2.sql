-- ============================================================
-- Events V2: Rich event fields, attendees table, flight sharing
-- ============================================================

ALTER TABLE public.trip_events
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS event_time TEXT,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_address TEXT,
  ADD COLUMN IF NOT EXISTS venue_place_id TEXT,
  ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'researching',
  ADD COLUMN IF NOT EXISTS booking_reference TEXT,
  ADD COLUMN IF NOT EXISTS booking_url TEXT,
  ADD COLUMN IF NOT EXISTS cost_per_person NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS share_token TEXT DEFAULT gen_random_uuid()::text;

-- Unique constraint on share_token
DO $$ BEGIN
  ALTER TABLE public.trip_events
    ADD CONSTRAINT trip_events_share_token_unique UNIQUE (share_token);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Check constraint on booking_status
DO $$ BEGIN
  ALTER TABLE public.trip_events
    ADD CONSTRAINT trip_events_booking_status_check
      CHECK (booking_status IS NULL OR booking_status IN ('researching', 'booked', 'confirmed', 'cancelled'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Backfill share_token for rows that missed the default
UPDATE public.trip_events SET share_token = gen_random_uuid()::text WHERE share_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_trip_events_share_token ON public.trip_events(share_token);

-- ── Flights: add is_shared ──────────────────────────────────
ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- EVENT ATTENDEES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.trip_events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'going'
               CHECK (status IN ('going', 'maybe', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user  ON public.event_attendees(user_id);

-- Trip members (owner + accepted collaborators) can manage attendees
CREATE POLICY "Trip members can manage event attendees"
  ON public.event_attendees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_events te
      JOIN public.trips t ON t.id = te.trip_id
      WHERE te.id = event_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.trip_collaborators tc
          WHERE tc.trip_id = t.id AND tc.user_id = auth.uid() AND tc.status = 'accepted'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_events te
      JOIN public.trips t ON t.id = te.trip_id
      WHERE te.id = event_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.trip_collaborators tc
          WHERE tc.trip_id = t.id AND tc.user_id = auth.uid() AND tc.status = 'accepted'
        )
      )
    )
  );
