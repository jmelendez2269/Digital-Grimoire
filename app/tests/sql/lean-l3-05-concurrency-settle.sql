\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L3_05_CONCURRENCY_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif
\if :{?actor_id}
\else
  \echo 'LEAN_L3_05_CONCURRENCY_GUARD_FAILED: actor_id is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as target_allowed \gset
\if :target_allowed
\else
  \echo 'LEAN_L3_05_CONCURRENCY_GUARD_FAILED: local target required'
  \quit 2
\endif

select set_config('lean.l3_05.concurrent_actor_id', :'actor_id', false);

begin;
set local role service_role;
do $lean_l3_05_release_all$
declare
  v_reservation public.credit_reservations%rowtype;
  v_result text;
begin
  for v_reservation in
    select * from public.credit_reservations
    where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
      and state = 'pending'
    order by created_at, id
  loop
    select result_code into strict v_result
    from public.release_credit_reservation_v1(
      v_reservation.user_id,
      v_reservation.request_id,
      v_reservation.request_fingerprint,
      'MANUAL_RECOVERY',
      '2026-08-15 12:01:00+00'
    );
    if v_result <> 'released' then
      raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: settlement %', v_result;
    end if;
  end loop;
end;
$lean_l3_05_release_all$;
reset role;
commit;

do $lean_l3_05_settlement_verify$
declare
  v_granted bigint;
  v_adjustments bigint;
  v_committed bigint;
  v_pending bigint;
  v_ledger_available bigint;
  v_ledger_reserved bigint;
  v_max_version bigint;
begin
  if not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
      and available_credits = 10
      and reserved_credits = 0
      and version = 21
  ) then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: settled account state';
  end if;

  if exists (
    select 1 from public.credit_reservations
    where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
      and state = 'pending'
  ) or (
    select count(*) from public.credit_reservations
    where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
      and state = 'released'
  ) <> 10 then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: pending settlement';
  end if;

  if exists (
    select reservation.id
    from public.credit_reservations as reservation
    left join public.credit_transactions as settlement
      on settlement.reservation_id = reservation.id
      and settlement.transaction_type in ('commit', 'release')
    where reservation.user_id = current_setting(
      'lean.l3_05.concurrent_actor_id'
    )::uuid
    group by reservation.id
    having count(settlement.id) <> 1
  ) then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: settlement count';
  end if;

  select granted_credits into strict v_granted
  from public.credit_grants
  where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
    and state = 'active';
  select coalesce(sum(available_delta), 0) into v_adjustments
  from public.credit_transactions
  where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
    and transaction_type = 'adjustment';
  select coalesce(sum(-reserved_delta), 0) into v_committed
  from public.credit_transactions
  where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
    and transaction_type = 'commit';
  select coalesce(sum(quoted_credits), 0) into v_pending
  from public.credit_reservations
  where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
    and state = 'pending';

  if v_granted + v_adjustments - v_committed - v_pending <> 10 then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: settled formula';
  end if;

  select
    coalesce(sum(available_delta), 0),
    coalesce(sum(reserved_delta), 0),
    coalesce(max(account_version), 0)
  into v_ledger_available, v_ledger_reserved, v_max_version
  from public.credit_transactions
  where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid;

  if v_ledger_available <> 10
     or v_ledger_reserved <> 0
     or v_max_version <> 21 then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: settled ledger';
  end if;
end;
$lean_l3_05_settlement_verify$;

select
  10 as reservations_settled,
  0 as unexplained_pending,
  10 as available_after,
  0 as reserved_after,
  'PASS' as result;

\echo 'LEAN_L3_05_CONCURRENCY_SETTLE: PASS'
