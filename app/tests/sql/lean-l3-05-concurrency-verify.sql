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

do $lean_l3_05_concurrency_verify$
declare
  v_granted bigint;
  v_committed bigint;
  v_pending bigint;
  v_ledger_available bigint;
  v_ledger_reserved bigint;
  v_max_version bigint;
begin
  if not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
      and available_credits = 0
      and reserved_credits = 10
      and version = 11
  ) then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: cached account state';
  end if;

  select granted_credits into strict v_granted
  from public.credit_grants
  where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
    and state = 'active'
    and valid_from <= '2026-08-15 12:01:00+00'
    and expires_at > '2026-08-15 12:01:00+00';

  select coalesce(sum(-reserved_delta), 0) into v_committed
  from public.credit_transactions
  where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
    and transaction_type = 'commit';
  select coalesce(sum(quoted_credits), 0) into v_pending
  from public.credit_reservations
  where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
    and state = 'pending';

  if v_granted <> 10 or v_committed <> 0 or v_pending <> 10
     or v_granted - v_committed - v_pending <> 0 then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: authoritative formula';
  end if;

  if (
    select count(*) from public.credit_reservations
    where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
      and state = 'pending'
  ) <> 10 or (
    select count(*) from public.credit_transactions
    where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
      and transaction_type = 'reserve'
  ) <> 10 then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: reservation count';
  end if;

  if exists (
    select 1
    from public.credit_reservations as reservation
    where reservation.user_id = current_setting(
      'lean.l3_05.concurrent_actor_id'
    )::uuid
      and reservation.state = 'pending'
      and (
        reservation.expires_at <= '2026-08-15 12:01:00+00'
        or (
          select count(*) from public.credit_transactions as reserve_event
          where reserve_event.reservation_id = reservation.id
            and reserve_event.transaction_type = 'reserve'
        ) <> 1
        or exists (
          select 1 from public.credit_transactions as settlement
          where settlement.reservation_id = reservation.id
            and settlement.transaction_type in ('commit', 'release')
        )
      )
  ) then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: unexplained pending hold';
  end if;

  select
    coalesce(sum(available_delta), 0),
    coalesce(sum(reserved_delta), 0),
    coalesce(max(account_version), 0)
  into v_ledger_available, v_ledger_reserved, v_max_version
  from public.credit_transactions
  where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid;

  if v_ledger_available <> 0
     or v_ledger_reserved <> 10
     or v_max_version <> 11 then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: ledger invariant';
  end if;

  if exists (
    select 1 from public.credit_transactions
    where user_id = current_setting('lean.l3_05.concurrent_actor_id')::uuid
      and (available_after < 0 or reserved_after < 0)
  ) then
    raise exception 'LEAN_L3_05_CONCURRENCY_FAILED: negative snapshot';
  end if;
end;
$lean_l3_05_concurrency_verify$;

select
  20 as simultaneous_attempts,
  10 as reserved,
  10 as safely_insufficient,
  0 as available_after,
  10 as reserved_after,
  10 as explained_pending,
  'PASS' as result;

\echo 'LEAN_L3_05_CONCURRENCY_VERIFY: PASS'
