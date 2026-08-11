-- LEAN-L3-04: customer-safe wallet summary and recent history projection.
--
-- The function is callable only by the service role. It accepts one server-
-- authenticated user ID, performs deterministic monthly/stale lifecycle work,
-- verifies the cached balance against the ledger, and returns a deliberately
-- narrow JSON projection. Applying this migration enables no UI or metered
-- action and creates no grant until the service explicitly requests a wallet.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l3-04-safe-wallet'));

create or replace function public.get_credit_wallet_v1(
  p_user_id uuid,
  p_effective_at timestamptz,
  p_history_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $lean_l3_04_wallet$
declare
  v_account public.credit_accounts%rowtype;
  v_grant public.credit_grants%rowtype;
  v_sync_result text;
  v_wallet_status text;
  v_pending_total bigint;
  v_latest public.credit_transactions%rowtype;
  v_pending jsonb;
  v_history jsonb;
begin
  if p_user_id is null
     or p_effective_at is null
     or p_history_limit not between 1 and 50 then
    raise exception 'LEAN_L3_04_INVALID_INPUT';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'LEAN_L3_04_USER_NOT_FOUND';
  end if;

  -- Share the L2/L3 per-user lock. A wallet read may perform only the
  -- deterministic lifecycle work already owned by L3-02/L3-03: stale-hold
  -- recovery and current monthly-grant synchronization.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );
  perform public.recover_stale_credit_reservations_v1(
    p_user_id, p_effective_at
  );
  v_sync_result := public.sync_monthly_credit_grant_v1(
    p_user_id, p_effective_at
  );
  v_wallet_status := case
    when v_sync_result in (
      'blocked_billing_state',
      'blocked_future_active_grant'
    ) then 'unavailable'
    else 'current'
  end;

  select * into strict v_account
  from public.credit_accounts
  where user_id = p_user_id
  for share;

  select * into v_grant
  from public.credit_grants
  where user_id = p_user_id
    and state = 'active'
    and valid_from <= p_effective_at
    and expires_at > p_effective_at
  for share;

  select coalesce(sum(quoted_credits), 0)
  into v_pending_total
  from public.credit_reservations
  where user_id = p_user_id and state = 'pending';

  if v_pending_total <> v_account.reserved_credits then
    raise exception 'LEAN_L3_04_ACCOUNTING_MISMATCH';
  end if;

  select * into v_latest
  from public.credit_transactions
  where user_id = p_user_id
  order by account_version desc
  limit 1;

  if v_account.version = 0 then
    if found
       or v_account.available_credits <> 0
       or v_account.reserved_credits <> 0 then
      raise exception 'LEAN_L3_04_ACCOUNTING_MISMATCH';
    end if;
  elsif not found
        or v_latest.account_version <> v_account.version
        or v_latest.available_after <> v_account.available_credits
        or v_latest.reserved_after <> v_account.reserved_credits then
    raise exception 'LEAN_L3_04_ACCOUNTING_MISMATCH';
  end if;

  select coalesce(
    jsonb_agg(pending.item order by pending.created_at, pending.id),
    '[]'::jsonb
  )
  into v_pending
  from (
    select
      jsonb_build_object(
        'actionCode', reservation.action_code,
        'credits', reservation.quoted_credits,
        'createdAt', reservation.created_at,
        'expiresAt', reservation.expires_at
      ) as item,
      reservation.created_at,
      reservation.id
    from public.credit_reservations as reservation
    where reservation.user_id = p_user_id
      and reservation.state = 'pending'
    order by reservation.created_at, reservation.id
  ) as pending;

  select coalesce(
    jsonb_agg(history.item order by history.created_at desc, history.account_version desc),
    '[]'::jsonb
  )
  into v_history
  from (
    select
      jsonb_build_object(
        'kind', case transaction.transaction_type
          when 'grant' then 'monthly_grant'
          when 'reserve' then 'credit_reserved'
          when 'commit' then 'credit_used'
          when 'release' then 'credit_returned'
          when 'expire' then 'monthly_grant_expired'
          else 'balance_adjusted'
        end,
        'credits', case transaction.transaction_type
          when 'reserve' then transaction.reserved_delta
          when 'commit' then transaction.reserved_delta
          else transaction.available_delta
        end,
        'availableAfter', transaction.available_after,
        'reservedAfter', transaction.reserved_after,
        'actionCode', reservation.action_code,
        'occurredAt', transaction.created_at
      ) as item,
      transaction.created_at,
      transaction.account_version
    from public.credit_transactions as transaction
    left join public.credit_reservations as reservation
      on reservation.id = transaction.reservation_id
      and reservation.user_id = transaction.user_id
    where transaction.user_id = p_user_id
    order by transaction.account_version desc
    limit p_history_limit
  ) as history;

  return jsonb_build_object(
    'status', v_wallet_status,
    'availableCredits', v_account.available_credits,
    'reservedCredits', v_account.reserved_credits,
    'totalCredits', v_account.available_credits + v_account.reserved_credits,
    'grant', case when v_grant.id is null then null else jsonb_build_object(
      'planCode', v_grant.plan_code,
      'grantedCredits', v_grant.granted_credits,
      'validFrom', v_grant.valid_from,
      'expiresAt', v_grant.expires_at,
      'resetsAt', v_grant.expires_at
    ) end,
    'pending', v_pending,
    'history', v_history,
    'asOf', p_effective_at
  );
end;
$lean_l3_04_wallet$;

comment on function public.get_credit_wallet_v1(uuid, timestamptz, integer) is
  'Returns one service-authenticated user wallet without internal IDs, hashes, source keys, provider data, or arbitrary metadata.';

revoke all on function public.get_credit_wallet_v1(uuid, timestamptz, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_credit_wallet_v1(uuid, timestamptz, integer)
  to service_role;

commit;
