\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L2_04_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l2_04_target_allowed \gset
\if :lean_l2_04_target_allowed
\else
  \echo 'LEAN_L2_04_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select gen_random_uuid() as actor_id, gen_random_uuid() as request_id,
  gen_random_uuid() as second_request_id \gset
select
  'lean-l2-04-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email,
  repeat('a', 64) as fingerprint,
  repeat('b', 64) as other_fingerprint
\gset

select set_config('lean.l2_04.actor_id', :'actor_id', true);
select set_config('lean.l2_04.request_id', :'request_id', true);
select set_config('lean.l2_04.fingerprint', :'fingerprint', true);

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L2-04 fixture"}'::jsonb, now(), now()
);

create or replace function pg_temp.lean_l2_04_expect_error(
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
    if position(p_marker in sqlerrm) > 0 then return; end if;
    raise;
  end;
  raise exception 'LEAN_L2_04_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $lean_l2_04_catalog$
declare role_name text;
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'billing_checkout_requests'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'LEAN_L2_04_ASSERTION_FAILED: checkout ledger RLS is not forced';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'billing_checkout_requests'
  ) then
    raise exception 'LEAN_L2_04_ASSERTION_FAILED: customer policy unexpectedly exists';
  end if;
  foreach role_name in array array['anon', 'authenticated'] loop
    if has_table_privilege(
      role_name,
      'public.billing_checkout_requests',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    ) then
      raise exception 'LEAN_L2_04_ASSERTION_FAILED: % retains ledger authority', role_name;
    end if;
  end loop;
  if not has_table_privilege(
    'service_role',
    'public.billing_checkout_requests',
    'SELECT,INSERT,UPDATE,DELETE'
  ) then
    raise exception 'LEAN_L2_04_ASSERTION_FAILED: service ledger authority incomplete';
  end if;
end;
$lean_l2_04_catalog$;

set local role authenticated;
select pg_temp.lean_l2_04_expect_error(
  'select * from public.billing_checkout_requests',
  'permission denied'
);
select pg_temp.lean_l2_04_expect_error(
  format(
    'insert into public.billing_checkout_requests (user_id, request_id, offer_code, request_fingerprint) values (%L::uuid, %L::uuid, %L, %L)',
    :'actor_id', :'request_id', 'student_founding_monthly', :'fingerprint'
  ),
  'permission denied'
);
reset role;

set local role service_role;
insert into public.billing_checkout_requests (
  user_id, request_id, offer_code, request_fingerprint
) values (
  :'actor_id', :'request_id', 'student_founding_monthly', :'fingerprint'
);
reset role;

select pg_temp.lean_l2_04_expect_error(
  format(
    'insert into public.billing_checkout_requests (user_id, request_id, offer_code, request_fingerprint) values (%L::uuid, %L::uuid, %L, %L)',
    :'actor_id', :'request_id', 'scholar_monthly', :'other_fingerprint'
  ),
  'billing_checkout_requests_pkey'
);
select pg_temp.lean_l2_04_expect_error(
  format(
    'insert into public.billing_checkout_requests (user_id, request_id, offer_code, request_fingerprint) values (%L::uuid, %L::uuid, %L, %L)',
    :'actor_id', :'second_request_id', 'student_founding_monthly', 'not-a-fingerprint'
  ),
  'billing_checkout_requests_request_fingerprint_check'
);
select pg_temp.lean_l2_04_expect_error(
  format(
    'update public.billing_checkout_requests set state = %L where user_id = %L::uuid and request_id = %L::uuid',
    'session_created', :'actor_id', :'request_id'
  ),
  'billing_checkout_requests_completion_check'
);

set local role service_role;
update public.billing_checkout_requests
set state = 'session_created',
    stripe_checkout_session_id = 'cs_test_leanL204single',
    checkout_url = 'https://checkout.stripe.com/c/pay/cs_test_leanL204single',
    updated_at = now()
where user_id = :'actor_id'::uuid and request_id = :'request_id'::uuid;
reset role;

select pg_temp.lean_l2_04_expect_error(
  format(
    'insert into public.billing_checkout_requests (user_id, request_id, offer_code, request_fingerprint, state, stripe_checkout_session_id, checkout_url) values (%L::uuid, %L::uuid, %L, %L, %L, %L, %L)',
    :'actor_id', :'second_request_id', 'student_founding_monthly', :'other_fingerprint',
    'session_created', 'cs_test_leanL204single',
    'https://checkout.stripe.com/c/pay/cs_test_leanL204single'
  ),
  'billing_checkout_requests_session_uidx'
);

do $lean_l2_04_state$
begin
  if not exists (
    select 1 from public.billing_checkout_requests
    where user_id = current_setting('lean.l2_04.actor_id')::uuid
      and request_id = current_setting('lean.l2_04.request_id')::uuid
      and state = 'session_created'
      and request_fingerprint = current_setting('lean.l2_04.fingerprint')
  ) then
    raise exception 'LEAN_L2_04_ASSERTION_FAILED: exact completed replay was not retained';
  end if;
  if exists (
    select 1 from public.billing_memberships
    where user_id = current_setting('lean.l2_04.actor_id')::uuid
  ) then
    raise exception 'LEAN_L2_04_ASSERTION_FAILED: Checkout ledger granted membership';
  end if;
end;
$lean_l2_04_state$;

select
  :'prismarium_target' as target,
  1 as schema_contract,
  1 as customer_read_denied,
  1 as customer_write_denied,
  1 as service_write_allowed,
  1 as request_identity_unique,
  1 as fingerprint_required,
  1 as incomplete_completion_denied,
  1 as session_identity_unique,
  1 as exact_replay_retained,
  1 as no_membership_grant,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id = :'actor_id'::uuid) +
  (select count(*) from public.billing_checkout_requests where user_id = :'actor_id'::uuid) +
  (select count(*) from public.billing_memberships where user_id = :'actor_id'::uuid)
) as cleanup_residue;

\echo 'LEAN_L2_04_LOCAL_RESULT: PASS'
