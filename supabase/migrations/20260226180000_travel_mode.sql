-- Prompt 18: Travel Mode + Today Tab + Flight Alerts
-- Add trip status system and flight tracking columns

-- 1. Trip status (upcoming / active / completed)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming'
  CHECK(status IN ('upcoming','active','completed'));

-- 2. Flight tracking columns on trip_events
ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS gate TEXT;
ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS terminal TEXT;
ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS baggage_claim TEXT;
ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS flight_number TEXT;
ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS flight_status TEXT DEFAULT 'scheduled'
  CHECK(flight_status IN ('scheduled','boarding','departed','en_route','landed','cancelled','delayed'));
ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS flight_status_updated_at TIMESTAMPTZ;

-- 3. Postgres function to auto-update trip statuses based on dates
CREATE OR REPLACE FUNCTION update_trip_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE trips
  SET status = CASE
    WHEN end_date < CURRENT_DATE THEN 'completed'
    WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'
    ELSE 'upcoming'
  END
  WHERE status IS DISTINCT FROM (
    CASE
      WHEN end_date < CURRENT_DATE THEN 'completed'
      WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'
      ELSE 'upcoming'
    END
  );
END;
$$;
