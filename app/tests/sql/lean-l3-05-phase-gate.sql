\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L3_05_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l3_05_target_allowed \gset
\if :lean_l3_05_target_allowed
\else
  \echo 'LEAN_L3_05_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select
  gen_random_uuid() as mixed_actor_id,
  gen_random_uuid() as released_actor_id,
  gen_random_uuid() as blocked_actor_id,
  gen_random_uuid() as mixed_commit_request,
  gen_random_uuid() as mixed_pending_request,
  gen_random_uuid() as released_request
\gset

select
  'lean-l3-05-mixed-' || replace(:'run_id', '-', '') || '@example.invalid'
    as mixed_actor_email,
  'lean-l3-05-released-' || replace(:'run_id', '-', '') || '@example.invalid'
    as released_actor_email,
  'lean-l3-05-blocked-' || replace(:'run_id', '-', '') || '@example.invalid'
    as blocked_actor_email
\gset

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    :'mixed_actor_id', 'authenticated', 'authenticated',
    :'mixed_actor_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L3-05 mixed actor"}'::jsonb, now(), now()
  ),
  (
    :'released_actor_id', 'authenticated', 'authenticated',
    :'released_actor_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L3-05 released actor"}'::jsonb, now(), now()
  ),
  (
    :'blocked_actor_id', 'authenticated', 'authenticated',
    :'blocked_actor_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L3-05 blocked actor"}'::jsonb, now(), now()
  );

insert into public.billing_memberships (user_id, billing_hold)
values (:'blocked_actor_id', true);

select set_config('lean.l3_05.mixed_actor_id', :'mixed_actor_id', true);
select set_config('lean.l3_05.released_actor_id', :'released_actor_id', true);
select set_config('lean.l3_05.blocked_actor_id', :'blocked_actor_id', true);
select set_config(
  'lean.l3_05.mixed_pending_request', :'mixed_pending_request', true
);

