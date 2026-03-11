-- Backfill handle_set for profiles that already have a handle
UPDATE public.profiles
SET handle_set = true
WHERE handle IS NOT NULL
  AND trim(handle) <> ''
  AND handle_set = false;
