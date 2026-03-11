-- Group style coordination: trip themes, event looks, pinned_by on board items

-- 1. Add trip_theme to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_theme TEXT;

-- 2. Add theme_colors to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS theme_colors TEXT[] DEFAULT '{}';

-- 3. Add pinned_by to board_items
ALTER TABLE board_items ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Create event_looks table
CREATE TABLE IF NOT EXISTS event_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES trip_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  outfit_suggestion_id UUID REFERENCES outfit_suggestions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- 5. Enable RLS on event_looks
ALTER TABLE event_looks ENABLE ROW LEVEL SECURITY;

-- 6. Policy: trip members (host OR accepted collaborators) can manage event looks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'event_looks'
      AND policyname = 'Trip members can manage event looks'
  ) THEN
    CREATE POLICY "Trip members can manage event looks"
      ON event_looks
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM trips t
          WHERE t.id = event_looks.trip_id
            AND t.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators tc
          WHERE tc.trip_id = event_looks.trip_id
            AND tc.user_id = auth.uid()
            AND tc.status = 'accepted'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trips t
          WHERE t.id = event_looks.trip_id
            AND t.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators tc
          WHERE tc.trip_id = event_looks.trip_id
            AND tc.user_id = auth.uid()
            AND tc.status = 'accepted'
        )
      );
  END IF;
END $$;
