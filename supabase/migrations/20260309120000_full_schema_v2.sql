-- ============================================================
-- MoodMiles Schema v2 — Collaboration, Commerce, Intelligence
-- Migration: 20260309120000
-- ============================================================

-- ============================================================
-- HELPER: check if a user has access to a trip (owner OR collaborator)
-- Used in RLS policies for all collaboration tables
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_trip_member(_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trips WHERE id = _trip_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_collaborators
    WHERE trip_id = _trip_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
END;
$$;

-- ============================================================
-- 1. TRIP_COLLABORATORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trip_collaborators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  invited_email TEXT,
  role          TEXT NOT NULL DEFAULT 'collaborator'
                  CHECK (role IN ('host', 'collaborator', 'viewer')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token  TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Trip owner can manage all collaborators on their trips
CREATE POLICY "Owner can manage collaborators"
  ON public.trip_collaborators FOR ALL
  USING (is_trip_owner(trip_id))
  WITH CHECK (is_trip_owner(trip_id));

-- Invited users can view and update their own invite
CREATE POLICY "Invitee can view own invite"
  ON public.trip_collaborators FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Invitee can accept or decline invite"
  ON public.trip_collaborators FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_trip_collaborators_trip ON public.trip_collaborators(trip_id);
CREATE INDEX idx_trip_collaborators_user ON public.trip_collaborators(user_id);
CREATE INDEX idx_trip_collaborators_token ON public.trip_collaborators(invite_token);

-- ============================================================
-- 2. TRIP_EVENTS — extend existing table with new columns
-- ============================================================
ALTER TABLE public.trip_events
  ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name              TEXT,
  ADD COLUMN IF NOT EXISTS event_time        TIME,
  ADD COLUMN IF NOT EXISTS venue_name        TEXT,
  ADD COLUMN IF NOT EXISTS venue_address     TEXT,
  ADD COLUMN IF NOT EXISTS venue_place_id    TEXT,
  ADD COLUMN IF NOT EXISTS venue_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS category          TEXT
                              CHECK (category IN (
                                'dinner','lunch','beach','club','excursion',
                                'gallery','party','flight','transfer','activity','other'
                              )),
  ADD COLUMN IF NOT EXISTS booking_status    TEXT DEFAULT 'researching'
                              CHECK (booking_status IN (
                                'researching','booked','confirmed','cancelled'
                              )),
  ADD COLUMN IF NOT EXISTS booking_reference TEXT,
  ADD COLUMN IF NOT EXISTS booking_url       TEXT,
  ADD COLUMN IF NOT EXISTS dress_code        TEXT,
  ADD COLUMN IF NOT EXISTS cost_per_person   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_shared         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token       TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Backfill name from event_name for existing rows
UPDATE public.trip_events SET name = event_name WHERE name IS NULL AND event_name IS NOT NULL;

-- Allow collaborators to read events on shared trips
DROP POLICY IF EXISTS "Users can view own trip events" ON public.trip_events;
CREATE POLICY "Members can view trip events"
  ON public.trip_events FOR SELECT
  USING (is_trip_member(trip_id));

DROP POLICY IF EXISTS "Users can create trip events" ON public.trip_events;
CREATE POLICY "Members can create trip events"
  ON public.trip_events FOR INSERT
  WITH CHECK (is_trip_member(trip_id));

DROP POLICY IF EXISTS "Users can update own trip events" ON public.trip_events;
CREATE POLICY "Members can update trip events"
  ON public.trip_events FOR UPDATE
  USING (is_trip_member(trip_id));

DROP POLICY IF EXISTS "Users can delete own trip events" ON public.trip_events;
CREATE POLICY "Owner can delete trip events"
  ON public.trip_events FOR DELETE
  USING (is_trip_owner(trip_id));

-- Allow public access to individually shared events via share_token (no RLS bypass needed — handled in app)
CREATE INDEX IF NOT EXISTS idx_trip_events_share_token ON public.trip_events(share_token);

-- ============================================================
-- 3. EVENT_ATTENDEES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.trip_events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  rsvp       TEXT NOT NULL DEFAULT 'going'
               CHECK (rsvp IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view attendees"
  ON public.event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_events te
      WHERE te.id = event_id AND is_trip_member(te.trip_id)
    )
  );

CREATE POLICY "Users can manage own RSVP"
  ON public.event_attendees FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_event_attendees_event ON public.event_attendees(event_id);

-- ============================================================
-- 4. TRIP_POLLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trip_polls (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question   TEXT NOT NULL,
  options    JSONB NOT NULL DEFAULT '[]',
  closes_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view polls"
  ON public.trip_polls FOR SELECT
  USING (is_trip_member(trip_id));

CREATE POLICY "Members can create polls"
  ON public.trip_polls FOR INSERT
  WITH CHECK (is_trip_member(trip_id));

CREATE POLICY "Creator can update polls"
  ON public.trip_polls FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Owner can delete polls"
  ON public.trip_polls FOR DELETE
  USING (is_trip_owner(trip_id));

CREATE INDEX idx_trip_polls_trip ON public.trip_polls(trip_id);

-- ============================================================
-- 5. POLL_VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id   UUID NOT NULL REFERENCES public.trip_polls(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view votes"
  ON public.poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_polls tp
      WHERE tp.id = poll_id AND is_trip_member(tp.trip_id)
    )
  );

CREATE POLICY "Members can cast votes"
  ON public.poll_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trip_polls tp
      WHERE tp.id = poll_id AND is_trip_member(tp.trip_id)
    )
  );

