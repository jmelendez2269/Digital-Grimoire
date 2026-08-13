\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L4_01_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l4_01_target_allowed \gset
\if :lean_l4_01_target_allowed
\else
  \echo 'LEAN_L4_01_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select
  gen_random_uuid() as reader_id,
  gen_random_uuid() as paid_id,
  gen_random_uuid() as operator_id,
  gen_random_uuid() as reader_request_1,
  gen_random_uuid() as reader_request_2,
  gen_random_uuid() as reader_request_3,
  gen_random_uuid() as reader_request_4,
  gen_random_uuid() as reader_request_next_month,
  gen_random_uuid() as paid_request_1,
  gen_random_uuid() as paid_request_2,
  gen_random_uuid() as paid_request_3
\gset

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    :'reader_id', 'authenticated', 'authenticated',
    'lean-l4-01-reader-' || replace(:'run_id', '-', '') || '@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L4-01 Reader"}'::jsonb, now(), now()
  ),
  (
    :'paid_id', 'authenticated', 'authenticated',
    'lean-l4-01-paid-' || replace(:'run_id', '-', '') || '@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L4-01 Student"}'::jsonb, now(), now()
  ),
  (
    :'operator_id', 'authenticated', 'authenticated',
    'lean-l4-01-operator-' || replace(:'run_id', '-', '') || '@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L4-01 Operator"}'::jsonb, now(), now()
  );

insert into public.billing_memberships (
  user_id, plan_code, stripe_status, pricing_cohort, offer_code,
  billing_interval, stripe_customer_id, stripe_subscription_id,
  current_period_start, current_period_end, cancel_at_period_end,
  access_until, billing_hold, last_stripe_event_id,
  last_stripe_event_created
) values (
  :'paid_id', 'student', 'active', 'founding',
  'student_founding_monthly', 'month',
  'cus_leanL401Paid', 'sub_leanL401Paid',
  '2026-08-01 00:00:00+00', '2026-09-01 00:00:00+00', false,
  '2026-09-01 00:00:00+00', false, 'evt_leanL401Paid1', 1785542400
);

create or replace function pg_temp.lean_l4_01_expect_error(
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
  raise exception 'LEAN_L4_01_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

create or replace function pg_temp.lean_l4_01_assert(
  p_condition boolean,
  p_label text
)
returns void
language plpgsql
as $assert$
begin
  if p_condition is distinct from true then
    raise exception 'LEAN_L4_01_ASSERTION_FAILED: %', p_label;
  end if;
end;
$assert$;

-- Forced RLS, zero customer policies, exact table/function ACL, and an
-- append-only override audit are all required before lifecycle tests.
do $lean_l4_01_security$
declare
  v_table text;
  v_signature text;
begin
  foreach v_table in array array[
    'public.ai_metering_requests',
    'public.reader_cost_breaker_overrides'
  ] loop
    if has_table_privilege('anon', v_table, 'SELECT')
       or has_table_privilege('anon', v_table, 'INSERT')
       or has_table_privilege('anon', v_table, 'UPDATE')
       or has_table_privilege('anon', v_table, 'DELETE')
       or has_table_privilege('authenticated', v_table, 'SELECT')
       or has_table_privilege('authenticated', v_table, 'INSERT')
       or has_table_privilege('authenticated', v_table, 'UPDATE')
       or has_table_privilege('authenticated', v_table, 'DELETE') then
      raise exception 'LEAN_L4_01_ASSERTION_FAILED: customer ACL %', v_table;
    end if;
  end loop;

  if not has_table_privilege('service_role', 'public.ai_metering_requests', 'SELECT')
     or not has_table_privilege('service_role', 'public.ai_metering_requests', 'INSERT')
     or not has_table_privilege('service_role', 'public.ai_metering_requests', 'UPDATE')
     or has_table_privilege('service_role', 'public.ai_metering_requests', 'DELETE')
     or not has_table_privilege('service_role', 'public.reader_cost_breaker_overrides', 'SELECT')
     or not has_table_privilege('service_role', 'public.reader_cost_breaker_overrides', 'INSERT')
     or has_table_privilege('service_role', 'public.reader_cost_breaker_overrides', 'UPDATE')
     or has_table_privilege('service_role', 'public.reader_cost_breaker_overrides', 'DELETE') then
    raise exception 'LEAN_L4_01_ASSERTION_FAILED: service least privilege';
  end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('ai_metering_requests', 'reader_cost_breaker_overrides')
      and (not c.relrowsecurity or not c.relforcerowsecurity)
  ) or exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('ai_metering_requests', 'reader_cost_breaker_overrides')
  ) then
    raise exception 'LEAN_L4_01_ASSERTION_FAILED: forced RLS or policy matrix';
  end if;

  foreach v_signature in array array[
    'public.begin_ai_metering_request_v1(uuid,uuid,text,text,text,integer,text,text,numeric,text,integer,integer,integer,integer,numeric,timestamp with time zone)',
    'public.attach_ai_metering_credit_reservation_v1(uuid,uuid,text,uuid)',
    'public.complete_ai_metering_request_v1(uuid,uuid,text,text,numeric,text,timestamp with time zone)',
    'public.release_ai_metering_request_v1(uuid,uuid,text,text,timestamp with time zone)',
    'public.record_reader_cost_breaker_override_v1(numeric,uuid,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone)'
  ] loop
    if has_function_privilege('anon', v_signature, 'EXECUTE')
       or has_function_privilege('authenticated', v_signature, 'EXECUTE')
       or not has_function_privilege('service_role', v_signature, 'EXECUTE') then
      raise exception 'LEAN_L4_01_ASSERTION_FAILED: function ACL %', v_signature;
    end if;
  end loop;
