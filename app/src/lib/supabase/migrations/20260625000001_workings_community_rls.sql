-- Phase 6: The Working — community sharing
-- Adds a public select policy so shared workings (shared_at IS NOT NULL)
-- are readable by anyone, including unauthenticated visitors.
-- The share/unshare action is still owner-gated via the existing update policy.

create policy "workings: public select shared"
  on public.workings for select
  using (shared_at is not null);