CREATE POLICY "Users can change own vote"
  ON public.poll_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);

-- ============================================================
-- 6. TRIP_MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trip_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content           TEXT,
  image_url         TEXT,
  pinned_outfit_id  UUID REFERENCES public.outfit_suggestions(id) ON DELETE SET NULL,
  reactions         JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages"
  ON public.trip_messages FOR SELECT
  USING (is_trip_member(trip_id));

CREATE POLICY "Members can send messages"
  ON public.trip_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_trip_member(trip_id));

CREATE POLICY "Users can edit own messages"
  ON public.trip_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON public.trip_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_trip_messages_trip ON public.trip_messages(trip_id, created_at);

-- ============================================================
-- 7. TRIP_PLAYLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trip_playlist (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               UUID NOT NULL UNIQUE REFERENCES public.trips(id) ON DELETE CASCADE,
  spotify_playlist_id   TEXT,
  spotify_playlist_url  TEXT,
  apple_playlist_id     TEXT,
  playlist_name         TEXT,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_playlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view playlist"
  ON public.trip_playlist FOR SELECT
  USING (is_trip_member(trip_id));

CREATE POLICY "Members can create playlist"
  ON public.trip_playlist FOR INSERT
  WITH CHECK (is_trip_member(trip_id));

CREATE POLICY "Creator can update playlist"
  ON public.trip_playlist FOR UPDATE
  USING (auth.uid() = created_by OR is_trip_owner(trip_id));

CREATE POLICY "Owner can delete playlist"
  ON public.trip_playlist FOR DELETE
  USING (is_trip_owner(trip_id));

-- ============================================================
-- 8. TRIP_FLIGHTS (new shared flight table, separate from existing `flights`)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trip_flights (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flight_number       TEXT,
  airline             TEXT,
  departure_airport   TEXT,
  arrival_airport     TEXT,
  departure_datetime  TIMESTAMPTZ,
  arrival_datetime    TIMESTAMPTZ,
  booking_reference   TEXT,
  booking_url         TEXT,
  is_shared           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_flights ENABLE ROW LEVEL SECURITY;

-- Owner/adder can manage their own flight record
CREATE POLICY "Users can manage own trip flights"
  ON public.trip_flights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trip members can see shared flights
CREATE POLICY "Members can view shared flights"
  ON public.trip_flights FOR SELECT
  USING (is_shared = true AND is_trip_member(trip_id));

CREATE INDEX idx_trip_flights_trip ON public.trip_flights(trip_id);

-- ============================================================
-- 9. AFFILIATE_PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.affiliate_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL
                    CHECK (source IN (
                      'farfetch','net-a-porter','asos','renttherunway',
                      'byrotation','vestiaire'
                    )),
  product_id      TEXT NOT NULL,
  title           TEXT NOT NULL,
  brand           TEXT,
  price           NUMERIC(10,2),
  currency        TEXT DEFAULT 'USD',
  image_url       TEXT,
  product_url     TEXT,
  affiliate_url   TEXT,
  category        TEXT,
  color           TEXT,
  tags            JSONB DEFAULT '[]',
  in_stock        BOOLEAN DEFAULT true,
  is_rental       BOOLEAN NOT NULL DEFAULT false,
  is_resale       BOOLEAN NOT NULL DEFAULT false,
  last_synced     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, product_id)
);

ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

-- Products are readable by all authenticated users
CREATE POLICY "Authenticated users can view affiliate products"
  ON public.affiliate_products FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can insert/update (synced by edge functions)
CREATE INDEX idx_affiliate_products_source ON public.affiliate_products(source);
CREATE INDEX idx_affiliate_products_category ON public.affiliate_products(category);