end;
$lean_l4_01_security$;

set local role authenticated;
select set_config('request.jwt.claim.sub', :'reader_id', true);
select pg_temp.lean_l4_01_expect_error(
  'select * from public.ai_metering_requests limit 1', 'permission denied'
);
select pg_temp.lean_l4_01_expect_error(
  format(
    'select * from public.begin_ai_metering_request_v1(%L::uuid,%L::uuid,%L,%L,%L,1,%L,%L,0.05,%L,1,6,600,300,50,now())',
    :'reader_id', :'reader_request_1', repeat('a', 64),
    'working.generate', 'lean-launch-v1', 'shadow', 'reader',
    'lean-reader-guardrail-v1'
  ),
  'permission denied'
);
reset role;

-- Reader cost starts with in-flight estimates, replays idempotently, and
-- serializes concurrency before provider work.
set local role service_role;
select * from public.begin_ai_metering_request_v1(
  :'reader_id', :'reader_request_1', repeat('a', 64),
  'working.generate', 'lean-launch-v1', 1, 'shadow', 'reader',
  0.05, 'lean-reader-guardrail-v1', 1, 6, 600, 300, 0.10,
  '2026-08-15 12:00:00+00'
) \gset reader_one_
select pg_temp.lean_l4_01_assert(
  :'reader_one_result_code' = 'started'
  and :'reader_one_result_state' = 'pending'
  and :'reader_one_result_reader_cost_usd'::numeric = 0.05,
  'first Reader request and in-flight estimate'
);

select * from public.begin_ai_metering_request_v1(
  :'reader_id', :'reader_request_1', repeat('a', 64),
  'working.generate', 'lean-launch-v1', 1, 'shadow', 'reader',
  0.05, 'lean-reader-guardrail-v1', 1, 6, 600, 300, 0.10,
  '2026-08-15 12:00:01+00'
) \gset reader_replay_
select pg_temp.lean_l4_01_assert(
  :'reader_replay_result_code' = 'duplicate_pending'
  and :'reader_replay_result_metering_request_id' = :'reader_one_result_metering_request_id',
  'idempotent Reader replay'
);

