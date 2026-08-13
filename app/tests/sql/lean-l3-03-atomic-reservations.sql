\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L3_03_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l3_03_target_allowed \gset
\if :lean_l3_03_target_allowed
\else
  \echo 'LEAN_L3_03_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select
  gen_random_uuid() as actor_id,
  gen_random_uuid() as request_one,
  gen_random_uuid() as request_two,
  gen_random_uuid() as request_three,
  gen_random_uuid() as missing_request
\gset

select
  'lean-l3-03-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email
\gset

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-03 actor"}'::jsonb, now(), now()
);

select set_config('lean.l3_03.actor_id', :'actor_id', true);
select set_config('lean.l3_03.request_one', :'request_one', true);
select set_config('lean.l3_03.request_two', :'request_two', true);
select set_config('lean.l3_03.request_three', :'request_three', true);
select set_config('lean.l3_03.missing_request', :'missing_request', true);

create or replace function pg_temp.lean_l3_03_assert_equal(
  p_actual text,
  p_expected text,
  p_marker text
)
returns void
language plpgsql
as $assert_equal$
begin
  if p_actual is distinct from p_expected then
    raise exception
      'LEAN_L3_03_ASSERTION_FAILED: % expected %, got %',
      p_marker, p_expected, p_actual;
  end if;
end;
$assert_equal$;

create or replace function pg_temp.lean_l3_03_expect_error(
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

  raise exception 'LEAN_L3_03_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $lean_l3_03_authority$
declare
  signature text;
begin
  foreach signature in array array[
    'public.reserve_credits_v1(uuid,uuid,text,text,integer,timestamptz)',
    'public.commit_credit_reservation_v1(uuid,uuid,text,text,timestamptz)',
    'public.release_credit_reservation_v1(uuid,uuid,text,text,timestamptz)',
    'public.recover_stale_credit_reservations_v1(uuid,timestamptz)'
  ] loop
    if has_function_privilege('anon', signature, 'EXECUTE')
       or has_function_privilege('authenticated', signature, 'EXECUTE')
       or not has_function_privilege('service_role', signature, 'EXECUTE') then
      raise exception 'LEAN_L3_03_ASSERTION_FAILED: authority mismatch on %',
        signature;
    end if;
  end loop;
end;
$lean_l3_03_authority$;

set local role authenticated;
select pg_temp.lean_l3_03_expect_error(
  format(
    $sql$select * from public.reserve_credits_v1(
      %L::uuid, %L::uuid, %L, 'working.generate', 1,
      '2026-08-15 12:00:00+00'::timestamptz
    )$sql$,
    :'actor_id', :'request_one', repeat('a', 64)
  ),
  'permission denied'
);
reset role;

-- First reserve lazily synchronizes Reader 10 and atomically holds one.
set local role service_role;
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.reserve_credits_v1(
      :'actor_id', :'request_one', repeat('a', 64),
      'working.generate', 1, '2026-08-15 12:00:00+00'
    )
  ),
  'reserved',
  'initial reserve'
);
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.reserve_credits_v1(
      :'actor_id', :'request_one', repeat('a', 64),
      'working.generate', 1, '2026-08-15 12:00:01+00'
    )
  ),
  'duplicate_pending',
  'pending replay'
);
reset role;

select id as reservation_one
from public.credit_reservations
where user_id = :'actor_id' and request_id = :'request_one'
\gset
select set_config('lean.l3_03.reservation_one', :'reservation_one', true);

do $lean_l3_03_initial_reserve$
begin
  if not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_03.actor_id')::uuid
      and available_credits = 9
      and reserved_credits = 1
      and version = 2
  ) or not exists (
    select 1 from public.credit_reservations
    where id = current_setting('lean.l3_03.reservation_one')::uuid
      and state = 'pending'
      and quoted_credits = 1
  ) then
    raise exception 'LEAN_L3_03_ASSERTION_FAILED: initial reserve state';
  end if;
end;
$lean_l3_03_initial_reserve$;

