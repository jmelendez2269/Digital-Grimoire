-- LEAN-L3-02: idempotent Reader UTC-month and verified paid-period grants.
--
-- The only public entry point is service-only and reads the locked L2 billing
-- projection. It never accepts a client-selected plan, amount, source key, or
-- expiry. No grants are created by applying this migration.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l3-02-monthly-grants'));

create or replace function public.sync_monthly_credit_grant_v1(
  p_user_id uuid,
  p_effective_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $lean_l3_02_sync$
declare
  v_account public.credit_accounts%rowtype;
  v_membership public.billing_memberships%rowtype;
  v_active_grant public.credit_grants%rowtype;
  v_existing_grant public.credit_grants%rowtype;
  v_has_membership boolean := false;
  v_has_active_grant boolean := false;
  v_has_existing_grant boolean := false;
  v_target_kind text;
  v_target_plan text;
  v_target_amount integer;
  v_target_valid_from timestamptz;
  v_target_expires_at timestamptz;
  v_target_source_key text;
  v_target_fingerprint text;
  v_terminal_period_start timestamptz;
  v_expire_amount integer;
  v_expire_reason text;
  v_expire_fingerprint text;
  v_new_grant_id uuid;
  v_new_version bigint;
  v_grant_reason text;
  v_grant_fingerprint text;
begin
  if p_user_id is null or p_effective_at is null then
    raise exception 'LEAN_L3_02_INVALID_INPUT';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'LEAN_L3_02_USER_NOT_FOUND';
  end if;

  -- Use the same per-user lock as the L2 projector/reconciler so a grant never
  -- observes a half-transitioned billing projection.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  insert into public.credit_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into strict v_account
  from public.credit_accounts
  where user_id = p_user_id
  for update;

  select * into v_membership
  from public.billing_memberships
  where user_id = p_user_id
  for share;
  v_has_membership := found;

  if not v_has_membership then
    v_target_kind := 'reader_monthly';
    v_target_plan := 'reader';
    v_target_amount := 10;
  elsif v_membership.plan_code = 'reader'
        and v_membership.stripe_status = 'none'
        and v_membership.pricing_cohort = 'none'
        and v_membership.offer_code is null
        and v_membership.billing_interval is null
        and v_membership.stripe_customer_id is null
        and v_membership.stripe_subscription_id is null
        and v_membership.current_period_start is null
        and v_membership.current_period_end is null
        and v_membership.access_until is null
        and v_membership.billing_hold = false then
    v_target_kind := 'reader_monthly';
    v_target_plan := 'reader';
    v_target_amount := 10;
  elsif v_membership.plan_code in ('student', 'scholar', 'adept')
        and v_membership.stripe_status in ('active', 'trialing')
        and v_membership.pricing_cohort in ('founding', 'standard', 'legacy')
        and v_membership.billing_interval = 'month'
        and v_membership.stripe_customer_id is not null
        and v_membership.stripe_subscription_id is not null
        and v_membership.current_period_start is not null
        and v_membership.current_period_end is not null
        and v_membership.current_period_end > v_membership.current_period_start
        and v_membership.access_until is not null
        and v_membership.last_stripe_event_id is not null
        and v_membership.last_stripe_event_created is not null
        and v_membership.billing_hold = false
        and v_membership.current_period_start <= p_effective_at
        and p_effective_at < v_membership.current_period_end
        and v_membership.access_until >= v_membership.current_period_end
        and (
          (v_membership.plan_code = 'student'
            and v_membership.offer_code in (
              'student_founding_monthly', 'student_standard_monthly'
            ))
          or (v_membership.plan_code = 'scholar'
            and v_membership.offer_code = 'scholar_monthly')
          or (v_membership.plan_code = 'adept'
            and v_membership.offer_code = 'adept_monthly')
        ) then
    v_target_kind := 'subscription_monthly';
    v_target_plan := v_membership.plan_code;
    v_target_amount := case v_membership.plan_code
      when 'student' then 30
      when 'scholar' then 100
      when 'adept' then 300
    end;
    v_target_valid_from := v_membership.current_period_start;
    v_target_expires_at := v_membership.current_period_end;
  elsif v_membership.plan_code in ('student', 'scholar', 'adept')
        and v_membership.stripe_status in ('canceled', 'incomplete_expired')
        and v_membership.pricing_cohort in ('founding', 'standard', 'legacy')
        and v_membership.billing_interval = 'month'
        and v_membership.stripe_customer_id is not null
        and v_membership.stripe_subscription_id is not null
        and v_membership.billing_hold = false
        and v_membership.current_period_start is not null
        and v_membership.current_period_end is not null
        and v_membership.current_period_end > v_membership.current_period_start
        and v_membership.last_stripe_event_id is not null
        and v_membership.last_stripe_event_created is not null
        and v_membership.current_period_end <= p_effective_at
        and (
          (v_membership.plan_code = 'student'
            and v_membership.offer_code in (
              'student_founding_monthly', 'student_standard_monthly'
            ))
          or (v_membership.plan_code = 'scholar'
            and v_membership.offer_code = 'scholar_monthly')
          or (v_membership.plan_code = 'adept'
            and v_membership.offer_code = 'adept_monthly')
        ) then
    v_target_kind := 'reader_monthly';
    v_target_plan := 'reader';
    v_target_amount := 10;
    v_terminal_period_start := v_membership.current_period_start;
  else
    return 'blocked_billing_state';
  end if;

  if v_target_kind = 'reader_monthly' then
    v_target_valid_from := (
      date_trunc('month', p_effective_at at time zone 'UTC')
      at time zone 'UTC'
    );
    v_target_expires_at := v_target_valid_from + interval '1 month';
    v_target_source_key :=
      'reader:' || p_user_id::text || ':'
      || to_char(v_target_valid_from at time zone 'UTC', 'YYYY-MM');
  else
    v_target_source_key :=
      'subscription:' || v_membership.stripe_subscription_id || ':'
      || extract(epoch from v_target_valid_from)::bigint::text;
  end if;

  v_target_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'contractVersion', 1,
          'userId', p_user_id,
          'sourceKind', v_target_kind,
          'sourceKey', v_target_source_key,
          'planCode', v_target_plan,
          'grantedCredits', v_target_amount,
          'validFrom', v_target_valid_from,
          'expiresAt', v_target_expires_at
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  select * into v_active_grant
  from public.credit_grants
  where user_id = p_user_id and state = 'active'
  for update;
  v_has_active_grant := found;

  select * into v_existing_grant
  from public.credit_grants
  where source_key = v_target_source_key
  for update;
  v_has_existing_grant := found;

  if v_has_existing_grant and (
    v_existing_grant.user_id <> p_user_id
    or v_existing_grant.source_fingerprint <> v_target_fingerprint
    or v_existing_grant.source_kind <> v_target_kind
    or v_existing_grant.plan_code <> v_target_plan
    or v_existing_grant.granted_credits <> v_target_amount
    or v_existing_grant.valid_from <> v_target_valid_from
    or v_existing_grant.expires_at <> v_target_expires_at
  ) then
    raise exception 'LEAN_L3_02_GRANT_SOURCE_CONFLICT';
  end if;

  if v_has_existing_grant and v_existing_grant.state = 'active' then
    if not v_has_active_grant or v_active_grant.id <> v_existing_grant.id then
      raise exception 'LEAN_L3_02_ACTIVE_GRANT_CONFLICT';
    end if;
    return case
      when v_target_kind = 'reader_monthly' then 'duplicate_reader_grant'
      else 'duplicate_paid_grant'
    end;
  end if;

  -- Defense in depth for a delayed billing projection. L2 already rejects
  -- stale events, but an older period must never replace a newer active grant.
  if v_has_active_grant
     and v_active_grant.source_kind = 'subscription_monthly'
     and (
       (v_target_kind = 'subscription_monthly'
         and v_active_grant.valid_from > v_target_valid_from)
       or
       (v_target_kind = 'reader_monthly'
         and v_terminal_period_start is not null
         and v_active_grant.valid_from > v_terminal_period_start)
     ) then
    return 'stale_billing_projection_ignored';
  end if;

  if not v_has_active_grant
     and (v_account.available_credits <> 0
       or v_account.reserved_credits <> 0) then
    raise exception 'LEAN_L3_02_ACCOUNTING_MISMATCH';
  end if;

  if v_has_active_grant then
    if v_active_grant.valid_from > p_effective_at then
      return 'blocked_future_active_grant';
    end if;
    if v_account.reserved_credits <> 0 or exists (
      select 1
      from public.credit_reservations
      where user_id = p_user_id
        and grant_id = v_active_grant.id
        and state = 'pending'
    ) then
      raise exception 'LEAN_L3_02_PENDING_RESERVATIONS';
    end if;

    v_expire_amount := v_account.available_credits;
    v_expire_reason := case
      when v_active_grant.source_kind = 'reader_monthly'
        and v_target_kind = 'subscription_monthly'
        then 'READER_REPLACED_BY_PAID'
      when v_active_grant.source_kind = 'subscription_monthly'
        and v_target_kind = 'subscription_monthly'
        then 'PAID_PERIOD_RENEWED'
      when v_active_grant.source_kind = 'subscription_monthly'
        and v_target_kind = 'reader_monthly'
        then 'PAID_RETURNED_TO_READER'
      else 'MONTHLY_GRANT_REPLACED'
    end;
    v_new_version := v_account.version + 1;

    update public.credit_grants
    set state = 'expired', expired_at = p_effective_at
    where id = v_active_grant.id;

    update public.credit_accounts
    set available_credits = 0,
        reserved_credits = 0,
        version = v_new_version,
        updated_at = p_effective_at
    where user_id = p_user_id;

    v_expire_fingerprint := encode(
      extensions.digest(
        convert_to(
          jsonb_build_object(
            'contractVersion', 1,
            'userId', p_user_id,
            'grantId', v_active_grant.id,
            'transactionType', 'expire',
            'availableDelta', -v_expire_amount,
            'availableAfter', 0,
            'reservedAfter', 0,
            'accountVersion', v_new_version,
            'reasonCode', v_expire_reason
          )::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

    insert into public.credit_transactions (
      user_id, grant_id, transaction_type, event_key, event_fingerprint,
      available_delta, reserved_delta, available_after, reserved_after,
      account_version, reason_code, created_at
    ) values (
      p_user_id, v_active_grant.id, 'expire',
      'expire:' || v_active_grant.id::text, v_expire_fingerprint,
      -v_expire_amount, 0, 0, 0, v_new_version, v_expire_reason,
      p_effective_at
    );

    select * into strict v_account
    from public.credit_accounts
    where user_id = p_user_id;
  end if;

  -- Reader is issued at most once per UTC month even when a paid grant starts
  -- and terminates inside that same month. The prior source remains evidence.
  if v_has_existing_grant then
    return case
      when v_target_kind = 'reader_monthly' then 'reader_source_already_used'
      else 'paid_source_already_used'
    end;
  end if;

  v_new_grant_id := gen_random_uuid();
  v_new_version := v_account.version + 1;
  v_grant_reason := case
    when v_target_kind = 'reader_monthly' then 'READER_MONTHLY_GRANT'
    else 'PAID_MONTHLY_GRANT'
  end;

  insert into public.credit_grants (
    id, user_id, source_kind, source_key, source_fingerprint, plan_code,
    granted_credits, valid_from, expires_at, created_at
  ) values (
    v_new_grant_id, p_user_id, v_target_kind, v_target_source_key,
    v_target_fingerprint, v_target_plan, v_target_amount,
    v_target_valid_from, v_target_expires_at, p_effective_at
  );

  update public.credit_accounts
  set available_credits = v_target_amount,
      reserved_credits = 0,
      version = v_new_version,
      updated_at = p_effective_at
  where user_id = p_user_id;

  v_grant_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'contractVersion', 1,
          'userId', p_user_id,
          'grantId', v_new_grant_id,
          'transactionType', 'grant',
          'availableDelta', v_target_amount,
          'availableAfter', v_target_amount,
          'reservedAfter', 0,
          'accountVersion', v_new_version,
          'reasonCode', v_grant_reason
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.credit_transactions (
    user_id, grant_id, transaction_type, event_key, event_fingerprint,
    available_delta, reserved_delta, available_after, reserved_after,
    account_version, reason_code, created_at
  ) values (
    p_user_id, v_new_grant_id, 'grant',
    'grant:' || v_new_grant_id::text, v_grant_fingerprint,
    v_target_amount, 0, v_target_amount, 0, v_new_version,
    v_grant_reason, p_effective_at
  );

  return case v_target_plan
    when 'reader' then 'granted_reader'
    when 'student' then 'granted_student'
    when 'scholar' then 'granted_scholar'
    when 'adept' then 'granted_adept'
  end;
end;
$lean_l3_02_sync$;

comment on function public.sync_monthly_credit_grant_v1(uuid, timestamptz) is
  'Synchronizes one user credit grant from locked server-owned billing truth. Ambiguous state fails closed; no client amount, plan, or source is accepted.';

revoke all on function public.sync_monthly_credit_grant_v1(uuid, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.sync_monthly_credit_grant_v1(uuid, timestamptz)
  to service_role;

commit;
