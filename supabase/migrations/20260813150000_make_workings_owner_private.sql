-- The public Working experience now uses an editorial recording rather than
-- member-created records. Keep every working owner-private at the database
-- boundary, including rows that retain a legacy shared_at value.

drop policy if exists "workings: public select shared" on public.workings;
