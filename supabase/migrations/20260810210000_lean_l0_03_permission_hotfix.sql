-- LEAN-L0-03: remove customer authority over server-owned state.
--
-- This is a forward-only repair. The separately reviewed reversal SQL lives at
-- supabase/snippets/lean_l0_03_permission_hotfix_rollback.sql and must never be
-- run as part of the normal migration chain.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l0-03-permission-hotfix'));

-- Customer sessions keep their existing reads, but server-owned rows can no
-- longer be inserted, rewritten, deleted, truncated, referenced, or used to
-- install triggers directly through the API roles.
revoke insert, update, delete, truncate, references, trigger
  on table public.users
  from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.course_enrollments
  from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.api_usage
  from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.search_cache
  from public, anon, authenticated;

drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert their own enrollments" on public.course_enrollments;
drop policy if exists "Users can update their own enrollments" on public.course_enrollments;
drop policy if exists "Users can delete their own enrollments" on public.course_enrollments;
drop policy if exists "Admins can insert api_usage" on public.api_usage;
drop policy if exists "Enable insert for authenticated users" on public.search_cache;

-- These seven shared reference tables were exposed with RLS disabled and full
-- API-role privileges. Preserve shared reads while making every mutation a
-- service/admin path.
revoke insert, update, delete, truncate, references, trigger
  on table
    public.convergence_concepts,
    public.convergence_relationships,
    public.convergence_traditions,
    public.correspondence_entity_types,
    public.correspondence_relationship_types,
    public.knowledge_claims,
    public.knowledge_sources
  from public, anon, authenticated;

alter table public.convergence_concepts enable row level security;
alter table public.convergence_relationships enable row level security;
alter table public.convergence_traditions enable row level security;
alter table public.correspondence_entity_types enable row level security;
alter table public.correspondence_relationship_types enable row level security;
alter table public.knowledge_claims enable row level security;
alter table public.knowledge_sources enable row level security;

drop policy if exists "Shared reference read: convergence_concepts" on public.convergence_concepts;
create policy "Shared reference read: convergence_concepts"
  on public.convergence_concepts for select to anon, authenticated using (true);

drop policy if exists "Shared reference read: convergence_relationships" on public.convergence_relationships;
create policy "Shared reference read: convergence_relationships"
  on public.convergence_relationships for select to anon, authenticated using (true);

drop policy if exists "Shared reference read: convergence_traditions" on public.convergence_traditions;
create policy "Shared reference read: convergence_traditions"
  on public.convergence_traditions for select to anon, authenticated using (true);

drop policy if exists "Shared reference read: correspondence_entity_types" on public.correspondence_entity_types;
create policy "Shared reference read: correspondence_entity_types"
  on public.correspondence_entity_types for select to anon, authenticated using (true);

drop policy if exists "Shared reference read: correspondence_relationship_types" on public.correspondence_relationship_types;
create policy "Shared reference read: correspondence_relationship_types"
  on public.correspondence_relationship_types for select to anon, authenticated using (true);

drop policy if exists "Shared reference read: knowledge_claims" on public.knowledge_claims;
create policy "Shared reference read: knowledge_claims"
  on public.knowledge_claims for select to anon, authenticated using (true);

drop policy if exists "Shared reference read: knowledge_sources" on public.knowledge_sources;
create policy "Shared reference read: knowledge_sources"
  on public.knowledge_sources for select to anon, authenticated using (true);

-- Revoke the seven production functions that were unintentionally callable by
-- customer API roles. Existing auth triggers continue to execute without an
-- API-role EXECUTE grant. Deliberately public/service-only RPCs are untouched.
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
      'revoke all on function %s from public, anon, authenticated',
      function_identity
    );
    execute format(
      'grant execute on function %s to service_role',
      function_identity
    );
    execute format(
      'alter function %s set search_path = pg_catalog, public',
      function_identity
    );
  end loop;
end;
$lean_l0_03$;

comment on table public.users is
  'Customer-readable profiles. Billing, role, credit, entitlement, and identity projection writes are server-owned.';
comment on table public.course_enrollments is
  'Customer-readable enrollment/progress projection. Mutations are server-owned.';
comment on table public.api_usage is
  'Authoritative provider and application usage evidence. Mutations are server-owned.';
comment on table public.search_cache is
  'Shared search cache. Reads remain shared; mutations are server-owned.';

commit;