select pg_temp.lean_l4_01_expect_error(
  format(
    'select * from public.begin_ai_metering_request_v1(%L::uuid,%L::uuid,%L,%L,%L,1,%L,%L,0.05,%L,1,6,600,300,0.10,%L::timestamptz)',
    :'reader_id', :'reader_request_1', repeat('b', 64),
    'working.generate', 'lean-launch-v1', 'shadow', 'reader',
    'lean-reader-guardrail-v1', '2026-08-15 12:00:02+00'
  ),
  'LEAN_L4_01_REQUEST_CONFLICT'
);
select pg_temp.lean_l4_01_expect_error(
  format(
    'select * from public.begin_ai_metering_request_v1(%L::uuid,%L::uuid,%L,%L,%L,1,%L,%L,0.05,%L,1,6,600,300,0.10,%L::timestamptz)',
    :'reader_id', :'reader_request_2', repeat('c', 64),
    'working.generate', 'lean-launch-v1', 'shadow', 'student',
    'lean-reader-guardrail-v1', '2026-08-15 12:00:02+00'
  ),
  'LEAN_L4_01_PLAN_MISMATCH'
);

select * from public.begin_ai_metering_request_v1(
  :'reader_id', :'reader_request_2', repeat('b', 64),
  'working.generate', 'lean-launch-v1', 1, 'shadow', 'reader',
  0.05, 'lean-reader-guardrail-v1', 1, 6, 600, 300, 0.10,
  '2026-08-15 12:00:03+00'
) \gset reader_concurrency_
select pg_temp.lean_l4_01_assert(
  :'reader_concurrency_result_code' = 'concurrency_limited',
  'atomic concurrency control'
);

select public.complete_ai_metering_request_v1(
  :'reader_id', :'reader_request_1', repeat('a', 64),
  'provider_error', 0.04, null, '2026-08-15 12:01:00+00'
);

select * from public.begin_ai_metering_request_v1(
  :'reader_id', :'reader_request_2', repeat('b', 64),
  'working.generate', 'lean-launch-v1', 1, 'shadow', 'reader',
  0.05, 'lean-reader-guardrail-v1', 1, 6, 600, 300, 0.10,
  '2026-08-15 12:02:00+00'
) \gset reader_two_

insert into public.ai_usage_events (
  user_id, metering_request_id, reservation_id, attempt_number,
  action_code, plan_code, provider, model, outcome,
  input_units, output_units, latency_ms, estimated_cost_usd,
  cost_rate_version, started_at, completed_at
) values (
  :'reader_id', :'reader_two_result_metering_request_id', null, 1,
  'working.generate', 'reader', 'anthropic', 'claude-haiku-4-5', 'succeeded',
  100, 200, 1000, 0.05, 'lean-reader-guardrail-v1',
  '2026-08-15 12:02:00+00', '2026-08-15 12:02:01+00'
);
select public.complete_ai_metering_request_v1(
  :'reader_id', :'reader_request_2', repeat('b', 64),
  'succeeded', 0.05, 'working:reader-two', '2026-08-15 12:02:01+00'
);

select * from public.begin_ai_metering_request_v1(
  :'reader_id', :'reader_request_3', repeat('c', 64),
  'working.generate', 'lean-launch-v1', 1, 'shadow', 'reader',
  0.05, 'lean-reader-guardrail-v1', 1, 6, 600, 300, 0.10,
  '2026-08-15 12:03:00+00'
) \gset reader_breaker_
select pg_temp.lean_l4_01_assert(
  :'reader_breaker_result_code' = 'reader_budget_exceeded'
  and :'reader_breaker_result_reader_cost_usd'::numeric = 0.09
  and :'reader_breaker_result_reader_budget_usd'::numeric = 0.10,
  'Reader committed plus in-flight breaker'
);

select public.record_reader_cost_breaker_override_v1(
  0.10, :'operator_id', 'Temporary local verification allowance',
  '2026-08-15 12:03:01+00', '2026-08-31 23:59:59+00',
  '2026-08-20 00:00:00+00', '2026-08-15 12:03:01+00'
) as override_id \gset

select * from public.begin_ai_metering_request_v1(
  :'reader_id', :'reader_request_3', repeat('c', 64),
  'working.generate', 'lean-launch-v1', 1, 'shadow', 'reader',
  0.05, 'lean-reader-guardrail-v1', 1, 6, 600, 300, 0.10,
  '2026-08-15 12:03:02+00'
) \gset reader_override_
select pg_temp.lean_l4_01_assert(
  :'reader_override_result_code' = 'started'
  and :'reader_override_result_reader_budget_usd'::numeric = 0.20,
  'audited Reader override raises only the effective budget'
);
select pg_temp.lean_l4_01_assert(
  exists (
    select 1 from public.reader_cost_breaker_overrides
    where id = :'override_id'
      and actor_user_id = :'operator_id'
      and amount_usd = 0.10
      and reason = 'Temporary local verification allowance'
      and expires_at = '2026-08-20 00:00:00+00'
  ),
  'override audit fields'
);