-- ============================================================
-- 10. OUTFIT_PRODUCTS (junction: outfit ↔ affiliate product)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outfit_products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_suggestion_id  UUID NOT NULL REFERENCES public.outfit_suggestions(id) ON DELETE CASCADE,
  affiliate_product_id  UUID NOT NULL REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  position              INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (outfit_suggestion_id, affiliate_product_id)
);

ALTER TABLE public.outfit_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outfit products for own trips"
  ON public.outfit_products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.outfit_suggestions os
      WHERE os.id = outfit_suggestion_id AND is_trip_owner(os.trip_id)
    )
  );

CREATE POLICY "Service role can manage outfit products"
  ON public.outfit_products FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_outfit_products_outfit ON public.outfit_products(outfit_suggestion_id);

-- ============================================================
-- 11. AFFILIATE_CLICKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  outfit_suggestion_id  UUID REFERENCES public.outfit_suggestions(id) ON DELETE SET NULL,
  affiliate_product_id  UUID REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  trip_id               UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  clicked_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log own clicks"
  ON public.affiliate_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_affiliate_clicks_user ON public.affiliate_clicks(user_id, clicked_at);
CREATE INDEX idx_affiliate_clicks_product ON public.affiliate_clicks(affiliate_product_id);

-- ============================================================
-- 12. DESTINATION_BRIEFINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.destination_briefings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination             TEXT NOT NULL,
  country                 TEXT,
  continent               TEXT,
  -- Health
  health_malaria          TEXT,
  health_water            TEXT,
  health_vaccinations     TEXT,
  health_uv               TEXT,
  health_altitude         TEXT,
  -- Entry requirements
  entry_visa              TEXT,
  entry_passport          TEXT,
  entry_customs           TEXT,
  -- Legal
  legal_drugs             TEXT,
  legal_photography       TEXT,
  legal_lgbt              TEXT,
  legal_dresscode_law     TEXT,
  -- Money
  money_cash_culture      TEXT,
  money_tipping           TEXT,
  money_atm_safety        TEXT,
  -- Connectivity
  connectivity_sim        TEXT,
  connectivity_vpn        TEXT,
  -- Safety
  safety_areas_avoid      TEXT,
  safety_scams            TEXT,
  safety_emergency_numbers TEXT,
  -- Culture
  cultural_calendar       TEXT,
  cultural_greetings      TEXT,
  cultural_bargaining     TEXT,
  cultural_taboos         TEXT,
  -- Climate
  climate_notes           TEXT,
  briefing_updated_at     TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (destination, country)
);

ALTER TABLE public.destination_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read briefings"
  ON public.destination_briefings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_destination_briefings_dest ON public.destination_briefings(destination, country);

-- ============================================================
-- 13. DRESS_CODE_ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dress_code_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  event_id              UUID REFERENCES public.trip_events(id) ON DELETE CASCADE,
  outfit_suggestion_id  UUID REFERENCES public.outfit_suggestions(id) ON DELETE SET NULL,
  alert_message         TEXT NOT NULL,
  severity              TEXT NOT NULL DEFAULT 'info'
                          CHECK (severity IN ('info', 'warning', 'critical')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dress_code_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dress code alerts"
  ON public.dress_code_alerts FOR SELECT
  USING (is_trip_owner(trip_id));

CREATE POLICY "Service role can manage dress code alerts"
  ON public.dress_code_alerts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_dress_code_alerts_trip ON public.dress_code_alerts(trip_id);

-- ============================================================
-- 14. USER_FREE_TRIPS — free tier usage counter
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_free_trips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_trips_used  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_free_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own free trip usage"
  ON public.user_free_trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own free trip usage"
  ON public.user_free_trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own free trip usage"
  ON public.user_free_trips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can also upsert (edge functions track usage server-side)
CREATE POLICY "Service role can manage free trip usage"
  ON public.user_free_trips FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- HELPER: is_trip_collaborator — explicit alias requested
-- Identical semantics to is_trip_member; both are available
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_trip_collaborator(_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trips WHERE id = _trip_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_collaborators
    WHERE trip_id = _trip_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
END;
$$;

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- Add trip_theme to trips
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS trip_theme TEXT;

-- Add outfit_event_id to outfit_suggestions (links an outfit to a specific trip event)
ALTER TABLE public.outfit_suggestions
  ADD COLUMN IF NOT EXISTS outfit_event_id UUID REFERENCES public.trip_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_outfit_suggestions_event ON public.outfit_suggestions(outfit_event_id);
