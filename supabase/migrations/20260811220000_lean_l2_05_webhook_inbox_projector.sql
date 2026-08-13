-- LEAN-L2-05: signed Stripe event inbox and ordered membership projector.
--
-- The application verifies the raw Stripe signature and normalizes a narrow
-- projection. This function records one immutable event identity and applies
-- its membership state in the same transaction. Failures roll back both, so a
-- webhook retry can safely attempt the complete operation again.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l2-05-webhook-projector'));

create table if not exists public.billing_webhook_events (
  stripe_event_id text primary key
    check (stripe_event_id ~ '^evt_[A-Za-z0-9]+$'),
  event_type text not null
    check (event_type ~ '^[a-z0-9_.]+$'),
  livemode boolean not null,
  api_version text,
  stripe_created bigint not null check (stripe_created >= 0),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  disposition text not null default 'received'
    check (disposition in (
      'received', 'processed', 'quarantined', 'ignored', 'stale'
    )),
  error_code text check (
    error_code is null or error_code ~ '^[A-Z0-9_]+$'
  ),
  user_id uuid references auth.users(id) on delete set null,
  stripe_customer_id text check (
    stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'
  ),
  stripe_subscription_id text check (
    stripe_subscription_id is null or stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'
  ),
  delivery_count integer not null default 1 check (delivery_count > 0),
  received_at timestamptz not null default now(),
  last_delivery_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint billing_webhook_events_final_state_check check (
    (disposition = 'received' and processed_at is null)
    or (disposition <> 'received' and processed_at is not null)
  )
);

comment on table public.billing_webhook_events is
  'Service-owned privacy-minimized Stripe event inbox. Raw payloads and signatures are not stored.';
comment on column public.billing_webhook_events.payload_sha256 is
  'Hash of the exact verified raw payload, used to detect an event-ID payload conflict.';
comment on column public.billing_webhook_events.disposition is
  'Processed, quarantined, ignored, or stale is an explicit final outcome; received never commits alone.';

create index if not exists billing_webhook_events_subscription_idx
  on public.billing_webhook_events (stripe_subscription_id, stripe_created desc)
  where stripe_subscription_id is not null;
create index if not exists billing_webhook_events_disposition_idx
  on public.billing_webhook_events (disposition, received_at desc);

alter table public.billing_webhook_events enable row level security;
alter table public.billing_webhook_events force row level security;
revoke all on table public.billing_webhook_events
  from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_webhook_events
  to service_role;

alter table public.billing_memberships
  add column if not exists last_stripe_event_id text,
  add column if not exists last_stripe_event_created bigint;

alter table public.billing_memberships
  drop constraint if exists billing_memberships_last_event_id_check;
alter table public.billing_memberships
  add constraint billing_memberships_last_event_id_check check (
    last_stripe_event_id is null
    or last_stripe_event_id ~ '^evt_[A-Za-z0-9]+$'
  );
alter table public.billing_memberships
  drop constraint if exists billing_memberships_last_event_created_check;
alter table public.billing_memberships
  add constraint billing_memberships_last_event_created_check check (
    last_stripe_event_created is null or last_stripe_event_created >= 0
  );
alter table public.billing_memberships
  drop constraint if exists billing_memberships_last_event_pair_check;
alter table public.billing_memberships
  add constraint billing_memberships_last_event_pair_check check (
    (last_stripe_event_id is null) = (last_stripe_event_created is null)
  );

comment on column public.billing_memberships.last_stripe_event_id is
  'Last Stripe event applied to this projection; paired with its created timestamp for ordering.';
comment on column public.billing_memberships.last_stripe_event_created is
  'Stripe event.created seconds for the last applied projection. Older events never overwrite it.';

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
as $projector$
declare
  v_inserted integer;
  v_existing_event public.billing_webhook_events%rowtype;
  v_member public.billing_memberships%rowtype;
  v_has_member boolean := false;
  v_target_user uuid := p_user_id;
  v_subscription_user uuid;
  v_customer_user uuid;
  v_final_error text;
