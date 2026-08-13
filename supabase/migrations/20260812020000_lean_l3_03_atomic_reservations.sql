-- LEAN-L3-03: atomic reserve, commit, release, and stale recovery.
--
-- These service-only functions serialize per user, synchronize the current
-- monthly grant before a new reservation, and mutate the cached account plus
-- append-only ledger in one transaction. No metered application route is
-- enabled by applying this migration.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l3-03-atomic-reservations'));

create or replace function public.recover_stale_credit_reservations_v1(
  p_user_id uuid,
  p_effective_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $lean_l3_03_recover$
declare
  v_account public.credit_accounts%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_grant_state text;
  v_new_version bigint;
  v_event_fingerprint text;
  v_recovered integer := 0;
begin
  if p_user_id is null or p_effective_at is null then
    raise exception 'LEAN_L3_03_INVALID_RECOVERY_INPUT';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'LEAN_L3_03_USER_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select * into v_account
  from public.credit_accounts
  where user_id = p_user_id
  for update;
  if not found then
    return 0;
  end if;

  for v_reservation in
    select reservation.*
    from public.credit_reservations as reservation
    where reservation.user_id = p_user_id
      and reservation.state = 'pending'
      and reservation.expires_at <= p_effective_at
    order by reservation.expires_at, reservation.id
    for update
  loop
    select state into v_grant_state
    from public.credit_grants
    where id = v_reservation.grant_id
      and user_id = p_user_id
    for update;

    if v_grant_state is distinct from 'active'
       or v_account.reserved_credits < v_reservation.quoted_credits then
      raise exception 'LEAN_L3_03_ACCOUNTING_MISMATCH';
    end if;

    v_new_version := v_account.version + 1;

    update public.credit_reservations
    set state = 'expired',
        settled_at = p_effective_at,
        updated_at = greatest(updated_at, p_effective_at)
    where id = v_reservation.id;

    update public.credit_accounts
    set available_credits = available_credits + v_reservation.quoted_credits,
        reserved_credits = reserved_credits - v_reservation.quoted_credits,
        version = v_new_version,
        updated_at = greatest(updated_at, p_effective_at)
    where user_id = p_user_id
    returning * into strict v_account;

    v_event_fingerprint := encode(
      extensions.digest(
        convert_to(
          jsonb_build_object(
            'contractVersion', 1,
            'userId', p_user_id,
            'grantId', v_reservation.grant_id,
            'reservationId', v_reservation.id,
            'transactionType', 'release',
            'availableDelta', v_reservation.quoted_credits,
            'reservedDelta', -v_reservation.quoted_credits,
            'availableAfter', v_account.available_credits,
            'reservedAfter', v_account.reserved_credits,
            'accountVersion', v_new_version,
            'reasonCode', 'STALE_RESERVATION_RECOVERED'
          )::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

    insert into public.credit_transactions (
      user_id, grant_id, reservation_id, transaction_type,
      event_key, event_fingerprint,
      available_delta, reserved_delta, available_after, reserved_after,
      account_version, reason_code, created_at
    ) values (
      p_user_id, v_reservation.grant_id, v_reservation.id, 'release',
      'reservation:' || v_reservation.id::text || ':release',
      v_event_fingerprint,
      v_reservation.quoted_credits, -v_reservation.quoted_credits,
      v_account.available_credits, v_account.reserved_credits,
      v_new_version, 'STALE_RESERVATION_RECOVERED', p_effective_at
    );

    v_recovered := v_recovered + 1;
  end loop;

  return v_recovered;
end;
$lean_l3_03_recover$;

create or replace function public.reserve_credits_v1(
  p_user_id uuid,
  p_request_id uuid,
  p_request_fingerprint text,
  p_action_code text,
  p_quoted_credits integer,
  p_effective_at timestamptz
)
returns table (
  result_code text,
  result_reservation_id uuid,
  result_state text,
  result_available integer,
  result_reserved integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $lean_l3_03_reserve$
declare
  v_sync_result text;
  v_account public.credit_accounts%rowtype;
  v_grant public.credit_grants%rowtype;
  v_existing public.credit_reservations%rowtype;
  v_reservation_id uuid;
  v_reservation_expires_at timestamptz;
  v_new_version bigint;
  v_event_fingerprint text;
begin
  if p_user_id is null
     or p_request_id is null
     or p_effective_at is null
     or p_request_fingerprint !~ '^[a-f0-9]{64}$'
     or p_action_code !~ '^[a-z][a-z0-9_.]{0,63}$'
     or p_quoted_credits <= 0 then
    raise exception 'LEAN_L3_03_INVALID_RESERVATION_INPUT';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  perform public.recover_stale_credit_reservations_v1(
    p_user_id, p_effective_at
  );

  select * into v_existing
  from public.credit_reservations
  where user_id = p_user_id and request_id = p_request_id
  for update;
  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint
       or v_existing.action_code <> p_action_code
       or v_existing.quoted_credits <> p_quoted_credits then
      raise exception 'LEAN_L3_03_REQUEST_CONFLICT';
    end if;

    select * into strict v_account
    from public.credit_accounts
    where user_id = p_user_id;

    result_code := 'duplicate_' || v_existing.state;
    result_reservation_id := v_existing.id;
    result_state := v_existing.state;
    result_available := v_account.available_credits;
    result_reserved := v_account.reserved_credits;
    return next;
    return;
  end if;

  v_sync_result := public.sync_monthly_credit_grant_v1(
    p_user_id, p_effective_at
  );
  if v_sync_result = 'blocked_billing_state'
     or v_sync_result = 'blocked_future_active_grant' then
    select * into strict v_account
    from public.credit_accounts
    where user_id = p_user_id;
    result_code := 'billing_state_blocked';
    result_reservation_id := null;
    result_state := null;
    result_available := v_account.available_credits;
    result_reserved := v_account.reserved_credits;
    return next;
    return;
  end if;

  select * into strict v_account
  from public.credit_accounts
  where user_id = p_user_id
  for update;
  select * into v_grant
  from public.credit_grants
  where user_id = p_user_id and state = 'active'
  for update;

  if not found or v_grant.expires_at <= p_effective_at then
    result_code := 'grant_unavailable';
    result_reservation_id := null;
    result_state := null;
    result_available := v_account.available_credits;
    result_reserved := v_account.reserved_credits;
    return next;
    return;
  end if;

  if v_account.available_credits < p_quoted_credits then
    result_code := 'insufficient_credits';
    result_reservation_id := null;
    result_state := null;
    result_available := v_account.available_credits;
    result_reserved := v_account.reserved_credits;
    return next;
    return;
  end if;

  v_reservation_id := gen_random_uuid();
  v_reservation_expires_at := least(
    p_effective_at + interval '10 minutes',
    v_grant.expires_at
  );
  v_new_version := v_account.version + 1;

  insert into public.credit_reservations (
    id, user_id, grant_id, request_id, request_fingerprint,
    action_code, quoted_credits, state, expires_at,
    created_at, updated_at
  ) values (
    v_reservation_id, p_user_id, v_grant.id, p_request_id,
    p_request_fingerprint, p_action_code, p_quoted_credits,
    'pending', v_reservation_expires_at, p_effective_at, p_effective_at
  );

  update public.credit_accounts
  set available_credits = available_credits - p_quoted_credits,
      reserved_credits = reserved_credits + p_quoted_credits,
      version = v_new_version,
      updated_at = greatest(updated_at, p_effective_at)
  where user_id = p_user_id
  returning * into strict v_account;

  v_event_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'contractVersion', 1,
          'userId', p_user_id,
          'grantId', v_grant.id,
          'reservationId', v_reservation_id,
          'requestId', p_request_id,
          'requestFingerprint', p_request_fingerprint,
          'actionCode', p_action_code,
          'quotedCredits', p_quoted_credits,
          'transactionType', 'reserve',
          'availableDelta', -p_quoted_credits,
          'reservedDelta', p_quoted_credits,
          'availableAfter', v_account.available_credits,
          'reservedAfter', v_account.reserved_credits,
          'accountVersion', v_new_version
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.credit_transactions (
    user_id, grant_id, reservation_id, transaction_type,
    event_key, event_fingerprint,
    available_delta, reserved_delta, available_after, reserved_after,
    account_version, reason_code, created_at
  ) values (
    p_user_id, v_grant.id, v_reservation_id, 'reserve',
    'reservation:' || v_reservation_id::text || ':reserve',
    v_event_fingerprint,
    -p_quoted_credits, p_quoted_credits,
    v_account.available_credits, v_account.reserved_credits,
    v_new_version, 'ACTION_RESERVED', p_effective_at
  );

  result_code := 'reserved';
  result_reservation_id := v_reservation_id;
  result_state := 'pending';
  result_available := v_account.available_credits;
  result_reserved := v_account.reserved_credits;
  return next;
end;
$lean_l3_03_reserve$;

create or replace function public.commit_credit_reservation_v1(
  p_user_id uuid,
  p_request_id uuid,
  p_request_fingerprint text,
  p_result_reference text,
  p_effective_at timestamptz
)
returns table (
  result_code text,
  result_reservation_id uuid,
  result_state text,
  result_available integer,
  result_reserved integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $lean_l3_03_commit$
declare
  v_reservation public.credit_reservations%rowtype;
  v_account public.credit_accounts%rowtype;
  v_new_version bigint;
  v_event_fingerprint text;
begin
  if p_user_id is null
     or p_request_id is null
     or p_effective_at is null
     or p_request_fingerprint !~ '^[a-f0-9]{64}$'
     or p_result_reference is null
     or length(p_result_reference) not between 1 and 200 then
    raise exception 'LEAN_L3_03_INVALID_COMMIT_INPUT';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select * into v_reservation
  from public.credit_reservations
  where user_id = p_user_id and request_id = p_request_id
  for update;
  if not found then
    select * into v_account from public.credit_accounts
    where user_id = p_user_id;
    result_code := 'reservation_not_found';
    result_reservation_id := null;
    result_state := null;
    result_available := coalesce(v_account.available_credits, 0);
    result_reserved := coalesce(v_account.reserved_credits, 0);
    return next;
    return;
  end if;

  if v_reservation.request_fingerprint <> p_request_fingerprint then
    raise exception 'LEAN_L3_03_REQUEST_CONFLICT';
  end if;

  if v_reservation.state = 'committed' then
    if v_reservation.result_reference is distinct from p_result_reference then
      raise exception 'LEAN_L3_03_RESULT_CONFLICT';
    end if;
    select * into strict v_account from public.credit_accounts
    where user_id = p_user_id;
    result_code := 'duplicate_committed';
    result_reservation_id := v_reservation.id;
    result_state := v_reservation.state;
    result_available := v_account.available_credits;
    result_reserved := v_account.reserved_credits;
    return next;
    return;
  elsif v_reservation.state in ('released', 'expired') then
    select * into strict v_account from public.credit_accounts
    where user_id = p_user_id;
    result_code := 'already_' || v_reservation.state;
    result_reservation_id := v_reservation.id;
    result_state := v_reservation.state;
    result_available := v_account.available_credits;
    result_reserved := v_account.reserved_credits;
    return next;
    return;
  end if;

  if v_reservation.expires_at <= p_effective_at then
    perform public.recover_stale_credit_reservations_v1(
      p_user_id, p_effective_at
    );
    select * into strict v_account from public.credit_accounts
    where user_id = p_user_id;
    result_code := 'already_expired';
    result_reservation_id := v_reservation.id;
    result_state := 'expired';
    result_available := v_account.available_credits;
    result_reserved := v_account.reserved_credits;
    return next;
    return;
  end if;

  select * into strict v_account
  from public.credit_accounts
  where user_id = p_user_id
  for update;
  if v_account.reserved_credits < v_reservation.quoted_credits then
    raise exception 'LEAN_L3_03_ACCOUNTING_MISMATCH';
  end if;

  v_new_version := v_account.version + 1;
  update public.credit_reservations
  set state = 'committed',
      settled_at = p_effective_at,
      result_reference = p_result_reference,
      updated_at = greatest(updated_at, p_effective_at)
  where id = v_reservation.id;

  update public.credit_accounts
  set reserved_credits = reserved_credits - v_reservation.quoted_credits,
      version = v_new_version,
      updated_at = greatest(updated_at, p_effective_at)
  where user_id = p_user_id
  returning * into strict v_account;

  v_event_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'contractVersion', 1,
          'userId', p_user_id,
          'grantId', v_reservation.grant_id,
          'reservationId', v_reservation.id,
          'transactionType', 'commit',
          'availableDelta', 0,
          'reservedDelta', -v_reservation.quoted_credits,
          'availableAfter', v_account.available_credits,
          'reservedAfter', v_account.reserved_credits,
          'accountVersion', v_new_version,
          'resultReference', p_result_reference
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.credit_transactions (
    user_id, grant_id, reservation_id, transaction_type,
    event_key, event_fingerprint,
    available_delta, reserved_delta, available_after, reserved_after,
    account_version, reason_code, created_at
  ) values (
    p_user_id, v_reservation.grant_id, v_reservation.id, 'commit',
    'reservation:' || v_reservation.id::text || ':commit',
    v_event_fingerprint,
    0, -v_reservation.quoted_credits,
    v_account.available_credits, v_account.reserved_credits,
    v_new_version, 'ACTION_COMMITTED', p_effective_at
  );

  result_code := 'committed';
  result_reservation_id := v_reservation.id;
  result_state := 'committed';
  result_available := v_account.available_credits;
  result_reserved := v_account.reserved_credits;
  return next;
end;
$lean_l3_03_commit$;

create or replace function public.release_credit_reservation_v1(
  p_user_id uuid,
  p_request_id uuid,
  p_request_fingerprint text,
  p_reason_code text,
  p_effective_at timestamptz
)
returns table (
  result_code text,
  result_reservation_id uuid,
  result_state text,
  result_available integer,
  result_reserved integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $lean_l3_03_release$
declare
  v_reservation public.credit_reservations%rowtype;
  v_account public.credit_accounts%rowtype;
  v_grant_state text;
  v_final_state text;
  v_final_reason text;
  v_new_version bigint;
  v_event_fingerprint text;
begin
  if p_user_id is null
     or p_request_id is null
     or p_effective_at is null
     or p_request_fingerprint !~ '^[a-f0-9]{64}$'
     or p_reason_code not in (
       'PROVIDER_ERROR', 'TIMEOUT', 'ABORTED', 'EMPTY_RESULT',
       'MODERATION_BLOCKED', 'PERSISTENCE_ERROR', 'MANUAL_RECOVERY'
     ) then
    raise exception 'LEAN_L3_03_INVALID_RELEASE_INPUT';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select * into v_reservation
  from public.credit_reservations
  where user_id = p_user_id and request_id = p_request_id
  for update;
  if not found then
    select * into v_account from public.credit_accounts
    where user_id = p_user_id;
    result_code := 'reservation_not_found';
    result_reservation_id := null;
    result_state := null;
    result_available := coalesce(v_account.available_credits, 0);
    result_reserved := coalesce(v_account.reserved_credits, 0);
    return next;
    return;
  end if;

  if v_reservation.request_fingerprint <> p_request_fingerprint then
    raise exception 'LEAN_L3_03_REQUEST_CONFLICT';
  end if;

  if v_reservation.state = 'committed' then
    select * into strict v_account from public.credit_accounts
    where user_id = p_user_id;
    result_code := 'already_committed';
    result_reservation_id := v_reservation.id;
    result_state := 'committed';
    result_available := v_account.available_credits;
    result_reserved := v_account.reserved_credits;
    return next;
    return;
  elsif v_reservation.state in ('released', 'expired') then
    select * into strict v_account from public.credit_accounts
    where user_id = p_user_id;
    result_code := 'duplicate_' || v_reservation.state;
    result_reservation_id := v_reservation.id;
    result_state := v_reservation.state;
    result_available := v_account.available_credits;
    result_reserved := v_account.reserved_credits;
    return next;
    return;
  end if;

  select state into v_grant_state
  from public.credit_grants
  where id = v_reservation.grant_id and user_id = p_user_id
  for update;
  select * into strict v_account
  from public.credit_accounts
  where user_id = p_user_id
  for update;

  if v_grant_state is distinct from 'active'
     or v_account.reserved_credits < v_reservation.quoted_credits then
    raise exception 'LEAN_L3_03_ACCOUNTING_MISMATCH';
  end if;

  if v_reservation.expires_at <= p_effective_at then
    v_final_state := 'expired';
    v_final_reason := 'STALE_RESERVATION_RECOVERED';
  else
    v_final_state := 'released';
    v_final_reason := p_reason_code;
  end if;
  v_new_version := v_account.version + 1;

  update public.credit_reservations
  set state = v_final_state,
      settled_at = p_effective_at,
      updated_at = greatest(updated_at, p_effective_at)
  where id = v_reservation.id;

  update public.credit_accounts
  set available_credits = available_credits + v_reservation.quoted_credits,
      reserved_credits = reserved_credits - v_reservation.quoted_credits,
      version = v_new_version,
      updated_at = greatest(updated_at, p_effective_at)
  where user_id = p_user_id
  returning * into strict v_account;

  v_event_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'contractVersion', 1,
          'userId', p_user_id,
          'grantId', v_reservation.grant_id,
          'reservationId', v_reservation.id,
          'transactionType', 'release',
          'availableDelta', v_reservation.quoted_credits,
          'reservedDelta', -v_reservation.quoted_credits,
          'availableAfter', v_account.available_credits,
          'reservedAfter', v_account.reserved_credits,
          'accountVersion', v_new_version,
          'reasonCode', v_final_reason
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.credit_transactions (
    user_id, grant_id, reservation_id, transaction_type,
    event_key, event_fingerprint,
    available_delta, reserved_delta, available_after, reserved_after,
    account_version, reason_code, created_at
  ) values (
    p_user_id, v_reservation.grant_id, v_reservation.id, 'release',
    'reservation:' || v_reservation.id::text || ':release',
    v_event_fingerprint,
    v_reservation.quoted_credits, -v_reservation.quoted_credits,
    v_account.available_credits, v_account.reserved_credits,
    v_new_version, v_final_reason, p_effective_at
  );

  result_code := case
    when v_final_state = 'expired' then 'expired'
    else 'released'
  end;
  result_reservation_id := v_reservation.id;
  result_state := v_final_state;
  result_available := v_account.available_credits;
  result_reserved := v_account.reserved_credits;
  return next;
end;
$lean_l3_03_release$;

comment on function public.reserve_credits_v1(
  uuid, uuid, text, text, integer, timestamptz
) is 'Atomically synchronizes the monthly grant and reserves a server-derived action quote once per user/request ID.';
comment on function public.commit_credit_reservation_v1(
  uuid, uuid, text, text, timestamptz
) is 'Commits one pending reservation exactly once at the durable-result boundary.';
comment on function public.release_credit_reservation_v1(
  uuid, uuid, text, text, timestamptz
) is 'Releases one pending reservation exactly once for a narrow server-owned failure reason.';
comment on function public.recover_stale_credit_reservations_v1(
  uuid, timestamptz
) is 'Releases every expired pending reservation for one serialized account and records compensating ledger events.';

revoke all on function public.reserve_credits_v1(
  uuid, uuid, text, text, integer, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.commit_credit_reservation_v1(
  uuid, uuid, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.release_credit_reservation_v1(
  uuid, uuid, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.recover_stale_credit_reservations_v1(
  uuid, timestamptz
) from public, anon, authenticated, service_role;

grant execute on function public.reserve_credits_v1(
  uuid, uuid, text, text, integer, timestamptz
) to service_role;
grant execute on function public.commit_credit_reservation_v1(
  uuid, uuid, text, text, timestamptz
) to service_role;
grant execute on function public.release_credit_reservation_v1(
  uuid, uuid, text, text, timestamptz
) to service_role;
grant execute on function public.recover_stale_credit_reservations_v1(
  uuid, timestamptz
) to service_role;

commit;