-- Same request ID with any normalized-input mismatch is a conflict.
set local role service_role;
select pg_temp.lean_l3_03_expect_error(
  format(
    $sql$select * from public.reserve_credits_v1(
      %L::uuid, %L::uuid, %L, 'working.generate', 1,
      '2026-08-15 12:00:02+00'::timestamptz
    )$sql$,
    :'actor_id', :'request_one', repeat('b', 64)
  ),
  'LEAN_L3_03_REQUEST_CONFLICT'
);

-- Ten cannot be reserved while only nine remain; no request row is created.
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.reserve_credits_v1(
      :'actor_id', :'request_two', repeat('b', 64),
      'seven_lenses.long', 10, '2026-08-15 12:00:02+00'
    )
  ),
  'insufficient_credits',
  'insufficient balance'
);

-- Commit occurs once at the durable-result reference.
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.commit_credit_reservation_v1(
      :'actor_id', :'request_one', repeat('a', 64),
      'journal-result-001', '2026-08-15 12:01:00+00'
    )
  ),
  'committed',
  'commit'
);
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.commit_credit_reservation_v1(
      :'actor_id', :'request_one', repeat('a', 64),
      'journal-result-001', '2026-08-15 12:01:01+00'
    )
  ),
  'duplicate_committed',
  'commit replay'
);
select pg_temp.lean_l3_03_expect_error(
  format(
    $sql$select * from public.commit_credit_reservation_v1(
      %L::uuid, %L::uuid, %L, 'different-result',
      '2026-08-15 12:01:02+00'::timestamptz
    )$sql$,
    :'actor_id', :'request_one', repeat('a', 64)
  ),
  'LEAN_L3_03_RESULT_CONFLICT'
);
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.release_credit_reservation_v1(
      :'actor_id', :'request_one', repeat('a', 64),
      'PROVIDER_ERROR', '2026-08-15 12:01:03+00'
    )
  ),
  'already_committed',
  'release after commit'
);

-- Reuse request two with its original cost after the insufficient attempt;
-- no row existed, so a valid two-credit reserve and persistence release work.
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.reserve_credits_v1(
      :'actor_id', :'request_two', repeat('c', 64),
      'seven_lenses.standard', 2, '2026-08-15 12:02:00+00'
    )
  ),
  'reserved',
  'second reserve'
);
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.release_credit_reservation_v1(
      :'actor_id', :'request_two', repeat('c', 64),
      'PERSISTENCE_ERROR', '2026-08-15 12:03:00+00'
    )
  ),
  'released',
  'persistence release'
);
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.release_credit_reservation_v1(
      :'actor_id', :'request_two', repeat('c', 64),
      'PERSISTENCE_ERROR', '2026-08-15 12:03:01+00'
    )
  ),
  'duplicate_released',
  'release replay'
);
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.commit_credit_reservation_v1(
      :'actor_id', :'request_two', repeat('c', 64),
      'late-result', '2026-08-15 12:03:02+00'
    )
  ),
  'already_released',
  'commit after release'
);

-- A third pending reservation is recovered after its fixed ten-minute TTL.
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.reserve_credits_v1(
      :'actor_id', :'request_three', repeat('d', 64),
      'seven_lenses.long', 3, '2026-08-15 12:04:00+00'
    )
  ),
  'reserved',
  'stale candidate reserve'
);
select pg_temp.lean_l3_03_assert_equal(
  public.recover_stale_credit_reservations_v1(
    :'actor_id', '2026-08-15 12:14:00+00'
  )::text,
  '1',
  'stale recovery'
);
select pg_temp.lean_l3_03_assert_equal(
  public.recover_stale_credit_reservations_v1(
    :'actor_id', '2026-08-15 12:14:01+00'
  )::text,
  '0',
  'stale recovery replay'
);
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.commit_credit_reservation_v1(
      :'actor_id', :'request_three', repeat('d', 64),
      'late-stale-result', '2026-08-15 12:14:02+00'
    )
  ),
  'already_expired',
  'commit after stale recovery'
);
select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.release_credit_reservation_v1(
      :'actor_id', :'request_three', repeat('d', 64),
      'TIMEOUT', '2026-08-15 12:14:03+00'
    )
  ),
  'duplicate_expired',
  'release after stale recovery'
);

