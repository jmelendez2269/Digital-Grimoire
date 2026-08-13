\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L3_01_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l3_01_target_allowed \gset
\if :lean_l3_01_target_allowed
\else
  \echo 'LEAN_L3_01_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select
  gen_random_uuid() as actor_id,
  gen_random_uuid() as other_id,
  gen_random_uuid() as spare_id,
  gen_random_uuid() as actor_grant_id,
  gen_random_uuid() as other_grant_id,
  gen_random_uuid() as actor_reservation_id,
  gen_random_uuid() as actor_request_id
\gset

select
  'lean-l3-01-a-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email,
  'lean-l3-01-b-' || replace(:'run_id', '-', '') || '@example.invalid' as other_email,
  'lean-l3-01-c-' || replace(:'run_id', '-', '') || '@example.invalid' as spare_email,
  'reader:' || :'actor_id' || ':2026-08' as actor_source_key,
  'reader:' || :'other_id' || ':2026-08' as other_source_key
\gset

select set_config('lean.l3_01.actor_id', :'actor_id', true);
select set_config(
  'lean.l3_01.actor_reservation_id', :'actor_reservation_id', true
);

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-01 actor"}'::jsonb, now(), now()
),
(
  :'other_id', 'authenticated', 'authenticated', :'other_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-01 other"}'::jsonb, now(), now()
),
(
  :'spare_id', 'authenticated', 'authenticated', :'spare_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-01 spare"}'::jsonb, now(), now()
);

create or replace function pg_temp.lean_l3_01_expect_error(
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

  raise exception 'LEAN_L3_01_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $lean_l3_01_catalog$
declare
  v_table_name text;
  role_name text;
begin
  foreach v_table_name in array array[
    'credit_accounts',
    'credit_grants',
    'credit_reservations',
    'credit_transactions',
    'ai_usage_events'
  ] loop
    if not exists (
      select 1
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = v_table_name
        and c.relkind = 'r'
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception
        'LEAN_L3_01_ASSERTION_FAILED: % is absent or RLS is not forced',
        v_table_name;
    end if;

    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = v_table_name
    ) then
      raise exception
        'LEAN_L3_01_ASSERTION_FAILED: customer policy unexpectedly exists on %',
        v_table_name;
    end if;

    foreach role_name in array array['anon', 'authenticated'] loop
      if has_table_privilege(
        role_name,
        format('public.%I', v_table_name),
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
      ) then
        raise exception
          'LEAN_L3_01_ASSERTION_FAILED: % retains authority on %',
          role_name, v_table_name;
      end if;
    end loop;
  end loop;

  if not has_table_privilege(
    'service_role', 'public.credit_accounts', 'SELECT,INSERT,UPDATE'
  ) or not has_table_privilege(
    'service_role', 'public.credit_grants', 'SELECT,INSERT,UPDATE'
  ) or not has_table_privilege(
    'service_role', 'public.credit_reservations', 'SELECT,INSERT,UPDATE'
  ) or not has_table_privilege(
    'service_role', 'public.credit_transactions', 'SELECT,INSERT'
  ) or not has_table_privilege(
    'service_role', 'public.ai_usage_events', 'SELECT,INSERT,UPDATE'
  ) then
    raise exception 'LEAN_L3_01_ASSERTION_FAILED: service authority is incomplete';
  end if;

  if has_table_privilege(
    'service_role', 'public.credit_transactions', 'UPDATE,DELETE,TRUNCATE'
  ) then
    raise exception 'LEAN_L3_01_ASSERTION_FAILED: ledger is not append-only';
  end if;

  if has_table_privilege(
    'service_role', 'public.credit_accounts', 'DELETE,TRUNCATE'
  ) or has_table_privilege(
    'service_role', 'public.credit_grants', 'DELETE,TRUNCATE'
  ) or has_table_privilege(
    'service_role', 'public.credit_reservations', 'DELETE,TRUNCATE'
  ) or has_table_privilege(
    'service_role', 'public.ai_usage_events', 'DELETE,TRUNCATE'
  ) then
    raise exception 'LEAN_L3_01_ASSERTION_FAILED: service delete authority exists';
  end if;

  if to_regclass('public.credit_purchases') is not null
     or to_regclass('public.credit_debts') is not null
     or to_regclass('public.credit_reservation_allocations') is not null then
    raise exception 'LEAN_L3_01_ASSERTION_FAILED: deferred credit machinery exists';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'credit_accounts', 'credit_grants', 'credit_reservations',
        'credit_transactions', 'ai_usage_events'
      )
      and column_name ~ '(debt|purchase|rollover|prompt|response|metadata)'
  ) then
    raise exception
      'LEAN_L3_01_ASSERTION_FAILED: deferred or sensitive column exists';
  end if;
