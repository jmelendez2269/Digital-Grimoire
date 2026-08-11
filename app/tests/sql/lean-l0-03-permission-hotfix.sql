\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L0_03_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' in ('local', 'staging') as lean_l0_03_target_allowed \gset
\if :lean_l0_03_target_allowed
\else
  \echo 'LEAN_L0_03_GUARD_FAILED: target must be local or staging; production is disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';
set local idle_in_transaction_session_timeout = '120s';
select pg_advisory_xact_lock(hashtext('prismarium-lean-l0-03-acceptance'));

do $lean_l0_03_catalog$
declare
  role_name text;
  table_name text;
  target_function record;
  expected_policy text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach table_name in array array[
      'public.users',
      'public.course_enrollments',
      'public.api_usage',
      'public.search_cache',
      'public.convergence_concepts',
      'public.convergence_relationships',
      'public.convergence_traditions',
      'public.correspondence_entity_types',
      'public.correspondence_relationship_types',
      'public.knowledge_claims',
      'public.knowledge_sources'
    ] loop
      if has_table_privilege(
        role_name,
        table_name,
        'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
      ) then
        raise exception 'LEAN_L0_03_ASSERTION_FAILED: % retains mutation privilege on %',
          role_name,
          table_name;
      end if;
    end loop;
  end loop;

  foreach table_name in array array[
    'convergence_concepts',
    'convergence_relationships',
    'convergence_traditions',
    'correspondence_entity_types',
    'correspondence_relationship_types',
    'knowledge_claims',
    'knowledge_sources'
  ] loop
    if not exists (
      select 1
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and c.relrowsecurity
    ) then
      raise exception 'LEAN_L0_03_ASSERTION_FAILED: RLS is not enabled on %', table_name;
    end if;

    expected_policy := 'Shared reference read: ' || table_name;
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = expected_policy
        and cmd = 'SELECT'
    ) then
      raise exception 'LEAN_L0_03_ASSERTION_FAILED: read policy is missing on %', table_name;
    end if;

    if not has_table_privilege('anon', 'public.' || table_name, 'SELECT')
      or not has_table_privilege('authenticated', 'public.' || table_name, 'SELECT')
    then
      raise exception 'LEAN_L0_03_ASSERTION_FAILED: shared read grant is missing on %', table_name;
    end if;
  end loop;

  for target_function in
    select p.oid, p.proname, p.proconfig
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
    if has_function_privilege('anon', target_function.oid, 'EXECUTE')
      or has_function_privilege('authenticated', target_function.oid, 'EXECUTE')
    then
      raise exception 'LEAN_L0_03_ASSERTION_FAILED: API EXECUTE remains on %',
        target_function.oid::regprocedure;
    end if;

    if not has_function_privilege('service_role', target_function.oid, 'EXECUTE') then
      raise exception 'LEAN_L0_03_ASSERTION_FAILED: service EXECUTE is missing on %',
        target_function.oid::regprocedure;
    end if;

    if not coalesce(
      target_function.proconfig @> array['search_path=pg_catalog, public'],
      false
    ) then
      raise exception 'LEAN_L0_03_ASSERTION_FAILED: fixed search_path is missing on %',
        target_function.oid::regprocedure;
    end if;
  end loop;

  if not has_table_privilege('service_role', 'public.users', 'UPDATE')
    or not has_table_privilege('service_role', 'public.course_enrollments', 'INSERT,UPDATE,DELETE')
    or not has_table_privilege('service_role', 'public.api_usage', 'INSERT')
    or not has_table_privilege('service_role', 'public.search_cache', 'INSERT,UPDATE,DELETE')
  then
    raise exception 'LEAN_L0_03_ASSERTION_FAILED: a required service-role table grant is missing';
  end if;
end;
$lean_l0_03_catalog$;

select
  gen_random_uuid() as run_id,
  gen_random_uuid() as actor_id,
  gen_random_uuid() as course_id,
  gen_random_uuid() as enrollment_id,
  gen_random_uuid() as cache_id,
  gen_random_uuid() as usage_id
\gset

