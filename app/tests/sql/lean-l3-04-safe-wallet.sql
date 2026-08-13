\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L3_04_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l3_04_target_allowed \gset
\if :lean_l3_04_target_allowed
\else
  \echo 'LEAN_L3_04_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select
  gen_random_uuid() as actor_id,
  gen_random_uuid() as other_actor_id,
  gen_random_uuid() as blocked_actor_id,
  gen_random_uuid() as request_one,
  gen_random_uuid() as request_two
\gset

select
  'lean-l3-04-' || replace(:'run_id', '-', '') || '@example.invalid'
    as actor_email,
  'lean-l3-04-other-' || replace(:'run_id', '-', '') || '@example.invalid'
    as other_actor_email,
  'lean-l3-04-blocked-' || replace(:'run_id', '-', '') || '@example.invalid'
    as blocked_actor_email
\gset

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L3-04 actor"}'::jsonb, now(), now()
  ),
  (
    :'other_actor_id', 'authenticated', 'authenticated', :'other_actor_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L3-04 other actor"}'::jsonb, now(), now()
  ),
  (
    :'blocked_actor_id', 'authenticated', 'authenticated', :'blocked_actor_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L3-04 blocked actor"}'::jsonb, now(), now()
  );

insert into public.billing_memberships (user_id, billing_hold)
values (:'blocked_actor_id', true);

select set_config('lean.l3_04.actor_id', :'actor_id', true);
select set_config('lean.l3_04.other_actor_id', :'other_actor_id', true);
select set_config('lean.l3_04.blocked_actor_id', :'blocked_actor_id', true);
select set_config('lean.l3_04.request_one', :'request_one', true);
select set_config('lean.l3_04.request_two', :'request_two', true);
select set_config('lean.l3_04.actor_email', :'actor_email', true);
select set_config('lean.l3_04.other_actor_email', :'other_actor_email', true);
select set_config('lean.l3_04.blocked_actor_email', :'blocked_actor_email', true);

create temporary table lean_l3_04_snapshots (
  label text primary key,
  payload jsonb not null
) on commit drop;
grant select, insert on lean_l3_04_snapshots to service_role;