create or replace function pg_temp.lean_l3_05_expect_error(
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

  raise exception 'LEAN_L3_05_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

create or replace function pg_temp.lean_l3_05_assert_invariants(
  p_effective_at timestamptz,
  p_expected_pending integer
)
returns void
language plpgsql
as $assert_invariants$
declare
  v_failures integer;
  v_accounts integer;
begin
  with fixture_accounts as (
    select account.*
    from public.credit_accounts as account
    where account.user_id in (
      current_setting('lean.l3_05.mixed_actor_id')::uuid,
      current_setting('lean.l3_05.released_actor_id')::uuid,
      current_setting('lean.l3_05.blocked_actor_id')::uuid
    )
  ), expected as (
    select
      account.user_id,
      account.available_credits,
      account.reserved_credits,
      coalesce(grant_row.granted_credits, 0)
        + coalesce(adjustment.total, 0)
        - coalesce(committed.total, 0)
        - coalesce(pending.total, 0) as expected_available,
      coalesce(pending.total, 0) as expected_reserved
    from fixture_accounts as account
    left join lateral (
      select grant_row.id, grant_row.granted_credits
      from public.credit_grants as grant_row
      where grant_row.user_id = account.user_id
        and grant_row.state = 'active'
        and grant_row.valid_from <= p_effective_at
        and grant_row.expires_at > p_effective_at
    ) as grant_row on true
    left join lateral (
      select coalesce(sum(transaction.available_delta), 0) as total
      from public.credit_transactions as transaction
      where transaction.user_id = account.user_id
        and transaction.grant_id = grant_row.id
        and transaction.transaction_type = 'adjustment'
    ) as adjustment on true
    left join lateral (
      select coalesce(sum(-transaction.reserved_delta), 0) as total
      from public.credit_transactions as transaction
      where transaction.user_id = account.user_id
        and transaction.grant_id = grant_row.id
        and transaction.transaction_type = 'commit'
    ) as committed on true
    left join lateral (
      select coalesce(sum(reservation.quoted_credits), 0) as total
      from public.credit_reservations as reservation
      where reservation.user_id = account.user_id
        and reservation.grant_id = grant_row.id
        and reservation.state = 'pending'
        and reservation.expires_at > p_effective_at
    ) as pending on true
  )
  select count(*) into v_failures
  from expected
  where available_credits <> expected_available
     or reserved_credits <> expected_reserved;

  select count(*) into v_accounts
  from public.credit_accounts
  where user_id in (
    current_setting('lean.l3_05.mixed_actor_id')::uuid,
    current_setting('lean.l3_05.released_actor_id')::uuid,
    current_setting('lean.l3_05.blocked_actor_id')::uuid
  );

  if v_accounts <> 3 or v_failures <> 0 then
    raise exception 'LEAN_L3_05_ASSERTION_FAILED: authoritative formula';
  end if;

  with ledger as (
    select
      account.user_id,
      account.available_credits,
      account.reserved_credits,
      account.version,
      coalesce(sum(transaction.available_delta), 0) as ledger_available,
      coalesce(sum(transaction.reserved_delta), 0) as ledger_reserved,
      coalesce(max(transaction.account_version), 0) as ledger_version
    from public.credit_accounts as account
    left join public.credit_transactions as transaction
      on transaction.user_id = account.user_id
    where account.user_id in (
      current_setting('lean.l3_05.mixed_actor_id')::uuid,
      current_setting('lean.l3_05.released_actor_id')::uuid,
      current_setting('lean.l3_05.blocked_actor_id')::uuid
    )
    group by account.user_id, account.available_credits,
      account.reserved_credits, account.version
  )
  select count(*) into v_failures
  from ledger
  where available_credits <> ledger_available
     or reserved_credits <> ledger_reserved
     or version <> ledger_version;

  if v_failures <> 0 then
    raise exception 'LEAN_L3_05_ASSERTION_FAILED: cache/ledger disagreement';
  end if;

  if (
    select count(*)
    from public.credit_reservations
    where user_id in (
      current_setting('lean.l3_05.mixed_actor_id')::uuid,
      current_setting('lean.l3_05.released_actor_id')::uuid,
      current_setting('lean.l3_05.blocked_actor_id')::uuid
    ) and state = 'pending'
  ) <> p_expected_pending then
    raise exception 'LEAN_L3_05_ASSERTION_FAILED: pending count';
  end if;

  if exists (
    select 1
    from public.credit_reservations as reservation
    join public.credit_grants as grant_row
      on grant_row.id = reservation.grant_id
      and grant_row.user_id = reservation.user_id
    where reservation.user_id in (
      current_setting('lean.l3_05.mixed_actor_id')::uuid,
      current_setting('lean.l3_05.released_actor_id')::uuid,
      current_setting('lean.l3_05.blocked_actor_id')::uuid
    )
      and reservation.state = 'pending'
      and (
        reservation.expires_at <= p_effective_at
        or grant_row.state <> 'active'
        or grant_row.expires_at <= p_effective_at
        or (
          select count(*)
          from public.credit_transactions as reserve_event
          where reserve_event.reservation_id = reservation.id
            and reserve_event.transaction_type = 'reserve'
        ) <> 1
        or exists (
          select 1
          from public.credit_transactions as settlement
          where settlement.reservation_id = reservation.id
            and settlement.transaction_type in ('commit', 'release')
        )
      )
  ) then
    raise exception 'LEAN_L3_05_ASSERTION_FAILED: unexplained pending hold';
  end if;

  if exists (
    select 1
    from public.credit_transactions
    where user_id in (
      current_setting('lean.l3_05.mixed_actor_id')::uuid,
      current_setting('lean.l3_05.released_actor_id')::uuid,
      current_setting('lean.l3_05.blocked_actor_id')::uuid
    ) and (available_after < 0 or reserved_after < 0)
  ) then
    raise exception 'LEAN_L3_05_ASSERTION_FAILED: negative ledger snapshot';
  end if;
end;
$assert_invariants$;

-- Inspect the complete RLS/ACL surface before exercising real denial paths.
do $lean_l3_05_rls_matrix$
declare
  v_table text;
  v_signature text;
begin
  foreach v_table in array array[
    'public.credit_accounts',
    'public.credit_grants',
    'public.credit_reservations',
    'public.credit_transactions',
    'public.ai_usage_events'
  ] loop
    if has_table_privilege('anon', v_table, 'SELECT')
       or has_table_privilege('anon', v_table, 'INSERT')
       or has_table_privilege('anon', v_table, 'UPDATE')
       or has_table_privilege('anon', v_table, 'DELETE')
       or has_table_privilege('authenticated', v_table, 'SELECT')
       or has_table_privilege('authenticated', v_table, 'INSERT')
       or has_table_privilege('authenticated', v_table, 'UPDATE')
       or has_table_privilege('authenticated', v_table, 'DELETE') then
      raise exception 'LEAN_L3_05_ASSERTION_FAILED: customer table ACL %',
        v_table;
    end if;
  end loop;

  if not has_table_privilege('service_role', 'public.credit_accounts', 'SELECT')
     or not has_table_privilege('service_role', 'public.credit_accounts', 'INSERT')
     or not has_table_privilege('service_role', 'public.credit_accounts', 'UPDATE')
     or has_table_privilege('service_role', 'public.credit_accounts', 'DELETE')
     or not has_table_privilege('service_role', 'public.credit_grants', 'SELECT')
     or not has_table_privilege('service_role', 'public.credit_grants', 'INSERT')
     or not has_table_privilege('service_role', 'public.credit_grants', 'UPDATE')
     or has_table_privilege('service_role', 'public.credit_grants', 'DELETE')
     or not has_table_privilege('service_role', 'public.credit_reservations', 'SELECT')
     or not has_table_privilege('service_role', 'public.credit_reservations', 'INSERT')
     or not has_table_privilege('service_role', 'public.credit_reservations', 'UPDATE')
     or has_table_privilege('service_role', 'public.credit_reservations', 'DELETE')
     or not has_table_privilege('service_role', 'public.credit_transactions', 'SELECT')
     or not has_table_privilege('service_role', 'public.credit_transactions', 'INSERT')
     or has_table_privilege('service_role', 'public.credit_transactions', 'UPDATE')
     or has_table_privilege('service_role', 'public.credit_transactions', 'DELETE')
     or not has_table_privilege('service_role', 'public.ai_usage_events', 'SELECT')
     or not has_table_privilege('service_role', 'public.ai_usage_events', 'INSERT')
     or not has_table_privilege('service_role', 'public.ai_usage_events', 'UPDATE')
     or has_table_privilege('service_role', 'public.ai_usage_events', 'DELETE') then
    raise exception 'LEAN_L3_05_ASSERTION_FAILED: service least privilege';
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'credit_accounts', 'credit_grants', 'credit_reservations',
        'credit_transactions', 'ai_usage_events'
      )
      and (not relation.relrowsecurity or not relation.relforcerowsecurity)
  ) then
    raise exception 'LEAN_L3_05_ASSERTION_FAILED: RLS not forced';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in (
        'credit_accounts', 'credit_grants', 'credit_reservations',
        'credit_transactions', 'ai_usage_events'
      )
  ) then
    raise exception 'LEAN_L3_05_ASSERTION_FAILED: unexpected customer policy';
  end if;

  foreach v_signature in array array[
    'public.sync_monthly_credit_grant_v1(uuid,timestamptz)',
    'public.recover_stale_credit_reservations_v1(uuid,timestamptz)',
    'public.reserve_credits_v1(uuid,uuid,text,text,integer,timestamptz)',
    'public.commit_credit_reservation_v1(uuid,uuid,text,text,timestamptz)',
    'public.release_credit_reservation_v1(uuid,uuid,text,text,timestamptz)',
    'public.get_credit_wallet_v1(uuid,timestamptz,integer)'
  ] loop
    if has_function_privilege('anon', v_signature, 'EXECUTE')
       or has_function_privilege('authenticated', v_signature, 'EXECUTE')
       or not has_function_privilege('service_role', v_signature, 'EXECUTE') then
      raise exception 'LEAN_L3_05_ASSERTION_FAILED: function ACL %',
        v_signature;
    end if;
  end loop;
