-- LEAN-L2-02: server-owned membership projection.
--
-- This additive migration does not backfill users, enable paid access, or alter
-- the legacy public.users compatibility fields. Stripe ingestion/backfill is a
-- later packet; until then, absence of a row resolves to Reader.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l2-02-billing-memberships'));

create table if not exists public.billing_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null default 'reader'
    check (plan_code in ('reader', 'student', 'scholar', 'adept')),
  stripe_status text not null default 'none'
    check (stripe_status in (
      'none',
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'paused',
      'trialing',
      'unpaid',
      'unknown'
    )),
  pricing_cohort text not null default 'none'
    check (pricing_cohort in ('none', 'founding', 'standard', 'legacy', 'unknown')),
  offer_code text
    check (offer_code is null or offer_code in (
      'student_founding_monthly',
      'student_standard_monthly',
      'scholar_monthly',
      'adept_monthly'
    )),
  billing_interval text
    check (billing_interval is null or billing_interval = 'month'),
  stripe_customer_id text
    check (stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  stripe_subscription_id text
    check (stripe_subscription_id is null or stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  access_until timestamptz,
  billing_hold boolean not null default false,
  status_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_memberships_period_order_check check (
    current_period_start is null
    or current_period_end is null
    or current_period_end >= current_period_start
  ),
  constraint billing_memberships_updated_order_check check (updated_at >= created_at)
);

alter table public.billing_memberships
  drop constraint if exists billing_memberships_offer_plan_check;
alter table public.billing_memberships
  add constraint billing_memberships_offer_plan_check check (
    offer_code is null
    or (plan_code = 'student' and offer_code in (
      'student_founding_monthly',
      'student_standard_monthly'
    ))
    or (plan_code = 'scholar' and offer_code = 'scholar_monthly')
    or (plan_code = 'adept' and offer_code = 'adept_monthly')
  );

alter table public.billing_memberships
  drop constraint if exists billing_memberships_active_access_check;
alter table public.billing_memberships
  add constraint billing_memberships_active_access_check check (
    stripe_status not in ('active', 'trialing') or access_until is not null
  );

comment on table public.billing_memberships is
  'Service-owned billing membership projection. Missing, held, unknown, delinquent, or terminal state never grants paid entitlement.';
comment on column public.billing_memberships.plan_code is
  'Projected commercial plan, kept separate from the complete Stripe lifecycle state.';
comment on column public.billing_memberships.pricing_cohort is
  'Server-classified pricing cohort; unknown remains representable for quarantine and fails closed.';
comment on column public.billing_memberships.billing_hold is
  'Server-owned quarantine switch. True always suppresses paid entitlements.';

create unique index if not exists billing_memberships_stripe_customer_uidx
  on public.billing_memberships (stripe_customer_id)
  where stripe_customer_id is not null;
create unique index if not exists billing_memberships_stripe_subscription_uidx
  on public.billing_memberships (stripe_subscription_id)
  where stripe_subscription_id is not null;
create index if not exists billing_memberships_status_observed_idx
  on public.billing_memberships (stripe_status, status_observed_at desc);

alter table public.billing_memberships enable row level security;
alter table public.billing_memberships force row level security;

revoke all on table public.billing_memberships
  from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_memberships
  to service_role;

commit;
