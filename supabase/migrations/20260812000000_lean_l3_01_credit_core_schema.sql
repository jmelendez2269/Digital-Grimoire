-- LEAN-L3-01: lean monthly credit account, grant, reservation, ledger, and
-- privacy-safe usage schema.
--
-- This additive migration creates no grants, backfills no balances, enables no
-- metered action, and has no customer write path. It intentionally omits
-- purchased-credit packs, rollover, debt, and multi-grant allocation machinery.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l3-01-credit-core-schema'));

create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_credits integer not null default 0,
  reserved_credits integer not null default 0,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_accounts_available_nonnegative_check
    check (available_credits >= 0),
  constraint credit_accounts_reserved_nonnegative_check
    check (reserved_credits >= 0),
  constraint credit_accounts_version_nonnegative_check
    check (version >= 0),
  constraint credit_accounts_updated_order_check
    check (updated_at >= created_at)
);

comment on table public.credit_accounts is
  'Service-owned cached credit balance. The append-only transaction ledger remains the accounting authority.';
comment on column public.credit_accounts.available_credits is
  'Spendable credits after active reservations; never negative.';
comment on column public.credit_accounts.reserved_credits is
  'Credits held by pending reservations; never negative.';
comment on column public.credit_accounts.version is
  'Monotonic account mutation version paired with each ledger transaction.';

create table if not exists public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.credit_accounts(user_id)
    on delete cascade,
  source_kind text not null,
  source_key text not null,
  source_fingerprint text not null,
  plan_code text not null,
  granted_credits integer not null,
  valid_from timestamptz not null,
  expires_at timestamptz not null,
  state text not null default 'active',
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  constraint credit_grants_id_user_key unique (id, user_id),
  constraint credit_grants_source_kind_check
    check (source_kind in ('reader_monthly', 'subscription_monthly')),
  constraint credit_grants_source_key_check check (
    length(source_key) between 1 and 200
    and source_key ~ '^[A-Za-z0-9][A-Za-z0-9:._-]*$'
  ),
  constraint credit_grants_source_fingerprint_check
    check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint credit_grants_plan_code_check
    check (plan_code in ('reader', 'student', 'scholar', 'adept')),
  constraint credit_grants_amount_positive_check
    check (granted_credits > 0),
  constraint credit_grants_expiry_order_check
    check (expires_at > valid_from),
  constraint credit_grants_state_check
    check (state in ('active', 'expired')),
  constraint credit_grants_state_timestamp_check check (
    (state = 'active' and expired_at is null)
    or (state = 'expired' and expired_at is not null)
  ),
  constraint credit_grants_expired_order_check
    check (expired_at is null or expired_at >= valid_from),
  constraint credit_grants_source_plan_check check (
    (source_kind = 'reader_monthly' and plan_code = 'reader')
    or
    (source_kind = 'subscription_monthly'
      and plan_code in ('student', 'scholar', 'adept'))
  )
);

comment on table public.credit_grants is
  'One non-rollover monthly allowance source. Source keys are globally idempotent and only one grant may remain active per account.';
comment on column public.credit_grants.source_key is
  'Server-derived unique Reader UTC-month or verified Stripe subscription-period key.';
comment on column public.credit_grants.source_fingerprint is
  'Hash of the normalized grant inputs, used to reject a reused source key with conflicting terms.';

create unique index if not exists credit_grants_source_key_uidx
  on public.credit_grants (source_key);
create unique index if not exists credit_grants_one_active_per_user_uidx
  on public.credit_grants (user_id)
  where state = 'active';
create index if not exists credit_grants_user_expiry_idx
  on public.credit_grants (user_id, expires_at desc);

create table if not exists public.credit_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.credit_accounts(user_id)
    on delete cascade,
  grant_id uuid not null,
  request_id uuid not null,
  request_fingerprint text not null,
  action_code text not null,
  quoted_credits integer not null,
  state text not null default 'pending',
  expires_at timestamptz not null,
  settled_at timestamptz,
  result_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_reservations_id_user_key unique (id, user_id),
  constraint credit_reservations_grant_user_fkey
    foreign key (grant_id, user_id)
    references public.credit_grants(id, user_id) on delete cascade,
  constraint credit_reservations_request_fingerprint_check
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint credit_reservations_action_code_check check (
    length(action_code) between 1 and 64
    and action_code ~ '^[a-z][a-z0-9_.]*$'
  ),
  constraint credit_reservations_quoted_positive_check
    check (quoted_credits > 0),
  constraint credit_reservations_state_check
    check (state in ('pending', 'committed', 'released', 'expired')),
  constraint credit_reservations_settlement_check check (
    (state = 'pending' and settled_at is null)
    or (state <> 'pending' and settled_at is not null)
  ),
  constraint credit_reservations_expiry_order_check
    check (expires_at > created_at),
  constraint credit_reservations_settled_order_check
    check (settled_at is null or settled_at >= created_at),
  constraint credit_reservations_updated_order_check
    check (updated_at >= created_at),
  constraint credit_reservations_result_reference_check check (
    result_reference is null
    or length(result_reference) between 1 and 200
  )
);

