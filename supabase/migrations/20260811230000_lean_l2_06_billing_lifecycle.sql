-- LEAN-L2-06: customer-scoped billing reconciliation and lifecycle closure.
--
-- This migration is additive and default inert. It does not contact Stripe,
-- backfill a membership, enable a paid offer, or alter saved Journal pages.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l2-06-billing-lifecycle'));

alter table public.billing_memberships
  add column if not exists last_reconciled_at timestamptz,
  add column if not exists reconciliation_event_floor bigint,
  add column if not exists last_reconciliation_fingerprint text;

alter table public.billing_memberships
  drop constraint if exists billing_memberships_reconciliation_floor_check;
alter table public.billing_memberships
  add constraint billing_memberships_reconciliation_floor_check check (
    reconciliation_event_floor is null or reconciliation_event_floor >= 0
  );
alter table public.billing_memberships
  drop constraint if exists billing_memberships_reconciliation_hash_check;
alter table public.billing_memberships
  add constraint billing_memberships_reconciliation_hash_check check (
    last_reconciliation_fingerprint is null
    or last_reconciliation_fingerprint ~ '^[a-f0-9]{64}$'
  );
alter table public.billing_memberships
  drop constraint if exists billing_memberships_reconciliation_pair_check;
alter table public.billing_memberships
  add constraint billing_memberships_reconciliation_pair_check check (
    (last_reconciled_at is null)
    = (reconciliation_event_floor is null)
    and (last_reconciled_at is null)
    = (last_reconciliation_fingerprint is null)
  );

comment on column public.billing_memberships.reconciliation_event_floor is
  'Stripe event.created floor established by an exact Subscription retrieval. Older delayed webhook state cannot overwrite it.';

create table if not exists public.billing_reconciliation_requests (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_sha256 text not null check (snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  disposition text not null default 'received'
    check (disposition in ('received', 'in_sync', 'updated', 'quarantined')),
  error_code text check (
    error_code is null or error_code ~ '^[A-Z0-9_]+$'
  ),
  checked_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint billing_reconciliation_requests_final_check check (
    (disposition = 'received' and processed_at is null)
    or (disposition <> 'received' and processed_at is not null)
  )
);

create index if not exists billing_reconciliation_user_checked_idx
  on public.billing_reconciliation_requests (user_id, checked_at desc);

alter table public.billing_reconciliation_requests enable row level security;
alter table public.billing_reconciliation_requests force row level security;
revoke all on table public.billing_reconciliation_requests
  from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_reconciliation_requests
  to service_role;

-- Preserve the L2-05 projector as the core implementation, then wrap its
-- public entry point with the reconciliation floor check. The conditional
-- rename keeps local verification reruns idempotent.
do $rename_l2_05_projector$
begin
  if to_regprocedure(
    'public.process_billing_webhook_event_l2_05_core(text,text,boolean,text,bigint,text,text,text,uuid,text,text,text,text,text,text,timestamptz,timestamptz,boolean)'
  ) is null then
    alter function public.process_billing_webhook_event(
      text, text, boolean, text, bigint, text, text, text, uuid, text, text,
      text, text, text, text, timestamptz, timestamptz, boolean
    ) rename to process_billing_webhook_event_l2_05_core;
  end if;
end;
$rename_l2_05_projector$;

create or replace function public.process_billing_webhook_event(
  p_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_api_version text,
  p_event_created bigint,
  p_payload_sha256 text,
  p_kind text,
  p_error_code text,
  p_user_id uuid,
  p_plan_code text,
  p_pricing_cohort text,
  p_offer_code text,
  p_stripe_status text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $l2_06_webhook_floor$
declare
  v_floor bigint;
begin
  if p_kind not in ('project', 'quarantine', 'ignore') then
    raise exception 'LEAN_L2_05_INVALID_KIND';
  end if;

  if p_user_id is not null then
    perform pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_user_id::text, 0)
    );

    -- Existing event IDs still go through the L2-05 core so duplicate and
    -- payload-conflict behavior remains exact.
    if not exists (
      select 1 from public.billing_webhook_events
      where stripe_event_id = p_event_id
    ) then
      select reconciliation_event_floor into v_floor
      from public.billing_memberships
      where user_id = p_user_id
      for update;

      if v_floor is not null and p_event_created <= v_floor then
        insert into public.billing_webhook_events (
          stripe_event_id, event_type, livemode, api_version, stripe_created,
          payload_sha256, disposition, error_code, user_id,
          stripe_customer_id, stripe_subscription_id, processed_at
        ) values (
          p_event_id, p_event_type, p_livemode, p_api_version, p_event_created,
          p_payload_sha256, 'stale', 'STALE_AFTER_RECONCILIATION', p_user_id,
          p_stripe_customer_id, p_stripe_subscription_id, now()
        );
        return 'stale_after_reconciliation';
      end if;
    end if;
  end if;

  return public.process_billing_webhook_event_l2_05_core(
    p_event_id, p_event_type, p_livemode, p_api_version, p_event_created,
    p_payload_sha256, p_kind, p_error_code, p_user_id, p_plan_code,
    p_pricing_cohort, p_offer_code, p_stripe_status, p_stripe_customer_id,
    p_stripe_subscription_id, p_current_period_start, p_current_period_end,
    p_cancel_at_period_end
  );