end;
$lean_l3_01_catalog$;

set local role authenticated;
select pg_temp.lean_l3_01_expect_error(
  'select * from public.credit_accounts',
  'permission denied'
);
select pg_temp.lean_l3_01_expect_error(
  format(
    'insert into public.credit_accounts (user_id) values (%L::uuid)',
    :'actor_id'
  ),
  'permission denied'
);
reset role;

set local role service_role;
insert into public.credit_accounts (user_id)
values (:'actor_id'), (:'other_id'), (:'spare_id');

insert into public.credit_grants (
  id, user_id, source_kind, source_key, source_fingerprint, plan_code,
  granted_credits, valid_from, expires_at
) values
(
  :'actor_grant_id', :'actor_id', 'reader_monthly', :'actor_source_key',
  repeat('a', 64), 'reader', 10,
  '2026-08-01 00:00:00+00', '2026-09-01 00:00:00+00'
),
(
  :'other_grant_id', :'other_id', 'reader_monthly', :'other_source_key',
  repeat('b', 64), 'reader', 10,
  '2026-08-01 00:00:00+00', '2026-09-01 00:00:00+00'
);
reset role;

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_grants (
      user_id, source_kind, source_key, source_fingerprint, plan_code,
      granted_credits, valid_from, expires_at
    ) values (
      %L::uuid, 'reader_monthly', %L, %L, 'reader', 10,
      '2026-08-01 00:00:00+00', '2026-09-01 00:00:00+00'
    )$sql$,
    :'spare_id', :'actor_source_key', repeat('c', 64)
  ),
  'credit_grants_source_key_uidx'
);

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_grants (
      user_id, source_kind, source_key, source_fingerprint, plan_code,
      granted_credits, valid_from, expires_at
    ) values (
      %L::uuid, 'reader_monthly', %L, %L, 'reader', 10,
      '2026-08-01 00:00:00+00', '2026-09-01 00:00:00+00'
    )$sql$,
    :'actor_id', 'reader:duplicate:2026-08', repeat('d', 64)
  ),
  'credit_grants_one_active_per_user_uidx'
);

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_grants (
      user_id, source_kind, source_key, source_fingerprint, plan_code,
      granted_credits, valid_from, expires_at, state, expired_at
    ) values (
      %L::uuid, 'reader_monthly', %L, %L, 'reader', 10,
      '2026-09-01 00:00:00+00', '2026-08-01 00:00:00+00',
      'expired', '2026-09-01 00:00:00+00'
    )$sql$,
    :'spare_id', 'reader:invalid:2026-08', repeat('e', 64)
  ),
  'credit_grants_expiry_order_check'
);

select pg_temp.lean_l3_01_expect_error(
  format(
    'update public.credit_accounts set available_credits = -1 where user_id = %L::uuid',
    :'actor_id'
  ),
  'credit_accounts_available_nonnegative_check'
);

set local role service_role;
insert into public.credit_reservations (
  id, user_id, grant_id, request_id, request_fingerprint,
  action_code, quoted_credits, expires_at
) values (
  :'actor_reservation_id', :'actor_id', :'actor_grant_id',
  :'actor_request_id', repeat('f', 64), 'working.generate', 2,
  now() + interval '10 minutes'
);
reset role;

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_reservations (
      user_id, grant_id, request_id, request_fingerprint,
      action_code, quoted_credits, expires_at
    ) values (
      %L::uuid, %L::uuid, %L::uuid, %L,
      'working.generate', 2, now() + interval '10 minutes'
    )$sql$,
    :'actor_id', :'actor_grant_id', :'actor_request_id', repeat('1', 64)
  ),
  'credit_reservations_user_request_uidx'
);

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_reservations (
      user_id, grant_id, request_id, request_fingerprint,
      action_code, quoted_credits, expires_at
    ) values (
      %L::uuid, %L::uuid, gen_random_uuid(), %L,
      'working.generate', 2, now() + interval '10 minutes'
    )$sql$,
    :'other_id', :'actor_grant_id', repeat('2', 64)
  ),
  'credit_reservations_grant_user_fkey'
);

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_reservations (
      user_id, grant_id, request_id, request_fingerprint,
      action_code, quoted_credits, state, expires_at, settled_at
    ) values (
      %L::uuid, %L::uuid, gen_random_uuid(), %L,
      'working.generate', 2, 'pending', now() + interval '10 minutes', now()
    )$sql$,
    :'other_id', :'other_grant_id', repeat('3', 64)
  ),
  'credit_reservations_settlement_check'
);