begin
  if p_kind not in ('project', 'quarantine', 'ignore') then
    raise exception 'LEAN_L2_05_INVALID_KIND';
  end if;

  insert into public.billing_webhook_events (
    stripe_event_id, event_type, livemode, api_version, stripe_created,
    payload_sha256, disposition, error_code, user_id,
    stripe_customer_id, stripe_subscription_id
  ) values (
    p_event_id, p_event_type, p_livemode, p_api_version, p_event_created,
    p_payload_sha256, 'received', null, p_user_id,
    p_stripe_customer_id, p_stripe_subscription_id
  ) on conflict (stripe_event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into strict v_existing_event
    from public.billing_webhook_events
    where stripe_event_id = p_event_id
    for update;

    update public.billing_webhook_events
    set delivery_count = delivery_count + 1,
        last_delivery_at = now()
    where stripe_event_id = p_event_id;

    if v_existing_event.payload_sha256 <> p_payload_sha256 then
      update public.billing_webhook_events
      set disposition = 'quarantined',
          error_code = 'EVENT_PAYLOAD_CONFLICT',
          processed_at = coalesce(processed_at, now())
      where stripe_event_id = p_event_id;

      update public.billing_memberships
      set billing_hold = true, updated_at = now()
      where (v_existing_event.user_id is not null
             and user_id = v_existing_event.user_id)
         or (v_existing_event.stripe_subscription_id is not null
             and stripe_subscription_id = v_existing_event.stripe_subscription_id);
      return 'quarantined_payload_conflict';
    end if;

    return 'duplicate_' || v_existing_event.disposition;
  end if;

  if p_kind = 'ignore' then
    update public.billing_webhook_events
    set disposition = 'ignored',
        error_code = coalesce(p_error_code, 'EVENT_TYPE_NOT_PROJECTED'),
        processed_at = now()
    where stripe_event_id = p_event_id;
    return 'ignored';
  end if;

  if p_stripe_subscription_id is not null then
    select user_id into v_subscription_user
    from public.billing_memberships
    where stripe_subscription_id = p_stripe_subscription_id;
  end if;
  if p_stripe_customer_id is not null then
    select user_id into v_customer_user
    from public.billing_memberships
    where stripe_customer_id = p_stripe_customer_id;
  end if;

  if v_target_user is not null
     and not exists (select 1 from auth.users where id = v_target_user) then
    v_target_user := null;
    v_final_error := 'USER_NOT_FOUND';
  end if;
  if v_target_user is null then
    v_target_user := coalesce(v_subscription_user, v_customer_user);
  end if;

  if (v_subscription_user is not null and v_subscription_user <> v_target_user)
     or (v_customer_user is not null and v_customer_user <> v_target_user)
     or (v_subscription_user is not null and v_customer_user is not null
         and v_subscription_user <> v_customer_user) then
    update public.billing_memberships
    set billing_hold = true, updated_at = now()
    where user_id in (v_subscription_user, v_customer_user, v_target_user);
    update public.billing_webhook_events
    set disposition = 'quarantined',
        error_code = 'STRIPE_IDENTITY_CONFLICT',
        processed_at = now()
    where stripe_event_id = p_event_id;
    return 'quarantined_identity_conflict';
  end if;

  if v_target_user is null then
    update public.billing_webhook_events
    set disposition = 'quarantined',
        error_code = coalesce(v_final_error, 'USER_NOT_RESOLVED'),
        processed_at = now()
    where stripe_event_id = p_event_id;
    return 'quarantined_user_not_resolved';
  end if;

  -- Serialize even the first event for a user, before a membership row exists.
  -- The row lock below then provides the same ordering guarantee thereafter.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_target_user::text, 0)
  );

  select * into v_member
  from public.billing_memberships
  where user_id = v_target_user
  for update;
  v_has_member := found;

  if v_has_member and v_member.last_stripe_event_created is not null then
    if p_event_created < v_member.last_stripe_event_created then
      update public.billing_webhook_events
      set disposition = 'stale',
          error_code = 'STALE_EVENT',
          user_id = v_target_user,
          processed_at = now()
      where stripe_event_id = p_event_id;
      return 'stale';
    end if;

    if p_event_created = v_member.last_stripe_event_created
       and p_event_id <> v_member.last_stripe_event_id then
      update public.billing_memberships
      set billing_hold = true, updated_at = now()
      where user_id = v_target_user;
      update public.billing_webhook_events
      set disposition = 'quarantined',
          error_code = 'SAME_TIMESTAMP_EVENT_CONFLICT',
          user_id = v_target_user,
          processed_at = now()
      where stripe_event_id = p_event_id;
      return 'quarantined_same_timestamp_conflict';
    end if;
  end if;

  if v_has_member and (
    (p_stripe_customer_id is not null
     and v_member.stripe_customer_id is not null
     and p_stripe_customer_id <> v_member.stripe_customer_id)
    or
    (p_stripe_subscription_id is not null
     and v_member.stripe_subscription_id is not null
     and p_stripe_subscription_id <> v_member.stripe_subscription_id
     and v_member.stripe_status not in ('canceled', 'incomplete_expired'))
  ) then
    update public.billing_memberships
    set billing_hold = true, updated_at = now()
    where user_id = v_target_user;
    update public.billing_webhook_events
    set disposition = 'quarantined',
        error_code = 'STRIPE_IDENTITY_REPLACEMENT',
        user_id = v_target_user,
        processed_at = now()
    where stripe_event_id = p_event_id;
    return 'quarantined_identity_replacement';
  end if;

  if p_kind = 'quarantine' then
    if v_has_member then
      update public.billing_memberships
      set stripe_status = 'unknown',
          pricing_cohort = 'unknown',
          offer_code = null,
          billing_interval = null,
          stripe_customer_id = coalesce(
            p_stripe_customer_id, stripe_customer_id
          ),
          stripe_subscription_id = coalesce(
            p_stripe_subscription_id, stripe_subscription_id
          ),
          billing_hold = true,
          status_observed_at = to_timestamp(p_event_created),
          last_stripe_event_id = p_event_id,
          last_stripe_event_created = p_event_created,
          updated_at = now()
      where user_id = v_target_user;
    else
      insert into public.billing_memberships (
        user_id, plan_code, stripe_status, pricing_cohort,
        stripe_customer_id, stripe_subscription_id, billing_hold,
        status_observed_at, last_stripe_event_id, last_stripe_event_created
      ) values (
        v_target_user, 'reader', 'unknown', 'unknown',
        p_stripe_customer_id, p_stripe_subscription_id, true,
        to_timestamp(p_event_created), p_event_id, p_event_created
      );
    end if;

    update public.billing_webhook_events
    set disposition = 'quarantined',
        error_code = coalesce(p_error_code, 'PROJECTION_QUARANTINED'),
        user_id = v_target_user,
        processed_at = now()
    where stripe_event_id = p_event_id;
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
    raise exception 'LEAN_L2_05_INVALID_PROJECTION';
  end if;

  insert into public.billing_memberships (
    user_id, plan_code, stripe_status, pricing_cohort, offer_code,
    billing_interval, stripe_customer_id, stripe_subscription_id,
    current_period_start, current_period_end, cancel_at_period_end,
    access_until, billing_hold, status_observed_at,
    last_stripe_event_id, last_stripe_event_created, updated_at
  ) values (
    v_target_user, p_plan_code, p_stripe_status, p_pricing_cohort, p_offer_code,
    'month', p_stripe_customer_id, p_stripe_subscription_id,
    p_current_period_start, p_current_period_end, p_cancel_at_period_end,
    p_current_period_end, false, to_timestamp(p_event_created),
    p_event_id, p_event_created, now()
  )
  on conflict (user_id) do update set
    plan_code = excluded.plan_code,
    stripe_status = excluded.stripe_status,
    pricing_cohort = excluded.pricing_cohort,
    offer_code = excluded.offer_code,
    billing_interval = excluded.billing_interval,
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    access_until = excluded.access_until,
    billing_hold = false,
    status_observed_at = excluded.status_observed_at,
    last_stripe_event_id = excluded.last_stripe_event_id,
    last_stripe_event_created = excluded.last_stripe_event_created,
    updated_at = now();

  update public.billing_webhook_events
  set disposition = 'processed',
      error_code = null,
      user_id = v_target_user,
      processed_at = now()
  where stripe_event_id = p_event_id;
  return 'processed';
end;
$projector$;

revoke all on function public.process_billing_webhook_event(
  text, text, boolean, text, bigint, text, text, text, uuid, text, text,
  text, text, text, text, timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.process_billing_webhook_event(
  text, text, boolean, text, bigint, text, text, text, uuid, text, text,
  text, text, text, text, timestamptz, timestamptz, boolean
) to service_role;

commit;