end;
$lean_l3_05_rls_matrix$;

set local role authenticated;
select set_config('request.jwt.claim.sub', :'mixed_actor_id', true);
select pg_temp.lean_l3_05_expect_error(
  'select * from public.credit_accounts limit 1',
  'permission denied'
);
select pg_temp.lean_l3_05_expect_error(
  format(
    'update public.credit_accounts set available_credits = 999 where user_id = %L::uuid',
    :'mixed_actor_id'
  ),
  'permission denied'
);
select pg_temp.lean_l3_05_expect_error(
  format(
    $sql$select public.get_credit_wallet_v1(
      %L::uuid, '2026-08-15 12:00:00+00'::timestamptz, 20
    )$sql$,
    :'released_actor_id'
  ),
  'permission denied'
);
select pg_temp.lean_l3_05_expect_error(
  format(
    $sql$select * from public.reserve_credits_v1(
      %L::uuid, gen_random_uuid(), %L, 'working.generate', 1,
      '2026-08-15 12:00:00+00'::timestamptz
    )$sql$,
    :'mixed_actor_id', repeat('f', 64)
  ),
  'permission denied'
);
reset role;

-- Establish three distinct account stories: committed + pending + adjustment,
-- fully released, and billing-blocked zero state.
set local role service_role;
select public.get_credit_wallet_v1(
  :'mixed_actor_id', '2026-08-15 12:00:00+00', 20
);
select public.get_credit_wallet_v1(
  :'released_actor_id', '2026-08-15 12:00:00+00', 20
);
select public.get_credit_wallet_v1(
  :'blocked_actor_id', '2026-08-15 12:00:00+00', 20
);

