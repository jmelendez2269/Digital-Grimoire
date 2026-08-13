-- Emergency reversal for 20260810210000_lean_l0_03_permission_hotfix.sql.
-- This deliberately restores the known-insecure pre-L0-03 authority model.
-- Prefer a forward repair. Production use requires a separately approved,
-- exact rollback decision and both psql variables shown below.

\set ON_ERROR_STOP on

\if :{?prismarium_target}
\else
  \echo 'LEAN_L0_03_ROLLBACK_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

\if :{?prismarium_confirm_rollback}
\else
  \echo 'LEAN_L0_03_ROLLBACK_GUARD_FAILED: prismarium_confirm_rollback is required'
  \quit 2
\endif

select
  :'prismarium_target' in ('local', 'staging', 'production')
  and :'prismarium_confirm_rollback' = 'REVERSE-LEAN-L0-03'
  as lean_l0_03_rollback_allowed
\gset

\if :lean_l0_03_rollback_allowed
\else
  \echo 'LEAN_L0_03_ROLLBACK_GUARD_FAILED: exact rollback confirmation is required'
  \quit 2
\endif

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
select pg_advisory_xact_lock(hashtext('prismarium-lean-l0-03-permission-hotfix'));

drop policy if exists "Shared reference read: convergence_concepts" on public.convergence_concepts;
drop policy if exists "Shared reference read: convergence_relationships" on public.convergence_relationships;
drop policy if exists "Shared reference read: convergence_traditions" on public.convergence_traditions;
drop policy if exists "Shared reference read: correspondence_entity_types" on public.correspondence_entity_types;
drop policy if exists "Shared reference read: correspondence_relationship_types" on public.correspondence_relationship_types;
drop policy if exists "Shared reference read: knowledge_claims" on public.knowledge_claims;
drop policy if exists "Shared reference read: knowledge_sources" on public.knowledge_sources;

alter table public.convergence_concepts disable row level security;
alter table public.convergence_relationships disable row level security;
alter table public.convergence_traditions disable row level security;
alter table public.correspondence_entity_types disable row level security;
alter table public.correspondence_relationship_types disable row level security;
alter table public.knowledge_claims disable row level security;
alter table public.knowledge_sources disable row level security;

grant insert, update, delete, truncate, references, trigger
  on table
    public.users,
    public.course_enrollments,
    public.api_usage,
    public.convergence_concepts,
    public.convergence_relationships,
    public.convergence_traditions,
    public.correspondence_entity_types,
    public.correspondence_relationship_types,
    public.knowledge_claims,
    public.knowledge_sources
  to anon, authenticated;
grant insert, update, delete, truncate, references, trigger
  on table public.search_cache
  to authenticated;

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);
create policy "Users can insert their own enrollments"
  on public.course_enrollments for insert with check (auth.uid() = user_id);
create policy "Users can update their own enrollments"
  on public.course_enrollments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own enrollments"
  on public.course_enrollments for delete using (auth.uid() = user_id);
create policy "Admins can insert api_usage"
  on public.api_usage for insert with check (true);
create policy "Enable insert for authenticated users"
  on public.search_cache for insert to authenticated with check (true);

do $lean_l0_03$
declare
  target_function record;
  function_identity text;
begin
  for target_function in
    select p.oid, p.proname
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname = any (array[
        'get_affiliate_source_stats',
        'get_indexed_text_ids',
        'get_library_indexing_summary',
        'get_text_chunk_counts',
        'get_top_affiliate_items',
        'handle_new_user',
        'handle_user_update'
      ])
  loop
    function_identity := format(
      '%I.%I(%s)',
      'public',
      target_function.proname,
      pg_get_function_identity_arguments(target_function.oid)
    );

    execute format(
      'grant execute on function %s to public, anon, authenticated',
      function_identity
    );
    execute format('alter function %s reset search_path', function_identity);
  end loop;
end;
$lean_l0_03$;

commit;
