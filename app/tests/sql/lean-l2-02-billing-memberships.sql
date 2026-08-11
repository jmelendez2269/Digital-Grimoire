\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L2_02_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l2_02_target_allowed \gset
\if :lean_l2_02_target_allowed
\else
  \echo 'LEAN_L2_02_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select
  gen_random_uuid() as actor_id,
  gen_random_uuid() as other_id
\gset

select set_config('lean.l2_02.actor_id', :'actor_id', true);

select
  'lean-l2-02-a-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email,
  'lean-l2-02-b-' || replace(:'run_id', '-', '') || '@example.invalid' as other_email
\gset

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L2-02 fixture A"}'::jsonb, now(), now()
),
(
  :'other_id', 'authenticated', 'authenticated', :'other_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L2-02 fixture B"}'::jsonb, now(), now()
);

create or replace function pg_temp.lean_l2_02_expect_error(
  p_sql text,
  p_marker text
)
returns void
language plpgsql
as $expect_error$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_marker in sqlerrm) > 0 then
      return;
    end if;
    raise;
  end;

  raise exception 'LEAN_L2_02_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $lean_l2_02_catalog$
declare
  role_name text;
begin
  if not exists (
    select 1
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'billing_memberships'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'LEAN_L2_02_ASSERTION_FAILED: billing_memberships RLS is not forced';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'billing_memberships'
  ) then
    raise exception 'LEAN_L2_02_ASSERTION_FAILED: customer RLS policy unexpectedly exists';
  end if;

  foreach role_name in array array['anon', 'authenticated'] loop
    if has_table_privilege(
      role_name,
      'public.billing_memberships',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    ) then
      raise exception 'LEAN_L2_02_ASSERTION_FAILED: % retains billing membership authority',
        role_name;
    end if;
  end loop;

  if not has_table_privilege(
    'service_role',
    'public.billing_memberships',
    'SELECT,INSERT,UPDATE,DELETE'
  ) then
    raise exception 'LEAN_L2_02_ASSERTION_FAILED: service role projection authority is incomplete';
  end if;
end;
$lean_l2_02_catalog$;

set local role authenticated;
select pg_temp.lean_l2_02_expect_error(
  'select * from public.billing_memberships',
  'permission denied'
);
select pg_temp.lean_l2_02_expect_error(
  format(
    'insert into public.billing_memberships (user_id) values (%L::uuid)',
    :'actor_id'
  ),
  'permission denied'
);
reset role;

set local role service_role;
insert into public.billing_memberships (
  user_id,
  plan_code,
  stripe_status,
  pricing_cohort,
  offer_code,
  billing_interval,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  access_until
) values (
  :'actor_id',
  'student',
  'active',
  'founding',
  'student_founding_monthly',
  'month',
  'cus_leanL202actor',
  'sub_leanL202actor',
  now(),
  now() + interval '1 month',
  now() + interval '1 month'
);
reset role;

select pg_temp.lean_l2_02_expect_error(
  format(
    'insert into public.billing_memberships (user_id, plan_code) values (%L::uuid, %L)',
    :'other_id', 'premium'
  ),
  'billing_memberships_plan_code_check'
);
select pg_temp.lean_l2_02_expect_error(
  format(
    'insert into public.billing_memberships (user_id, stripe_status) values (%L::uuid, %L)',
    :'other_id', 'mystery'
  ),
  'billing_memberships_stripe_status_check'
);
select pg_temp.lean_l2_02_expect_error(
  format(
    'insert into public.billing_memberships (user_id, plan_code, offer_code) values (%L::uuid, %L, %L)',
    :'other_id', 'student', 'scholar_monthly'
  ),
  'billing_memberships_offer_plan_check'
);
select pg_temp.lean_l2_02_expect_error(
  format(
    'insert into public.billing_memberships (user_id, plan_code, stripe_status, pricing_cohort) values (%L::uuid, %L, %L, %L)',
    :'other_id', 'student', 'active', 'founding'
  ),
  'billing_memberships_active_access_check'
);
select pg_temp.lean_l2_02_expect_error(
  format(
    'insert into public.billing_memberships (user_id, stripe_customer_id) values (%L::uuid, %L)',
    :'other_id', 'cus_leanL202actor'
  ),
  'billing_memberships_stripe_customer_uidx'
);

do $lean_l2_02_service_state$
begin
  if not exists (
    select 1
    from public.billing_memberships
    where user_id = current_setting('lean.l2_02.actor_id')::uuid
      and plan_code = 'student'
      and stripe_status = 'active'
      and pricing_cohort = 'founding'
      and billing_hold = false
  ) then
    raise exception 'LEAN_L2_02_ASSERTION_FAILED: service projection write was not retained';
  end if;
end;
$lean_l2_02_service_state$;

select
  :'prismarium_target' as target,
  1 as schema_contract,
  1 as customer_read_denied,
  1 as customer_write_denied,
  1 as service_write_allowed,
  1 as unknown_plan_denied,
  1 as unknown_status_denied,
  1 as mismatched_offer_denied,
  1 as missing_access_window_denied,
  1 as stripe_identity_unique,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id in (:'actor_id'::uuid, :'other_id'::uuid)) +
  (select count(*) from public.billing_memberships where user_id in (:'actor_id'::uuid, :'other_id'::uuid))
) as cleanup_residue;

\echo 'LEAN_L2_02_LOCAL_RESULT: PASS'
