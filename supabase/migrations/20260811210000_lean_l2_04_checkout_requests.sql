-- LEAN-L2-04: durable, service-owned Checkout request idempotency.
--
-- This ledger contains no payment or entitlement authority. It records only a
-- server-validated Checkout request and the single Stripe Session created for
-- it. Missing, pending, conflicting, or malformed state fails closed.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l2-04-checkout-requests'));

create table if not exists public.billing_checkout_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  offer_code text not null check (offer_code in (
    'student_founding_monthly',
    'student_standard_monthly',
    'scholar_monthly',
    'adept_monthly'
  )),
  request_fingerprint text not null
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  state text not null default 'pending'
    check (state in ('pending', 'session_created')),
  stripe_checkout_session_id text
    check (
      stripe_checkout_session_id is null
      or stripe_checkout_session_id ~ '^cs_(test_|live_)?[A-Za-z0-9]+$'
    ),
  checkout_url text check (
    checkout_url is null
    or checkout_url ~ '^https://'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, request_id),
  constraint billing_checkout_requests_completion_check check (
    (state = 'pending'
      and stripe_checkout_session_id is null
      and checkout_url is null)
    or
    (state = 'session_created'
      and stripe_checkout_session_id is not null
      and checkout_url is not null)
  ),
  constraint billing_checkout_requests_updated_order_check
    check (updated_at >= created_at)
);

comment on table public.billing_checkout_requests is
  'Service-owned durable Checkout idempotency ledger. It never grants membership or payment entitlement.';
comment on column public.billing_checkout_requests.request_id is
  'Customer-generated UUIDv4 scoped to one authenticated user and one exact server-resolved offer request.';
comment on column public.billing_checkout_requests.checkout_url is
  'Sensitive replay response retained only for service-owned exact request retries.';

create unique index if not exists billing_checkout_requests_session_uidx
  on public.billing_checkout_requests (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create index if not exists billing_checkout_requests_created_idx
  on public.billing_checkout_requests (created_at desc);

alter table public.billing_checkout_requests enable row level security;
alter table public.billing_checkout_requests force row level security;

revoke all on table public.billing_checkout_requests
  from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_checkout_requests
  to service_role;

commit;
