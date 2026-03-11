-- Allow authenticated users to insert notifications for other users
-- (non-sensitive data; frontend notifies trip members after their own actions)
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