create or replace function pg_temp.lean_l3_04_assert_equal(
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
      'LEAN_L3_04_ASSERTION_FAILED: % expected %, got %',
      p_marker, p_expected, p_actual;
  end if;
end;
$assert_equal$;

create or replace function pg_temp.lean_l3_04_expect_error(
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

  raise exception 'LEAN_L3_04_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $lean_l3_04_authority$
begin
  if has_function_privilege(
       'anon',
       'public.get_credit_wallet_v1(uuid,timestamptz,integer)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.get_credit_wallet_v1(uuid,timestamptz,integer)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.get_credit_wallet_v1(uuid,timestamptz,integer)',
       'EXECUTE'
     ) then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: function authority';
  end if;
end;
$lean_l3_04_authority$;

set local role authenticated;
select pg_temp.lean_l3_04_expect_error(
  format(
    $sql$select public.get_credit_wallet_v1(
      %L::uuid, '2026-08-15 12:00:00+00'::timestamptz, 20
    )$sql$,
    :'actor_id'
  ),
  'permission denied'
);
select pg_temp.lean_l3_04_expect_error(
  format(
    $sql$select available_credits from public.credit_accounts
      where user_id = %L::uuid$sql$,
    :'actor_id'
  ),
  'permission denied'
);
select pg_temp.lean_l3_04_expect_error(
  format(
    $sql$update public.credit_accounts set available_credits = 999
      where user_id = %L::uuid$sql$,
    :'actor_id'
  ),
  'permission denied'
);
reset role;

-- The service projection lazily creates the current Reader grant, then returns
-- only the allowlisted customer shape.
set local role service_role;
insert into lean_l3_04_snapshots (label, payload)
select 'initial', public.get_credit_wallet_v1(
  :'actor_id', '2026-08-15 12:00:00+00', 20
);
insert into lean_l3_04_snapshots (label, payload)
select 'other', public.get_credit_wallet_v1(
  :'other_actor_id', '2026-08-15 12:00:00+00', 20
);
insert into lean_l3_04_snapshots (label, payload)
select 'blocked', public.get_credit_wallet_v1(
  :'blocked_actor_id', '2026-08-15 12:00:00+00', 20
);
reset role;

do $lean_l3_04_initial$
declare
  v_wallet jsonb;
  v_other jsonb;
  v_blocked jsonb;
  v_keys text[];
begin
  select payload into strict v_wallet
  from lean_l3_04_snapshots where label = 'initial';
  select payload into strict v_other
  from lean_l3_04_snapshots where label = 'other';
  select payload into strict v_blocked
  from lean_l3_04_snapshots where label = 'blocked';

  if v_wallet->>'status' <> 'current'
     or (v_wallet->>'availableCredits')::integer <> 10
     or (v_wallet->>'reservedCredits')::integer <> 0
     or (v_wallet->>'totalCredits')::integer <> 10
     or v_wallet#>>'{grant,planCode}' <> 'reader'
     or (v_wallet#>>'{grant,grantedCredits}')::integer <> 10
     or v_wallet#>>'{grant,expiresAt}' <> '2026-09-01T00:00:00+00:00'
     or v_wallet#>>'{grant,resetsAt}' <> '2026-09-01T00:00:00+00:00'
     or jsonb_array_length(v_wallet->'pending') <> 0
     or jsonb_array_length(v_wallet->'history') <> 1
     or v_wallet#>>'{history,0,kind}' <> 'monthly_grant' then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: initial wallet';
  end if;

  select array_agg(key order by key) into v_keys
  from jsonb_object_keys(v_wallet) as key;
  if v_keys <> array[
    'asOf', 'availableCredits', 'grant', 'history', 'pending',
    'reservedCredits', 'status', 'totalCredits'
  ]::text[] then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: root allowlist';
  end if;

  select array_agg(key order by key) into v_keys
  from jsonb_object_keys(v_wallet->'grant') as key;
  if v_keys <> array[
    'expiresAt', 'grantedCredits', 'planCode', 'resetsAt', 'validFrom'
  ]::text[] then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: grant allowlist';
  end if;

  if v_wallet::text ~* '(user_id|source_key|fingerprint|event_key|reason_code|reservation_id|grant_id|request_id|result_reference|stripe_)'
     or v_wallet::text like '%' || current_setting('lean.l3_04.actor_id') || '%'
     or v_wallet::text like '%' || current_setting('lean.l3_04.actor_email') || '%'
     or v_wallet::text like '%' || current_setting('lean.l3_04.other_actor_email') || '%'
     or v_wallet::text like '%' || current_setting('lean.l3_04.blocked_actor_email') || '%' then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: private field leakage';
  end if;

  if v_other->>'status' <> 'current'
     or (v_other->>'availableCredits')::integer <> 10 then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: other wallet';
  end if;

  if v_blocked->>'status' <> 'unavailable'
     or (v_blocked->>'availableCredits')::integer <> 0
     or (v_blocked->>'reservedCredits')::integer <> 0
     or v_blocked->'grant' <> 'null'::jsonb then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: ambiguous billing state';
  end if;
end;
$lean_l3_04_initial$;

-- A live hold appears as a narrow pending item and normalized history row.
set local role service_role;
select pg_temp.lean_l3_04_assert_equal(
  (
    select result_code from public.reserve_credits_v1(
      :'actor_id', :'request_one', repeat('a', 64),
      'working.generate', 2, '2026-08-15 12:01:00+00'
    )
  ),
  'reserved',
  'pending reserve'
);
insert into lean_l3_04_snapshots (label, payload)
select 'pending', public.get_credit_wallet_v1(
  :'actor_id', '2026-08-15 12:01:01+00', 20
);
insert into lean_l3_04_snapshots (label, payload)
select 'limited', public.get_credit_wallet_v1(
  :'actor_id', '2026-08-15 12:01:02+00', 1
);
reset role;

do $lean_l3_04_pending$
declare
  v_wallet jsonb;
  v_limited jsonb;
  v_keys text[];
begin
  select payload into strict v_wallet
  from lean_l3_04_snapshots where label = 'pending';
  select payload into strict v_limited
  from lean_l3_04_snapshots where label = 'limited';

  if (v_wallet->>'availableCredits')::integer <> 8
     or (v_wallet->>'reservedCredits')::integer <> 2
     or (v_wallet->>'totalCredits')::integer <> 10
     or jsonb_array_length(v_wallet->'pending') <> 1
     or v_wallet#>>'{pending,0,actionCode}' <> 'working.generate'
     or (v_wallet#>>'{pending,0,credits}')::integer <> 2
     or v_wallet#>>'{history,0,kind}' <> 'credit_reserved'
     or v_wallet#>>'{history,0,actionCode}' <> 'working.generate'
     or (v_wallet#>>'{history,0,availableAfter}')::integer <> 8
     or (v_wallet#>>'{history,0,reservedAfter}')::integer <> 2 then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: pending projection';
  end if;

  select array_agg(key order by key) into v_keys
  from jsonb_object_keys(v_wallet->'pending'->0) as key;
  if v_keys <> array['actionCode', 'createdAt', 'credits', 'expiresAt']::text[] then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: pending allowlist';
  end if;

  select array_agg(key order by key) into v_keys
  from jsonb_object_keys(v_wallet->'history'->0) as key;
  if v_keys <> array[
    'actionCode', 'availableAfter', 'credits', 'kind', 'occurredAt',
    'reservedAfter'
  ]::text[] then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: history allowlist';
  end if;

  if jsonb_array_length(v_limited->'history') <> 1
     or v_limited#>>'{history,0,kind}' <> 'credit_reserved' then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: history limit';
  end if;
end;
$lean_l3_04_pending$;

-- Release is reflected without returning request, reservation, result, or
-- provider identifiers.
set local role service_role;
select pg_temp.lean_l3_04_assert_equal(
  (
    select result_code from public.release_credit_reservation_v1(
      :'actor_id', :'request_one', repeat('a', 64),
      'PERSISTENCE_ERROR', '2026-08-15 12:02:00+00'
    )
  ),
  'released',
  'release'
);
insert into lean_l3_04_snapshots (label, payload)
select 'released', public.get_credit_wallet_v1(
  :'actor_id', '2026-08-15 12:02:01+00', 20
);

select pg_temp.lean_l3_04_assert_equal(
  (
    select result_code from public.reserve_credits_v1(
      :'actor_id', :'request_two', repeat('b', 64),
      'seven_lenses.long', 3, '2026-08-15 12:03:00+00'
    )
  ),
  'reserved',
  'stale candidate'
);
insert into lean_l3_04_snapshots (label, payload)
select 'recovered', public.get_credit_wallet_v1(
  :'actor_id', '2026-08-15 12:13:00+00', 20
);
reset role;

do $lean_l3_04_settlement$
declare
  v_released jsonb;
  v_recovered jsonb;
begin
  select payload into strict v_released
  from lean_l3_04_snapshots where label = 'released';
  select payload into strict v_recovered
  from lean_l3_04_snapshots where label = 'recovered';

  if (v_released->>'availableCredits')::integer <> 10
     or (v_released->>'reservedCredits')::integer <> 0
     or jsonb_array_length(v_released->'pending') <> 0
     or v_released#>>'{history,0,kind}' <> 'credit_returned'
     or (v_released#>>'{history,0,credits}')::integer <> 2 then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: release projection';
  end if;

  if (v_recovered->>'availableCredits')::integer <> 10
     or (v_recovered->>'reservedCredits')::integer <> 0
     or jsonb_array_length(v_recovered->'pending') <> 0
     or v_recovered#>>'{history,0,kind}' <> 'credit_returned'
     or (v_recovered#>>'{history,0,credits}')::integer <> 3 then
    raise exception 'LEAN_L3_04_ASSERTION_FAILED: stale recovery projection';
  end if;
end;
$lean_l3_04_settlement$;

-- Invalid input and any ledger/cache disagreement fail closed.
set local role service_role;
select pg_temp.lean_l3_04_expect_error(
  format(
    $sql$select public.get_credit_wallet_v1(
      %L::uuid, '2026-08-15 12:14:00+00'::timestamptz, 0
    )$sql$,
    :'actor_id'
  ),
  'LEAN_L3_04_INVALID_INPUT'
);
reset role;

update public.credit_accounts
set available_credits = available_credits + 1
where user_id = :'actor_id';
set local role service_role;
select pg_temp.lean_l3_04_expect_error(
  format(
    $sql$select public.get_credit_wallet_v1(
      %L::uuid, '2026-08-15 12:14:00+00'::timestamptz, 20
    )$sql$,
    :'actor_id'
  ),
  'LEAN_L3_04_ACCOUNTING_MISMATCH'
);
reset role;
update public.credit_accounts
set available_credits = available_credits - 1
where user_id = :'actor_id';

select
  :'prismarium_target' as target,
  1 as service_only,
  1 as direct_rpc_blocked,
  1 as direct_table_read_blocked,
  1 as direct_table_write_blocked,
  1 as lazy_monthly_grant,
  1 as exact_balance,
  1 as reset_and_expiry,
  1 as root_allowlist,
  1 as private_fields_absent,
  1 as ambiguous_state_safe,
  1 as pending_projection,
  1 as normalized_history,
  1 as history_limit,
  1 as release_projection,
  1 as stale_recovery_projection,
  1 as invalid_input_blocked,
  1 as mismatch_blocked,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id in (
    :'actor_id'::uuid, :'other_actor_id'::uuid, :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.billing_memberships where user_id in (
    :'actor_id'::uuid, :'other_actor_id'::uuid, :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.credit_accounts where user_id in (
    :'actor_id'::uuid, :'other_actor_id'::uuid, :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.credit_grants where user_id in (
    :'actor_id'::uuid, :'other_actor_id'::uuid, :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.credit_reservations where user_id in (
    :'actor_id'::uuid, :'other_actor_id'::uuid, :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.credit_transactions where user_id in (
    :'actor_id'::uuid, :'other_actor_id'::uuid, :'blocked_actor_id'::uuid
  ))
) as cleanup_residue;

\echo 'LEAN_L3_04_LOCAL_BOUNDARIES: 17/17 PASS'
\echo 'LEAN_L3_04_LOCAL_RESULT: PASS'
