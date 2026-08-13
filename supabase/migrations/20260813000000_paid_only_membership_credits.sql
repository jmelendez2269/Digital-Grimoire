-- Reader remains free, but Prism Credits and generative actions are paid-only.
--
-- Preserve the audited L3-02 paid-period grant implementation behind a
-- service-inaccessible legacy function. The public service entry point now
-- routes only verified active paid memberships to it and retires any active
-- grant when the effective membership is Reader. Applying this migration does
-- not create a paid grant, charge money, or enable a metered action.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-paid-only-membership-credits'));

do $rename_legacy$
begin
  if to_regprocedure(
    'public.sync_monthly_credit_grant_legacy_v1(uuid,timestamptz)'
  ) is null then
    alter function public.sync_monthly_credit_grant_v1(uuid, timestamptz)
      rename to sync_monthly_credit_grant_legacy_v1;
  end if;
end;
$rename_legacy$;

revoke all on function public.sync_monthly_credit_grant_legacy_v1(
  uuid, timestamptz
) from public, anon, authenticated, service_role;

create or replace function public.sync_monthly_credit_grant_v1(
  p_user_id uuid,
  p_effective_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $paid_only_credit_sync$
declare
  v_account public.credit_accounts%rowtype;
  v_membership public.billing_memberships%rowtype;
  v_active_grant public.credit_grants%rowtype;
  v_has_membership boolean := false;
  v_is_reader boolean := false;
  v_is_paid boolean := false;
  v_is_terminal boolean := false;
  v_expire_amount integer;
  v_new_version bigint;
  v_expire_fingerprint text;
begin
  if p_user_id is null or p_effective_at is null then
    raise exception 'PAID_ONLY_CREDITS_INVALID_INPUT';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'PAID_ONLY_CREDITS_USER_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select * into v_membership
  from public.billing_memberships
  where user_id = p_user_id
  for share;
  v_has_membership := found;

  v_is_reader := not v_has_membership or (
    v_membership.plan_code = 'reader'
    and v_membership.stripe_status = 'none'
    and v_membership.pricing_cohort = 'none'
    and v_membership.offer_code is null
    and v_membership.billing_interval is null
    and v_membership.stripe_customer_id is null
    and v_membership.stripe_subscription_id is null
    and v_membership.current_period_start is null
    and v_membership.current_period_end is null
    and v_membership.access_until is null
    and v_membership.billing_hold = false
  );

  v_is_paid := v_has_membership
    and v_membership.plan_code in ('student', 'scholar', 'adept')
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
    );

  if v_is_paid then
    return public.sync_monthly_credit_grant_legacy_v1(
      p_user_id, p_effective_at
    );
  end if;

  v_is_terminal := v_has_membership
    and v_membership.plan_code in ('student', 'scholar', 'adept')
    and v_membership.stripe_status in ('canceled', 'incomplete_expired')
    and v_membership.pricing_cohort in ('founding', 'standard', 'legacy')
    and v_membership.billing_interval = 'month'
    and v_membership.stripe_customer_id is not null
    and v_membership.stripe_subscription_id is not null
    and v_membership.current_period_start is not null
    and v_membership.current_period_end is not null
    and v_membership.current_period_end > v_membership.current_period_start
    and v_membership.last_stripe_event_id is not null
    and v_membership.last_stripe_event_created is not null
    and v_membership.billing_hold = false
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
    );

  if not v_is_reader and not v_is_terminal then
    return 'blocked_billing_state';
  end if;

  insert into public.credit_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into strict v_account
  from public.credit_accounts
  where user_id = p_user_id
  for update;

  select * into v_active_grant
  from public.credit_grants
  where user_id = p_user_id and state = 'active'
  for update;

  if not found then
    if v_account.available_credits <> 0 or v_account.reserved_credits <> 0 then
      raise exception 'PAID_ONLY_CREDITS_ACCOUNTING_MISMATCH';
    end if;
    return 'reader_no_credit';
  end if;

  if v_active_grant.valid_from > p_effective_at then
    return 'blocked_future_active_grant';
  end if;
  if v_is_terminal
     and v_active_grant.source_kind = 'subscription_monthly'
     and v_active_grant.valid_from > v_membership.current_period_start then
    return 'blocked_billing_state';
  end if;
  if v_account.reserved_credits <> 0 or exists (
    select 1
    from public.credit_reservations
    where user_id = p_user_id
      and grant_id = v_active_grant.id
      and state = 'pending'
  ) then
    return 'blocked_billing_state';
  end if;

  v_expire_amount := v_account.available_credits;
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
          'reasonCode', 'PAID_ONLY_CREDITS'
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
    -v_expire_amount, 0, 0, 0, v_new_version,
    'PAID_ONLY_CREDITS', p_effective_at
  );

  return 'reader_no_credit';
end;
$paid_only_credit_sync$;

comment on function public.sync_monthly_credit_grant_v1(uuid, timestamptz) is
  'Synchronizes paid-only monthly credits from locked billing truth and retires Reader balances without accepting client plan or amount input.';

revoke all on function public.sync_monthly_credit_grant_v1(uuid, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.sync_monthly_credit_grant_v1(uuid, timestamptz)
  to service_role;

commit;