select result_code from public.reserve_credits_v1(
  :'mixed_actor_id', :'mixed_commit_request', repeat('a', 64),
  'working.generate', 3, '2026-08-15 12:01:00+00'
);
select result_code from public.commit_credit_reservation_v1(
  :'mixed_actor_id', :'mixed_commit_request', repeat('a', 64),
  'result-mixed-001', '2026-08-15 12:02:00+00'
);
select result_code from public.reserve_credits_v1(
  :'mixed_actor_id', :'mixed_pending_request', repeat('b', 64),
  'seven_lenses.standard', 2, '2026-08-15 12:03:00+00'
);

select result_code from public.reserve_credits_v1(
  :'released_actor_id', :'released_request', repeat('c', 64),
  'seven_lenses.long', 4, '2026-08-15 12:01:00+00'
);
select result_code from public.release_credit_reservation_v1(
  :'released_actor_id', :'released_request', repeat('c', 64),
  'PROVIDER_ERROR', '2026-08-15 12:02:00+00'
);
reset role;

select id as mixed_grant_id
from public.credit_grants
where user_id = :'mixed_actor_id' and state = 'active'
\gset

-- Append one trusted correction so the gate proves the adjustment term rather
-- than silently assuming it is always zero.
update public.credit_accounts
set available_credits = available_credits + 4,
    version = version + 1,
    updated_at = '2026-08-15 12:04:00+00'
where user_id = :'mixed_actor_id';

insert into public.credit_transactions (
  user_id, grant_id, transaction_type, event_key, event_fingerprint,
  available_delta, reserved_delta, available_after, reserved_after,
  account_version, reason_code, created_at
)
select
  account.user_id, :'mixed_grant_id', 'adjustment',
  'adjustment:' || account.user_id::text || ':phase-gate', repeat('d', 64),
  4, 0, account.available_credits, account.reserved_credits,
  account.version, 'MANUAL_CORRECTION', '2026-08-15 12:04:00+00'
from public.credit_accounts as account
where account.user_id = :'mixed_actor_id';

select pg_temp.lean_l3_05_assert_invariants(
  '2026-08-15 12:04:01+00', 1
);

do $lean_l3_05_exact_states$
begin
  if not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_05.mixed_actor_id')::uuid
      and available_credits = 9
      and reserved_credits = 2
      and version = 5
  ) or not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_05.released_actor_id')::uuid
      and available_credits = 10
      and reserved_credits = 0
      and version = 3
  ) or not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_05.blocked_actor_id')::uuid
      and available_credits = 0
      and reserved_credits = 0
      and version = 0
  ) then
    raise exception 'LEAN_L3_05_ASSERTION_FAILED: exact fixture states';
  end if;
end;
$lean_l3_05_exact_states$;

set local role service_role;
select result_code from public.release_credit_reservation_v1(
  :'mixed_actor_id', :'mixed_pending_request', repeat('b', 64),
  'MANUAL_RECOVERY', '2026-08-15 12:05:00+00'
);
reset role;

select pg_temp.lean_l3_05_assert_invariants(
  '2026-08-15 12:05:01+00', 0
);

select
  :'prismarium_target' as target,
  1 as forced_rls,
  1 as no_customer_policies,
  1 as anon_acl_denied,
  1 as authenticated_acl_denied,
  1 as service_least_privilege,
  1 as functions_service_only,
  1 as actual_read_denied,
  1 as actual_write_denied,
  1 as cross_user_rpc_denied,
  1 as reserve_rpc_denied,
  1 as authoritative_formula,
  1 as adjustment_included,
  1 as cache_matches_ledger,
  1 as pending_explained,
  1 as pending_fully_settled,
  1 as no_negative_snapshot,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id in (
    :'mixed_actor_id'::uuid,
    :'released_actor_id'::uuid,
    :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.billing_memberships where user_id in (
    :'mixed_actor_id'::uuid,
    :'released_actor_id'::uuid,
    :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.credit_accounts where user_id in (
    :'mixed_actor_id'::uuid,
    :'released_actor_id'::uuid,
    :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.credit_grants where user_id in (
    :'mixed_actor_id'::uuid,
    :'released_actor_id'::uuid,
    :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.credit_reservations where user_id in (
    :'mixed_actor_id'::uuid,
    :'released_actor_id'::uuid,
    :'blocked_actor_id'::uuid
  )) +
  (select count(*) from public.credit_transactions where user_id in (
    :'mixed_actor_id'::uuid,
    :'released_actor_id'::uuid,
    :'blocked_actor_id'::uuid
  ))
) as cleanup_residue;

\echo 'LEAN_L3_05_LOCAL_BOUNDARIES: 16/16 PASS'
\echo 'LEAN_L3_05_LOCAL_RESULT: PASS'