set local role service_role;
insert into public.credit_transactions (
  user_id, grant_id, transaction_type, event_key, event_fingerprint,
  available_delta, reserved_delta, available_after, reserved_after,
  account_version, reason_code
) values (
  :'actor_id', :'actor_grant_id', 'grant',
  'grant:' || :'actor_grant_id', repeat('4', 64),
  10, 0, 10, 0, 1, 'MONTHLY_GRANT'
);
update public.credit_accounts
set available_credits = 10, version = 1, updated_at = now()
where user_id = :'actor_id';

insert into public.credit_transactions (
  user_id, grant_id, reservation_id, transaction_type,
  event_key, event_fingerprint,
  available_delta, reserved_delta, available_after, reserved_after,
  account_version, reason_code
) values (
  :'actor_id', :'actor_grant_id', :'actor_reservation_id', 'reserve',
  'reservation:' || :'actor_reservation_id' || ':reserve', repeat('5', 64),
  -2, 2, 8, 2, 2, 'ACTION_RESERVED'
);
update public.credit_accounts
set available_credits = 8, reserved_credits = 2,
    version = 2, updated_at = now()
where user_id = :'actor_id';
reset role;

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_transactions (
      user_id, grant_id, reservation_id, transaction_type,
      event_key, event_fingerprint,
      available_delta, reserved_delta, available_after, reserved_after,
      account_version, reason_code
    ) values (
      %L::uuid, %L::uuid, %L::uuid, 'reserve', %L, %L,
      -1, 0, 7, 2, 3, 'ACTION_RESERVED'
    )$sql$,
    :'actor_id', :'actor_grant_id', :'actor_reservation_id',
    'invalid:delta:' || :'run_id', repeat('6', 64)
  ),
  'credit_transactions_delta_shape_check'
);

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_transactions (
      user_id, grant_id, transaction_type, event_key, event_fingerprint,
      available_delta, reserved_delta, available_after, reserved_after,
      account_version, reason_code
    ) values (
      %L::uuid, %L::uuid, 'adjustment', %L, %L,
      1, 0, 9, 2, 3, 'MANUAL_ADJUSTMENT'
    )$sql$,
    :'actor_id', :'actor_grant_id',
    'grant:' || :'actor_grant_id', repeat('7', 64)
  ),
  'credit_transactions_event_key_uidx'
);

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_transactions (
      user_id, grant_id, transaction_type, event_key, event_fingerprint,
      available_delta, reserved_delta, available_after, reserved_after,
      account_version, reason_code
    ) values (
      %L::uuid, %L::uuid, 'adjustment', %L, %L,
      1, 0, 9, 2, 2, 'MANUAL_ADJUSTMENT'
    )$sql$,
    :'actor_id', :'actor_grant_id',
    'adjustment:' || :'run_id', repeat('8', 64)
  ),
  'credit_transactions_user_version_uidx'
);

set local role service_role;
insert into public.credit_transactions (
  user_id, grant_id, reservation_id, transaction_type,
  event_key, event_fingerprint,
  available_delta, reserved_delta, available_after, reserved_after,
  account_version, reason_code
) values (
  :'actor_id', :'actor_grant_id', :'actor_reservation_id', 'commit',
  'reservation:' || :'actor_reservation_id' || ':commit', repeat('9', 64),
  0, -2, 8, 0, 3, 'ACTION_COMMITTED'
);
update public.credit_accounts
set reserved_credits = 0, version = 3, updated_at = now()
where user_id = :'actor_id';
update public.credit_reservations
set state = 'committed', settled_at = now(), updated_at = now()
where id = :'actor_reservation_id';
reset role;

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.credit_transactions (
      user_id, grant_id, reservation_id, transaction_type,
      event_key, event_fingerprint,
      available_delta, reserved_delta, available_after, reserved_after,
      account_version, reason_code
    ) values (
      %L::uuid, %L::uuid, %L::uuid, 'release', %L, %L,
      2, -2, 10, 0, 4, 'ACTION_RELEASED'
    )$sql$,
    :'actor_id', :'actor_grant_id', :'actor_reservation_id',
    'reservation:' || :'actor_reservation_id' || ':release', repeat('a', 64)
  ),
  'credit_transactions_settlement_uidx'
);

set local role service_role;
select pg_temp.lean_l3_01_expect_error(
  format(
    'update public.credit_transactions set reason_code = %L where user_id = %L::uuid',
    'MUTATED', :'actor_id'
  ),
  'permission denied'
);

