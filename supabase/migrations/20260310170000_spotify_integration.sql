-- spotify_connections: one row per user
CREATE TABLE IF NOT EXISTS public.spotify_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID UNIQUE NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  access_token          TEXT NOT NULL,
  refresh_token         TEXT NOT NULL,
  expires_at            TIMESTAMPTZ NOT NULL,
  spotify_user_id       TEXT NOT NULL,
  spotify_display_name  TEXT,
  spotify_avatar_url    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own spotify connection"
  ON public.spotify_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- trip_playlist: one playlist per trip
CREATE TABLE IF NOT EXISTS public.trip_playlists (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  spotify_playlist_id   TEXT NOT NULL,
  spotify_playlist_url  TEXT NOT NULL,
  embed_url             TEXT NOT NULL,
  playlist_name         TEXT NOT NULL,
  created_by            UUID REFERENCES public.profiles(user_id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trip members can view playlists"
  ON public.trip_playlists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.trip_collaborators
      WHERE trip_id = trip_playlists.trip_id AND user_id = auth.uid() AND status = 'accepted'
    )
  );
CREATE POLICY "Trip members can create playlists"
  ON public.trip_playlists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.trip_collaborators
      WHERE trip_id = trip_playlists.trip_id AND user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE INDEX IF NOT EXISTS idx_trip_playlists_trip ON public.trip_playlists(trip_id);
CREATE INDEX IF NOT EXISTS idx_spotify_connections_user ON public.spotify_connections(user_id);