comment on table public.credit_reservations is
  'Service-owned in-flight credit hold. One user-scoped request ID maps to one exact fingerprint, action, and quote.';
comment on column public.credit_reservations.request_fingerprint is
  'Hash of normalized server-authoritative request inputs; prompt or response text is never stored here.';

create unique index if not exists credit_reservations_user_request_uidx
  on public.credit_reservations (user_id, request_id);
create index if not exists credit_reservations_pending_expiry_idx
  on public.credit_reservations (expires_at)
  where state = 'pending';
create index if not exists credit_reservations_user_created_idx
  on public.credit_reservations (user_id, created_at desc);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.credit_accounts(user_id)
    on delete cascade,
  grant_id uuid,
  reservation_id uuid,
  transaction_type text not null,
  event_key text not null,
  event_fingerprint text not null,
  available_delta integer not null,
  reserved_delta integer not null,
  available_after integer not null,
  reserved_after integer not null,
  account_version bigint not null,
  reason_code text not null,
  created_at timestamptz not null default now(),
  constraint credit_transactions_grant_user_fkey
    foreign key (grant_id, user_id)
    references public.credit_grants(id, user_id) on delete cascade,
  constraint credit_transactions_reservation_user_fkey
    foreign key (reservation_id, user_id)
    references public.credit_reservations(id, user_id) on delete cascade,
  constraint credit_transactions_type_check check (
    transaction_type in (
      'grant', 'reserve', 'commit', 'release', 'expire', 'adjustment'
    )
  ),
  constraint credit_transactions_event_key_check check (
    length(event_key) between 1 and 200
    and event_key ~ '^[A-Za-z0-9][A-Za-z0-9:._-]*$'
  ),
  constraint credit_transactions_event_fingerprint_check
    check (event_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint credit_transactions_available_after_check
    check (available_after >= 0),
  constraint credit_transactions_reserved_after_check
    check (reserved_after >= 0),
  constraint credit_transactions_account_version_check
    check (account_version > 0),
  constraint credit_transactions_reason_code_check check (
    length(reason_code) between 1 and 64
    and reason_code ~ '^[A-Z][A-Z0-9_]*$'
  ),
  constraint credit_transactions_reference_shape_check check (
    (transaction_type in ('grant', 'expire', 'adjustment')
      and grant_id is not null and reservation_id is null)
    or
    (transaction_type in ('reserve', 'commit', 'release')
      and grant_id is not null and reservation_id is not null)
  ),
  constraint credit_transactions_delta_shape_check check (
    (transaction_type = 'grant'
      and available_delta > 0 and reserved_delta = 0)
    or
    (transaction_type = 'reserve'
      and available_delta < 0 and reserved_delta = -available_delta)
    or
    (transaction_type = 'commit'
      and available_delta = 0 and reserved_delta < 0)
    or
    (transaction_type = 'release'
      and available_delta > 0 and reserved_delta = -available_delta)
    or
    (transaction_type = 'expire'
      and available_delta <= 0 and reserved_delta = 0)
    or
    (transaction_type = 'adjustment'
      and available_delta <> 0 and reserved_delta = 0)
  )
);

comment on table public.credit_transactions is
  'Append-only service ledger. Service role may insert but cannot update or delete; corrections use a new compensating adjustment.';
comment on column public.credit_transactions.event_key is
  'Globally unique idempotency key for one normalized ledger event.';
comment on column public.credit_transactions.account_version is
  'Monotonic per-account version after this event; unique ordering prevents two events from claiming the same state.';

create unique index if not exists credit_transactions_event_key_uidx
  on public.credit_transactions (event_key);
create unique index if not exists credit_transactions_user_version_uidx
  on public.credit_transactions (user_id, account_version);
create unique index if not exists credit_transactions_grant_lifecycle_uidx
  on public.credit_transactions (grant_id, transaction_type)
  where transaction_type in ('grant', 'expire');
