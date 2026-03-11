-- trip_polls
CREATE TABLE IF NOT EXISTS trip_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE trip_polls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trip_polls' AND policyname = 'Trip members can manage trip_polls'
  ) THEN
    CREATE POLICY "Trip members can manage trip_polls"
      ON trip_polls FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM trips WHERE trips.id = trip_polls.trip_id AND trips.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators
          WHERE trip_collaborators.trip_id = trip_polls.trip_id
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.status = 'accepted'
        )
      );
  END IF;
END $$;

-- poll_options
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES trip_polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'poll_options' AND policyname = 'Trip members can manage poll_options'
  ) THEN
    CREATE POLICY "Trip members can manage poll_options"
      ON poll_options FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM trip_polls
          JOIN trips ON trips.id = trip_polls.trip_id
          WHERE trip_polls.id = poll_options.poll_id
            AND trips.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM trip_polls
          JOIN trip_collaborators ON trip_collaborators.trip_id = trip_polls.trip_id
          WHERE trip_polls.id = poll_options.poll_id
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.status = 'accepted'
        )
      );
  END IF;
END $$;

-- poll_votes
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES trip_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'poll_votes' AND policyname = 'Trip members can manage poll_votes'
  ) THEN
    CREATE POLICY "Trip members can manage poll_votes"
      ON poll_votes FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM trip_polls
          JOIN trips ON trips.id = trip_polls.trip_id
          WHERE trip_polls.id = poll_votes.poll_id
            AND trips.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM trip_polls
          JOIN trip_collaborators ON trip_collaborators.trip_id = trip_polls.trip_id
          WHERE trip_polls.id = poll_votes.poll_id
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.status = 'accepted'
        )
      );
  END IF;
END $$;

-- trip_messages
CREATE TABLE IF NOT EXISTS trip_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  pinned_outfit_id UUID REFERENCES outfit_suggestions(id) ON DELETE SET NULL,
  reactions JSONB NOT NULL DEFAULT '{}',
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trip_messages' AND policyname = 'Trip members can manage trip_messages'
  ) THEN
    CREATE POLICY "Trip members can manage trip_messages"
      ON trip_messages FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM trips WHERE trips.id = trip_messages.trip_id AND trips.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators
          WHERE trip_collaborators.trip_id = trip_messages.trip_id
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.status = 'accepted'
        )
      );
  END IF;
END $$;