end;
$l2_06_webhook_floor$;

create or replace function public.reconcile_billing_membership_snapshot_v1(
  p_request_id uuid,
  p_user_id uuid,
  p_retrieved_at bigint,
  p_snapshot_sha256 text,
  p_kind text,
  p_error_code text,
  p_plan_code text,
  p_pricing_cohort text,
  p_offer_code text,
  p_stripe_status text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $l2_06_reconcile$
declare
  v_inserted integer;
  v_existing public.billing_reconciliation_requests%rowtype;
  v_member public.billing_memberships%rowtype;
  v_disposition text;
begin
  if p_request_id is null
     or p_user_id is null
     or p_retrieved_at < 0
     or p_snapshot_sha256 !~ '^[a-f0-9]{64}$'
     or p_kind not in ('project', 'quarantine') then
    raise exception 'LEAN_L2_06_INVALID_RECONCILIATION';
  end if;

  insert into public.billing_reconciliation_requests (
    request_id, user_id, snapshot_sha256
  ) values (
    p_request_id, p_user_id, p_snapshot_sha256
  ) on conflict (request_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into strict v_existing
    from public.billing_reconciliation_requests
    where request_id = p_request_id
    for update;
    if v_existing.user_id <> p_user_id
       or v_existing.snapshot_sha256 <> p_snapshot_sha256 then
      raise exception 'LEAN_L2_06_RECONCILIATION_REQUEST_CONFLICT';
    end if;
    return 'duplicate_' || v_existing.disposition;
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );
  select * into v_member
  from public.billing_memberships
  where user_id = p_user_id
  for update;
  if not found then
    raise exception 'LEAN_L2_06_MEMBERSHIP_NOT_FOUND';
  end if;

  if p_kind = 'quarantine'
     or p_stripe_customer_id is distinct from v_member.stripe_customer_id
     or p_stripe_subscription_id is distinct from v_member.stripe_subscription_id then
    update public.billing_memberships
    set billing_hold = true, updated_at = now()
    where user_id = p_user_id;
    update public.billing_reconciliation_requests
    set disposition = 'quarantined',
        error_code = coalesce(p_error_code, 'RECONCILIATION_QUARANTINED'),
        processed_at = now()
    where request_id = p_request_id;
    return 'quarantined';
  end if;

  if p_plan_code not in ('student', 'scholar', 'adept')
     or p_pricing_cohort not in ('founding', 'standard', 'legacy')
     or p_offer_code is null
     or p_stripe_status not in (
       'active', 'canceled', 'incomplete', 'incomplete_expired',
       'past_due', 'paused', 'trialing', 'unpaid'
     )
     or p_stripe_customer_id is null
     or p_stripe_subscription_id is null
     or p_current_period_start is null
     or p_current_period_end is null
     or p_current_period_end < p_current_period_start
     or p_cancel_at_period_end is null then
    raise exception 'LEAN_L2_06_INVALID_PROJECTION';
  end if;

  v_disposition := case when
    v_member.plan_code is not distinct from p_plan_code
    and v_member.pricing_cohort is not distinct from p_pricing_cohort
    and v_member.offer_code is not distinct from p_offer_code
    and v_member.stripe_status is not distinct from p_stripe_status
    and v_member.current_period_start is not distinct from p_current_period_start
    and v_member.current_period_end is not distinct from p_current_period_end
    and v_member.cancel_at_period_end is not distinct from p_cancel_at_period_end
    and v_member.billing_hold = false
    then 'in_sync' else 'updated' end;

  update public.billing_memberships
  set plan_code = p_plan_code,
      stripe_status = p_stripe_status,
      pricing_cohort = p_pricing_cohort,
      offer_code = p_offer_code,
      billing_interval = 'month',
      current_period_start = p_current_period_start,
      current_period_end = p_current_period_end,
      cancel_at_period_end = p_cancel_at_period_end,
      access_until = p_current_period_end,
      billing_hold = false,
      status_observed_at = to_timestamp(p_retrieved_at),
      last_reconciled_at = to_timestamp(p_retrieved_at),
      reconciliation_event_floor = p_retrieved_at,
      last_reconciliation_fingerprint = p_snapshot_sha256,
      updated_at = now()
  where user_id = p_user_id;

  update public.billing_reconciliation_requests
  set disposition = v_disposition, error_code = null, processed_at = now()
  where request_id = p_request_id;
  return v_disposition;
end;
$l2_06_reconcile$;

revoke all on function public.process_billing_webhook_event_l2_05_core(
  text, text, boolean, text, bigint, text, text, text, uuid, text, text,
  text, text, text, text, timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.process_billing_webhook_event_l2_05_core(
  text, text, boolean, text, bigint, text, text, text, uuid, text, text,
  text, text, text, text, timestamptz, timestamptz, boolean
) to service_role;
revoke all on function public.process_billing_webhook_event(
  text, text, boolean, text, bigint, text, text, text, uuid, text, text,
  text, text, text, text, timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.process_billing_webhook_event(
  text, text, boolean, text, bigint, text, text, text, uuid, text, text,
  text, text, text, text, timestamptz, timestamptz, boolean
) to service_role;
revoke all on function public.reconcile_billing_membership_snapshot_v1(
  uuid, uuid, bigint, text, text, text, text, text, text, text, text, text,
  timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.reconcile_billing_membership_snapshot_v1(
  uuid, uuid, bigint, text, text, text, text, text, text, text, text, text,
  timestamptz, timestamptz, boolean
) to service_role;

-- The Reader Journal cap now consumes the same server-owned billing truth as
-- course entitlement. A downgrade never mutates an existing page; only a new
-- active page or restoration needs a slot.
create or replace function public.enforce_journal_active_page_limit_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $lean_l2_06_journal_limit$
declare
  v_role text;
  v_paid_entitlement boolean := false;
  v_active_count integer;
  v_needs_slot boolean;
begin
  v_needs_slot := tg_op = 'INSERT'
    and new.is_archived is not true
    or tg_op = 'UPDATE'
      and old.is_archived is true
      and new.is_archived is not true;

  if not v_needs_slot then return new; end if;

  select account.role into v_role
  from public.users as account
  where account.id = new.user_id;
  if v_role = 'admin' then return new; end if;

  select exists (
    select 1 from public.billing_memberships as membership
    where membership.user_id = new.user_id
      and membership.plan_code in ('student', 'scholar', 'adept')
      and membership.stripe_status in ('active', 'trialing')
      and membership.billing_hold = false
      and membership.access_until > now()
  ) into v_paid_entitlement;
  if v_paid_entitlement then return new; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('lean-l1-03-journal-limit:' || new.user_id::text, 0)
  );
  select count(*)::integer into v_active_count
  from public.journal_pages as page
  where page.user_id = new.user_id
    and page.is_archived is not true;

  if v_active_count >= 50 then
    raise exception using
      errcode = '42501',
      message = 'LEAN_L1_03:JOURNAL_LIMIT_REACHED';
  end if;
  return new;
end;
$lean_l2_06_journal_limit$;

revoke all on function public.enforce_journal_active_page_limit_v1()
  from public, anon, authenticated;

commit;