select pg_temp.lean_l3_03_assert_equal(
  (
    select result_code from public.commit_credit_reservation_v1(
      :'actor_id', :'missing_request', repeat('e', 64),
      'missing-result', '2026-08-15 12:15:00+00'
    )
  ),
  'reservation_not_found',
  'missing commit'
);
select pg_temp.lean_l3_03_expect_error(
  format(
    $sql$select * from public.release_credit_reservation_v1(
      %L::uuid, %L::uuid, %L, 'CLIENT_INVENTED_REASON',
      '2026-08-15 12:15:00+00'::timestamptz
    )$sql$,
    :'actor_id', :'missing_request', repeat('e', 64)
  ),
  'LEAN_L3_03_INVALID_RELEASE_INPUT'
);
reset role;

do $lean_l3_03_final_state$
declare
  v_account public.credit_accounts%rowtype;
  v_available bigint;
  v_reserved bigint;
  v_max_version bigint;
begin
  select * into strict v_account
  from public.credit_accounts
  where user_id = current_setting('lean.l3_03.actor_id')::uuid;

  select
    coalesce(sum(available_delta), 0),
    coalesce(sum(reserved_delta), 0),
    coalesce(max(account_version), 0)
  into v_available, v_reserved, v_max_version
  from public.credit_transactions
  where user_id = v_account.user_id;

  if v_account.available_credits <> 9
     or v_account.reserved_credits <> 0
     or v_account.version <> 7
     or v_available <> v_account.available_credits
     or v_reserved <> v_account.reserved_credits
     or v_max_version <> v_account.version then
    raise exception 'LEAN_L3_03_ASSERTION_FAILED: account/ledger invariant';
  end if;

  if (
    select count(*) from public.credit_reservations
    where user_id = v_account.user_id and state = 'pending'
  ) <> 0 or (
    select count(*) from public.credit_transactions
    where user_id = v_account.user_id
      and transaction_type in ('commit', 'release')
  ) <> 3 or exists (
    select reservation_id
    from public.credit_transactions
    where user_id = v_account.user_id
      and transaction_type in ('commit', 'release')
    group by reservation_id
    having count(*) <> 1
  ) then
    raise exception 'LEAN_L3_03_ASSERTION_FAILED: settlement invariant';
  end if;

  if exists (
    select 1 from public.credit_reservations
    where user_id = v_account.user_id
      and request_id = current_setting('lean.l3_03.missing_request')::uuid
  ) then
    raise exception 'LEAN_L3_03_ASSERTION_FAILED: insufficient/missing request persisted';
  end if;
end;
$lean_l3_03_final_state$;

select
  :'prismarium_target' as target,
  1 as service_only,
  1 as lazy_grant_sync,
  1 as atomic_reserve,
  1 as pending_replay,
  1 as hash_conflict,
  1 as insufficient_safe,
  1 as commit_once,
  1 as result_conflict,
  1 as release_after_commit_safe,
  1 as persistence_release,
  1 as release_replay,
  1 as commit_after_release_safe,
  1 as stale_recovery,
  1 as stale_replay,
  1 as invalid_reason_blocked,
  1 as settlement_once,
  1 as accounting_agrees,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id = :'actor_id'::uuid) +
  (select count(*) from public.credit_accounts where user_id = :'actor_id'::uuid) +
  (select count(*) from public.credit_grants where user_id = :'actor_id'::uuid) +
  (select count(*) from public.credit_reservations where user_id = :'actor_id'::uuid) +
  (select count(*) from public.credit_transactions where user_id = :'actor_id'::uuid)
) as cleanup_residue;

\echo 'LEAN_L3_03_LOCAL_BOUNDARIES: 17/17 PASS'
\echo 'LEAN_L3_03_LOCAL_RESULT: PASS'