create unique index if not exists credit_transactions_reserve_uidx
  on public.credit_transactions (reservation_id)
  where transaction_type = 'reserve';
create unique index if not exists credit_transactions_settlement_uidx
  on public.credit_transactions (reservation_id)
  where transaction_type in ('commit', 'release');
create index if not exists credit_transactions_user_created_idx
  on public.credit_transactions (user_id, created_at desc);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.credit_accounts(user_id)
    on delete cascade,
  reservation_id uuid not null,
  attempt_number integer not null default 1,
  action_code text not null,
  plan_code text not null,
  provider text not null,
  model text not null,
  provider_request_id text,
  is_fallback boolean not null default false,
  outcome text not null default 'pending',
  input_units bigint not null default 0,
  output_units bigint not null default 0,
  latency_ms integer,
  estimated_cost_usd numeric(14, 6) not null default 0,
  cost_rate_version text not null,
  error_class text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ai_usage_events_reservation_user_fkey
    foreign key (reservation_id, user_id)
    references public.credit_reservations(id, user_id) on delete cascade,
  constraint ai_usage_events_attempt_positive_check
    check (attempt_number > 0),
  constraint ai_usage_events_action_code_check check (
    length(action_code) between 1 and 64
    and action_code ~ '^[a-z][a-z0-9_.]*$'
  ),
  constraint ai_usage_events_plan_code_check
    check (plan_code in ('reader', 'student', 'scholar', 'adept')),
  constraint ai_usage_events_provider_check
    check (length(provider) between 1 and 64),
  constraint ai_usage_events_model_check
    check (length(model) between 1 and 128),
  constraint ai_usage_events_provider_request_check
    check (provider_request_id is null or length(provider_request_id) between 1 and 200),
  constraint ai_usage_events_outcome_check check (
    outcome in (
      'pending', 'succeeded', 'provider_error', 'timeout', 'aborted',
      'moderated', 'empty', 'persistence_error'
    )
  ),
  constraint ai_usage_events_units_nonnegative_check
    check (input_units >= 0 and output_units >= 0),
  constraint ai_usage_events_latency_nonnegative_check
    check (latency_ms is null or latency_ms >= 0),
  constraint ai_usage_events_cost_nonnegative_check
    check (estimated_cost_usd >= 0),
  constraint ai_usage_events_rate_version_check
    check (length(cost_rate_version) between 1 and 64),
  constraint ai_usage_events_error_class_check check (
    error_class is null
    or (
      length(error_class) between 1 and 64
      and error_class ~ '^[A-Z][A-Z0-9_]*$'
    )
  ),
  constraint ai_usage_events_completion_check check (
    (outcome = 'pending' and completed_at is null)
    or (outcome <> 'pending' and completed_at is not null)
  ),
  constraint ai_usage_events_completed_order_check
    check (completed_at is null or completed_at >= started_at)
);

comment on table public.ai_usage_events is
  'Service-owned provider-attempt and cost telemetry. Prompt, response, email, and arbitrary customer metadata are intentionally absent.';
comment on column public.ai_usage_events.estimated_cost_usd is
  'Versioned provider-cost estimate for shadow economics and the Reader protective breaker; never a customer-submitted price.';

create unique index if not exists ai_usage_events_reservation_attempt_uidx
  on public.ai_usage_events (reservation_id, attempt_number);
create unique index if not exists ai_usage_events_provider_request_uidx
  on public.ai_usage_events (provider, provider_request_id)
  where provider_request_id is not null;
create index if not exists ai_usage_events_user_started_idx
  on public.ai_usage_events (user_id, started_at desc);
create index if not exists ai_usage_events_pending_started_idx
  on public.ai_usage_events (started_at)
  where outcome = 'pending';

alter table public.credit_accounts enable row level security;
alter table public.credit_accounts force row level security;
alter table public.credit_grants enable row level security;
alter table public.credit_grants force row level security;
alter table public.credit_reservations enable row level security;
alter table public.credit_reservations force row level security;
alter table public.credit_transactions enable row level security;
alter table public.credit_transactions force row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_usage_events force row level security;

revoke all on table
  public.credit_accounts,
  public.credit_grants,
  public.credit_reservations,
  public.credit_transactions,
  public.ai_usage_events
from public, anon, authenticated, service_role;

grant select, insert, update on table public.credit_accounts to service_role;
grant select, insert, update on table public.credit_grants to service_role;
grant select, insert, update on table public.credit_reservations to service_role;
grant select, insert on table public.credit_transactions to service_role;
grant select, insert, update on table public.ai_usage_events to service_role;

commit;