-- A paid plan is checked against its verified active grant and remains outside
-- the Reader-only breaker even with a zero Reader base budget.
select * from public.begin_ai_metering_request_v1(
  :'paid_id', :'paid_request_1', repeat('d', 64),
  'seven_lenses.long', 'lean-launch-v1', 3, 'shadow', 'student',
  5.00, 'lean-reader-guardrail-v1', 5, 1, 600, 300, 0,
  '2026-08-15 12:04:00+00'
) \gset paid_one_
select pg_temp.lean_l4_01_assert(
  :'paid_one_result_code' = 'started',
  'paid generation unaffected by Reader breaker'
);
select public.release_ai_metering_request_v1(
  :'paid_id', :'paid_request_1', repeat('d', 64),
  'control_released', '2026-08-15 12:04:01+00'
);
select * from public.begin_ai_metering_request_v1(
  :'paid_id', :'paid_request_2', repeat('e', 64),
  'seven_lenses.long', 'lean-launch-v1', 3, 'shadow', 'student',
  5.00, 'lean-reader-guardrail-v1', 5, 1, 600, 300, 0,
  '2026-08-15 12:04:02+00'
) \gset paid_velocity_
select pg_temp.lean_l4_01_assert(
  :'paid_velocity_result_code' = 'velocity_limited',
  'atomic velocity control'
);

-- Enforce mode links the exact L3 reservation; provider failure releases the
-- credit once while retaining the privacy-safe cost record.
select public.release_ai_metering_request_v1(
  :'reader_id', :'reader_request_3', repeat('c', 64),
  'control_released', '2026-08-15 12:05:00+00'
);
select * from public.begin_ai_metering_request_v1(
  :'reader_id', :'reader_request_4', repeat('e', 64),
  'working.generate', 'lean-launch-v1', 1, 'enforce', 'reader',
  0.05, 'lean-reader-guardrail-v1', 1, 6, 600, 300, 0.10,
  '2026-08-15 12:05:01+00'
) \gset enforce_begin_
select * from public.reserve_credits_v1(
  :'reader_id', :'reader_request_4', repeat('e', 64),
  'working.generate', 1, '2026-08-15 12:05:01+00'
) \gset enforce_credit_
select pg_temp.lean_l4_01_assert(
  :'enforce_credit_result_code' = 'reserved',
  'enforce credit reservation'
);
select pg_temp.lean_l4_01_assert(
  public.attach_ai_metering_credit_reservation_v1(
    :'reader_id', :'reader_request_4', repeat('e', 64),
    :'enforce_credit_result_reservation_id'
  ) = 'attached',
  'exact credit attachment'
);
select pg_temp.lean_l4_01_expect_error(
  format(
    'select public.complete_ai_metering_request_v1(%L::uuid,%L::uuid,%L,%L,0.01,null,%L::timestamptz)',
    :'reader_id', :'reader_request_4', repeat('e', 64),
    'provider_error', '2026-08-15 12:05:01.500+00'
  ),
  'LEAN_L4_01_CREDIT_SETTLEMENT_MISMATCH'
);
insert into public.ai_usage_events (
  user_id, metering_request_id, reservation_id, attempt_number,
  action_code, plan_code, provider, model, outcome,
  input_units, output_units, latency_ms, estimated_cost_usd,
  cost_rate_version, error_class, started_at, completed_at
) values (
  :'reader_id', :'enforce_begin_result_metering_request_id',
  :'enforce_credit_result_reservation_id', 1,
  'working.generate', 'reader', 'anthropic', 'claude-haiku-4-5', 'provider_error',
  20, 0, 500, 0.01, 'lean-reader-guardrail-v1', 'PROVIDER_ERROR',
  '2026-08-15 12:05:01+00', '2026-08-15 12:05:02+00'
);
select * from public.release_credit_reservation_v1(
  :'reader_id', :'reader_request_4', repeat('e', 64),
  'PROVIDER_ERROR', '2026-08-15 12:05:02+00'
) \gset enforce_release_
select public.complete_ai_metering_request_v1(
  :'reader_id', :'reader_request_4', repeat('e', 64),
  'provider_error', 0.01, null, '2026-08-15 12:05:02+00'
);
select pg_temp.lean_l4_01_assert(
  :'enforce_release_result_code' = 'released'
  and exists (
    select 1 from public.credit_accounts
    where user_id = :'reader_id' and available_credits = 10 and reserved_credits = 0
  )
  and exists (
    select 1 from public.ai_metering_requests
    where user_id = :'reader_id' and request_id = :'reader_request_4'
      and state = 'completed' and outcome = 'provider_error'
      and actual_cost_usd = 0.01
  ),
  'failure release and retained cost telemetry'
);

