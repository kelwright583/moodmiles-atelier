CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id     UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
    'invite_received', 'collaborator_joined', 'event_added',
    'poll_created', 'poll_voted', 'new_message', 'outfit_pinned',
    'rsvp_received', 'track_added'
  )),
  title       TEXT NOT NULL,
  body        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  action_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role inserts (edge functions) — handled by service role key bypassing RLS
-- No INSERT policy needed for anon/authenticated; service role bypasses RLS

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