select
  'lean-l0-03-' || replace(:'run_id', '-', '') as marker,
  'lean-l0-03-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email
\gset

select set_config('lean.actor_id', :'actor_id', true);
select set_config('lean.enrollment_id', :'enrollment_id', true);
select set_config('lean.cache_id', :'cache_id', true);
select set_config('lean.usage_id', :'usage_id', true);

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  :'actor_id',
  'authenticated',
  'authenticated',
  :'actor_email',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L0-03 fixture"}'::jsonb,
  now(),
  now()
);

insert into public.courses (id, title, slug, is_published, content, sort_order)
values (
  :'course_id',
  'LEAN L0-03 synthetic course',
  :'marker' || '-course',
  true,
  '{"fixture":true}'::jsonb,
  0
);

-- Trigger-owned profile creation must still work even though the API roles can
-- no longer execute the trigger function directly.
do $lean_l0_03_trigger$
begin
  if not exists (
    select 1
    from public.users
    where id = current_setting('lean.actor_id')::uuid
  ) then
    raise exception 'LEAN_L0_03_ASSERTION_FAILED: auth trigger did not create profile';
  end if;
end;
$lean_l0_03_trigger$;

set local role service_role;

update public.users
set
  role = 'admin',
  tokens_earned = 17,
  subscription_status = 'scholar',
  stripe_customer_id = 'lean-l0-03-service-customer',
  stripe_subscription_id = 'lean-l0-03-service-subscription',
  subscription_start_date = now(),
  subscription_end_date = now() + interval '1 month'
where id = :'actor_id'::uuid;

insert into public.course_enrollments (
  id,
  user_id,
  course_id,
  current_week,
  current_cycle,
  progress
) values (
  :'enrollment_id',
  :'actor_id',
  :'course_id',
  2,
  1,
  '{"service":true}'::jsonb
);

insert into public.search_cache (id, query, results)
values (:'cache_id', :'marker' || '-query', '{"service":true}'::jsonb);

insert into public.api_usage (
  id,
  service,
  endpoint,
  operation,
  units_used,
  unit_type,
  estimated_cost,
  user_id,
  request_metadata,
  success
) values (
  :'usage_id',
  'other',
  'lean-l0-03-fixture',
  'service-authority-smoke',
  1,
  'requests',
  0,
  :'actor_id',
  '{"service":true}'::jsonb,
  true
);

select * from public.get_indexed_text_ids() limit 1;

reset role;

do $lean_l0_03_service$
begin
  if not exists (
    select 1
    from public.users
    where id = current_setting('lean.actor_id')::uuid
      and role = 'admin'
      and tokens_earned = 17
      and subscription_status = 'scholar'
      and stripe_customer_id = 'lean-l0-03-service-customer'
  ) then
    raise exception 'LEAN_L0_03_ASSERTION_FAILED: protected service profile update failed';
  end if;

  if not exists (
    select 1 from public.course_enrollments
    where id = current_setting('lean.enrollment_id')::uuid
  )
    or not exists (
      select 1 from public.search_cache
      where id = current_setting('lean.cache_id')::uuid
    )
    or not exists (
      select 1 from public.api_usage
      where id = current_setting('lean.usage_id')::uuid
    )
  then
    raise exception 'LEAN_L0_03_ASSERTION_FAILED: a service-owned insert failed';
  end if;
end;
$lean_l0_03_service$;

select
  :'prismarium_target' as target,
  11 as protected_tables_checked,
  7 as shared_rls_tables_checked,
  count(*) as protected_definer_functions_checked,
  4 as service_mutation_paths_checked,
  'PASS' as result
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
  ]);

rollback;

select
  (
    (select count(*) from auth.users where id = :'actor_id'::uuid) +
    (select count(*) from public.users where id = :'actor_id'::uuid) +
    (select count(*) from public.courses where id = :'course_id'::uuid) +
    (select count(*) from public.course_enrollments where id = :'enrollment_id'::uuid) +
    (select count(*) from public.search_cache where id = :'cache_id'::uuid) +
    (select count(*) from public.api_usage where id = :'usage_id'::uuid)
  ) as cleanup_residue;
