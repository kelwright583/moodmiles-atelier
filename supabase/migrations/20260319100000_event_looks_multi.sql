-- Allow multiple looks per user per event (remove one-look-per-user constraint)
ALTER TABLE event_looks DROP CONSTRAINT IF EXISTS event_looks_event_id_user_id_key;