-- The period key is an exact UTC month, so August cost cannot pause September.
select * from public.begin_ai_metering_request_v1(
  :'reader_id', :'reader_request_next_month', repeat('f', 64),
  'working.generate', 'lean-launch-v1', 1, 'shadow', 'reader',
  0.05, 'lean-reader-guardrail-v1', 1, 6, 600, 300, 0.05,
  '2026-09-01 00:00:00+00'
) \gset next_month_
select pg_temp.lean_l4_01_assert(
  :'next_month_result_code' = 'started'
  and :'next_month_result_reader_cost_usd'::numeric = 0.05
  and exists (
    select 1 from public.ai_metering_requests
    where id = :'next_month_result_metering_request_id'
      and period_start = '2026-09-01 00:00:00+00'
      and period_end = '2026-10-01 00:00:00+00'
  ),
  'UTC month reset'
);
reset role;

do $lean_l4_01_privacy$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('ai_metering_requests', 'ai_usage_events')
      and column_name in (
        'prompt', 'prompt_text', 'response', 'response_text', 'email',
        'stripe_customer_id', 'metadata', 'request_metadata'
      )
  ) then
    raise exception 'LEAN_L4_01_ASSERTION_FAILED: private telemetry column';
  end if;
end;
$lean_l4_01_privacy$;

select
  :'prismarium_target' as target,
  1 as forced_rls,
  1 as customer_acl_denied,
  1 as functions_service_only,
  1 as service_least_privilege,
  1 as actual_customer_denial,
  1 as fixed_request_identity,
  1 as replay_idempotency,
  1 as request_conflict,
  1 as plan_match,
  1 as concurrency_limit,
  1 as velocity_limit,
  1 as in_flight_reader_cost,
  1 as completed_reader_cost,
  1 as reader_breaker,
  1 as paid_unaffected,
  1 as utc_month_reset,
  1 as override_audit,
  1 as shadow_no_credit,
  1 as enforce_credit_link,
  1 as failure_release,
  1 as privacy_safe_telemetry,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id in (
    :'reader_id'::uuid, :'paid_id'::uuid, :'operator_id'::uuid
  )) +
  (select count(*) from public.billing_memberships where user_id in (
    :'reader_id'::uuid, :'paid_id'::uuid, :'operator_id'::uuid
  )) +
  (select count(*) from public.credit_accounts where user_id in (
    :'reader_id'::uuid, :'paid_id'::uuid, :'operator_id'::uuid
  )) +
  (select count(*) from public.ai_metering_requests where user_id in (
    :'reader_id'::uuid, :'paid_id'::uuid, :'operator_id'::uuid
  )) +
  (select count(*) from public.reader_cost_breaker_overrides
    where actor_user_id = :'operator_id'::uuid) +
  (select count(*) from public.ai_usage_events where user_id in (
    :'reader_id'::uuid, :'paid_id'::uuid, :'operator_id'::uuid
  ))
) as cleanup_residue;

\echo 'LEAN_L4_01_LOCAL_BOUNDARIES: 21/21 PASS'
\echo 'LEAN_L4_01_LOCAL_RESULT: PASS'