insert into public.ai_usage_events (
  user_id, reservation_id, attempt_number, action_code, plan_code,
  provider, model, provider_request_id, outcome,
  input_units, output_units, latency_ms, estimated_cost_usd,
  cost_rate_version, completed_at
) values (
  :'actor_id', :'actor_reservation_id', 1, 'working.generate', 'reader',
  'openai', 'lean-test-model', 'req-lean-l3-01-' || :'run_id', 'succeeded',
  100, 25, 1200, 0.012345, '2026-08-v1', now()
);
reset role;

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.ai_usage_events (
      user_id, reservation_id, attempt_number, action_code, plan_code,
      provider, model, outcome, estimated_cost_usd,
      cost_rate_version, completed_at
    ) values (
      %L::uuid, %L::uuid, 1, 'working.generate', 'reader',
      'openai', 'lean-test-model', 'succeeded', 0.01,
      '2026-08-v1', now()
    )$sql$,
    :'actor_id', :'actor_reservation_id'
  ),
  'ai_usage_events_reservation_attempt_uidx'
);

select pg_temp.lean_l3_01_expect_error(
  format(
    $sql$insert into public.ai_usage_events (
      user_id, reservation_id, attempt_number, action_code, plan_code,
      provider, model, outcome, estimated_cost_usd,
      cost_rate_version, completed_at
    ) values (
      %L::uuid, %L::uuid, 2, 'working.generate', 'reader',
      'openai', 'lean-test-model', 'provider_error', -0.01,
      '2026-08-v1', now()
    )$sql$,
    :'actor_id', :'actor_reservation_id'
  ),
  'ai_usage_events_cost_nonnegative_check'
);

do $lean_l3_01_accounting$
declare
  account_record public.credit_accounts%rowtype;
  ledger_available bigint;
  ledger_reserved bigint;
begin
  select * into strict account_record
  from public.credit_accounts
  where user_id = current_setting('lean.l3_01.actor_id')::uuid;

  select
    coalesce(sum(available_delta), 0),
    coalesce(sum(reserved_delta), 0)
  into ledger_available, ledger_reserved
  from public.credit_transactions
  where user_id = account_record.user_id;

  if account_record.available_credits <> 8
     or account_record.reserved_credits <> 0
     or account_record.version <> 3
     or ledger_available <> account_record.available_credits
     or ledger_reserved <> account_record.reserved_credits then
    raise exception 'LEAN_L3_01_ASSERTION_FAILED: cached and ledger balances disagree';
  end if;

  if not exists (
    select 1
    from public.credit_reservations
    where id = current_setting('lean.l3_01.actor_reservation_id')::uuid
      and state = 'committed'
      and settled_at is not null
  ) then
    raise exception 'LEAN_L3_01_ASSERTION_FAILED: reservation did not settle once';
  end if;

  if not exists (
    select 1
    from public.ai_usage_events
    where reservation_id = current_setting(
      'lean.l3_01.actor_reservation_id'
    )::uuid
      and outcome = 'succeeded'
      and estimated_cost_usd = 0.012345
  ) then
    raise exception 'LEAN_L3_01_ASSERTION_FAILED: privacy-safe usage evidence missing';
  end if;
end;
$lean_l3_01_accounting$;

select
  :'prismarium_target' as target,
  1 as schema_contract,
  1 as forced_rls,
  1 as customer_denied,
  1 as service_only,
  1 as append_only_ledger,
  1 as source_unique,
  1 as request_unique,
  1 as one_active_grant,
  1 as expiry_checked,
  1 as nonnegative_checked,
  1 as cross_user_denied,
  1 as transaction_shape_checked,
  1 as event_unique,
  1 as version_unique,
  1 as settlement_once,
  1 as accounting_agrees,
  1 as usage_safe,
  1 as deferred_absent,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users
    where id in (:'actor_id'::uuid, :'other_id'::uuid, :'spare_id'::uuid)) +
  (select count(*) from public.credit_accounts
    where user_id in (:'actor_id'::uuid, :'other_id'::uuid, :'spare_id'::uuid)) +
  (select count(*) from public.credit_grants
    where user_id in (:'actor_id'::uuid, :'other_id'::uuid, :'spare_id'::uuid)) +
  (select count(*) from public.credit_reservations
    where user_id in (:'actor_id'::uuid, :'other_id'::uuid, :'spare_id'::uuid)) +
  (select count(*) from public.credit_transactions
    where user_id in (:'actor_id'::uuid, :'other_id'::uuid, :'spare_id'::uuid)) +
  (select count(*) from public.ai_usage_events
    where user_id in (:'actor_id'::uuid, :'other_id'::uuid, :'spare_id'::uuid))
) as cleanup_residue;

\echo 'LEAN_L3_01_LOCAL_BOUNDARIES: 18/18 PASS'
\echo 'LEAN_L3_01_LOCAL_RESULT: PASS'
