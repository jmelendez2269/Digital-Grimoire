-- Restrict symbolism graph writes: only admins (authenticated) or service role may insert.
-- SELECT policies unchanged. UPDATE/DELETE already required admin via users.role.

begin;

drop policy if exists "Authenticated users can create correspondences"
  on public.correspondences;

drop policy if exists "Authenticated users can create correspondence relationships"
  on public.correspondence_relationships;

create policy "Admins can insert correspondences"
  on public.correspondences
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

create policy "Admins can insert correspondence relationships"
  on public.correspondence_relationships
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

commit;
