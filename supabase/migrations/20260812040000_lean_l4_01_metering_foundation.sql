-- LEAN-L4-01: inert shared metering control, Reader provider-cost breaker,
-- privacy-safe request linkage, and audited server-only overrides.
--
-- Applying this migration enables no route and performs no provider call. All
-- application action modes default off in the server catalog.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l4-01-metering-foundation'));

create table if not exists public.ai_metering_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.credit_accounts(user_id)
    on delete cascade,
  request_id uuid not null,
  request_fingerprint text not null,
  action_code text not null,
  quote_version text not null,
  quoted_credits integer not null,
  mode text not null,
  plan_code text not null,
  estimated_cost_usd numeric(14, 6) not null,
  actual_cost_usd numeric(14, 6),
  cost_rate_version text not null,
  credit_reservation_id uuid,
  state text not null default 'pending',
  outcome text not null default 'pending',
  result_reference text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  expires_at timestamptz not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  constraint ai_metering_requests_id_user_key unique (id, user_id),
  constraint ai_metering_requests_user_request_key unique (user_id, request_id),
  constraint ai_metering_requests_fingerprint_check
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint ai_metering_requests_action_check check (
    length(action_code) between 1 and 64
    and action_code ~ '^[a-z][a-z0-9_.]*$'
  ),
  constraint ai_metering_requests_quote_version_check
    check (length(quote_version) between 1 and 64),
  constraint ai_metering_requests_credits_check check (quoted_credits > 0),
  constraint ai_metering_requests_mode_check check (mode in ('shadow', 'enforce')),
  constraint ai_metering_requests_plan_check
    check (plan_code in ('reader', 'student', 'scholar', 'adept')),
  constraint ai_metering_requests_cost_check check (
    estimated_cost_usd >= 0
    and (actual_cost_usd is null or actual_cost_usd >= 0)
  ),
  constraint ai_metering_requests_cost_rate_version_check
    check (length(cost_rate_version) between 1 and 64),
  constraint ai_metering_requests_credit_reservation_fkey
    foreign key (credit_reservation_id, user_id)
    references public.credit_reservations(id, user_id) on delete restrict,
  constraint ai_metering_requests_state_check
    check (state in ('pending', 'completed', 'released')),
  constraint ai_metering_requests_outcome_check check (
    outcome in (
      'pending', 'succeeded', 'provider_error', 'timeout', 'aborted',
      'moderated', 'empty', 'persistence_error', 'credit_denied',
      'control_released', 'stale'
    )
  ),
  constraint ai_metering_requests_result_reference_check check (
    result_reference is null
    or length(result_reference) between 1 and 200
  ),
  constraint ai_metering_requests_period_check check (
    period_end = period_start + interval '1 month'
    and period_end > period_start
  ),
  constraint ai_metering_requests_expiry_check check (expires_at > started_at),
  constraint ai_metering_requests_completion_check check (
    (state = 'pending' and outcome = 'pending'
      and actual_cost_usd is null and completed_at is null)
    or
    (state = 'completed' and outcome not in (
      'pending', 'credit_denied', 'control_released', 'stale'
    ) and actual_cost_usd is not null and completed_at is not null)
    or
    (state = 'released' and outcome in (
      'credit_denied', 'control_released', 'stale'
    ) and actual_cost_usd = 0 and completed_at is not null)
  ),
  constraint ai_metering_requests_completed_order_check
    check (completed_at is null or completed_at >= started_at),
  constraint ai_metering_requests_mode_credit_check check (
    mode = 'enforce' or credit_reservation_id is null
  ),
  constraint ai_metering_requests_success_reference_check check (
    outcome <> 'succeeded' or result_reference is not null
  )
);

comment on table public.ai_metering_requests is
  'Service-owned privacy-safe lifecycle for one metered action. It stores hashes, fixed quotes, controls, cost, and durable references, never prompts or responses.';
comment on column public.ai_metering_requests.estimated_cost_usd is
  'Server-catalog estimate counted while a Reader provider request is in flight.';
comment on column public.ai_metering_requests.actual_cost_usd is
  'Versioned estimated provider cost recorded after a provider attempt; not a customer price.';

create index if not exists ai_metering_requests_pending_user_action_idx
  on public.ai_metering_requests (user_id, action_code, expires_at)
  where state = 'pending';
create index if not exists ai_metering_requests_reader_period_idx
  on public.ai_metering_requests (period_start, state)
  where plan_code = 'reader';
create index if not exists ai_metering_requests_velocity_idx
  on public.ai_metering_requests (user_id, action_code, started_at desc);

create table if not exists public.reader_cost_breaker_overrides (
  id uuid primary key default gen_random_uuid(),
  amount_usd numeric(14, 6) not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  effective_from timestamptz not null,
  effective_until timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null,
  constraint reader_cost_breaker_overrides_amount_check
    check (amount_usd > 0),
  constraint reader_cost_breaker_overrides_reason_check
    check (length(reason) between 8 and 500),
  constraint reader_cost_breaker_overrides_effective_check check (
    effective_until > effective_from
    and expires_at > effective_from
    and expires_at <= effective_until
  ),
  constraint reader_cost_breaker_overrides_created_order_check
    check (created_at <= effective_until)
);

comment on table public.reader_cost_breaker_overrides is
  'Append-only service audit of temporary additive Reader provider-budget overrides, including actor, reason, amount, effective period, and expiry.';

create index if not exists reader_cost_breaker_overrides_active_idx
  on public.reader_cost_breaker_overrides (effective_from, effective_until, expires_at);

alter table public.ai_usage_events
  add column if not exists metering_request_id uuid;
alter table public.ai_usage_events
  alter column reservation_id drop not null;

do $lean_l4_01_constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_events_metering_request_user_fkey'
      and conrelid = 'public.ai_usage_events'::regclass
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_metering_request_user_fkey
      foreign key (metering_request_id, user_id)
      references public.ai_metering_requests(id, user_id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_events_lifecycle_reference_check'
      and conrelid = 'public.ai_usage_events'::regclass
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_lifecycle_reference_check
      check (metering_request_id is not null or reservation_id is not null);
  end if;
end;
$lean_l4_01_constraints$;

create unique index if not exists ai_usage_events_metering_attempt_uidx
  on public.ai_usage_events (metering_request_id, attempt_number)
  where metering_request_id is not null;

alter table public.ai_metering_requests enable row level security;
alter table public.ai_metering_requests force row level security;
alter table public.reader_cost_breaker_overrides enable row level security;
alter table public.reader_cost_breaker_overrides force row level security;

revoke all on table
  public.ai_metering_requests,
  public.reader_cost_breaker_overrides
from public, anon, authenticated, service_role;

grant select, insert, update on table public.ai_metering_requests to service_role;
grant select, insert on table public.reader_cost_breaker_overrides to service_role;

create or replace function public.begin_ai_metering_request_v1(
  p_user_id uuid,
  p_request_id uuid,
  p_request_fingerprint text,
  p_action_code text,
  p_quote_version text,
  p_quoted_credits integer,
  p_mode text,
  p_plan_code text,
  p_estimated_cost_usd numeric,
  p_cost_rate_version text,
  p_max_concurrency integer,
  p_velocity_limit integer,
  p_velocity_window_seconds integer,
  p_hold_seconds integer,
  p_reader_base_budget_usd numeric,
  p_effective_at timestamptz
)
returns table (
  result_code text,
  result_metering_request_id uuid,
  result_state text,
  result_reader_cost_usd numeric,
  result_reader_budget_usd numeric
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $lean_l4_01_begin$
declare
  v_existing public.ai_metering_requests%rowtype;
  v_sync_result text;
  v_active_plan text;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_reader_cost numeric(14, 6) := 0;
  v_reader_override numeric(14, 6) := 0;
  v_reader_budget numeric(14, 6) := p_reader_base_budget_usd;
  v_concurrency integer;
  v_velocity integer;
  v_id uuid;
begin
  if p_user_id is null
     or p_request_id is null
     or p_effective_at is null
     or p_request_fingerprint !~ '^[a-f0-9]{64}$'
     or p_action_code !~ '^[a-z][a-z0-9_.]{0,63}$'
     or p_quote_version is null or length(p_quote_version) not between 1 and 64
     or p_quoted_credits <= 0
     or p_mode not in ('shadow', 'enforce')
     or p_plan_code not in ('reader', 'student', 'scholar', 'adept')
     or p_estimated_cost_usd < 0
     or p_cost_rate_version is null
     or length(p_cost_rate_version) not between 1 and 64
     or p_max_concurrency not between 1 and 100
     or p_velocity_limit not between 1 and 1000
     or p_velocity_window_seconds not between 1 and 86400
     or p_hold_seconds not between 30 and 3600
     or p_reader_base_budget_usd < 0 then
    raise exception 'LEAN_L4_01_INVALID_BEGIN_INPUT';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  v_sync_result := public.sync_monthly_credit_grant_v1(
    p_user_id, p_effective_at
  );
  if v_sync_result in ('blocked_billing_state', 'blocked_future_active_grant') then
    result_code := 'entitlement_state_blocked';
    result_metering_request_id := null;
    result_state := null;
    result_reader_cost_usd := 0;
    result_reader_budget_usd := p_reader_base_budget_usd;
    return next;
    return;
  end if;

  select plan_code into v_active_plan
  from public.credit_grants
  where user_id = p_user_id
    and state = 'active'
    and valid_from <= p_effective_at
    and expires_at > p_effective_at;
  if v_active_plan is distinct from p_plan_code then
    raise exception 'LEAN_L4_01_PLAN_MISMATCH';
  end if;

  select * into v_existing
  from public.ai_metering_requests
  where user_id = p_user_id and request_id = p_request_id
  for update;
  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint
       or v_existing.action_code <> p_action_code
       or v_existing.quote_version <> p_quote_version
       or v_existing.quoted_credits <> p_quoted_credits
       or v_existing.mode <> p_mode
       or v_existing.plan_code <> p_plan_code
       or v_existing.estimated_cost_usd <> p_estimated_cost_usd
       or v_existing.cost_rate_version <> p_cost_rate_version then
      raise exception 'LEAN_L4_01_REQUEST_CONFLICT';
    end if;
    result_code := 'duplicate_' || v_existing.state;
    result_metering_request_id := v_existing.id;
    result_state := v_existing.state;
    result_reader_cost_usd := coalesce(v_existing.actual_cost_usd, v_existing.estimated_cost_usd);
    result_reader_budget_usd := p_reader_base_budget_usd;
    return next;
    return;
  end if;

  update public.ai_metering_requests
  set state = 'released',
      outcome = 'stale',
      actual_cost_usd = 0,
      completed_at = p_effective_at
  where user_id = p_user_id
    and state = 'pending'
    and expires_at <= p_effective_at;

  select count(*)::integer into v_concurrency
  from public.ai_metering_requests
  where user_id = p_user_id
    and action_code = p_action_code
    and state = 'pending'
    and expires_at > p_effective_at;
  if v_concurrency >= p_max_concurrency then
    result_code := 'concurrency_limited';
    result_metering_request_id := null;
    result_state := null;
    result_reader_cost_usd := 0;
    result_reader_budget_usd := p_reader_base_budget_usd;
    return next;
    return;
  end if;

  select count(*)::integer into v_velocity
  from public.ai_metering_requests
  where user_id = p_user_id
    and action_code = p_action_code
    and started_at >= p_effective_at - make_interval(secs => p_velocity_window_seconds);
  if v_velocity >= p_velocity_limit then
    result_code := 'velocity_limited';
    result_metering_request_id := null;
    result_state := null;
    result_reader_cost_usd := 0;
    result_reader_budget_usd := p_reader_base_budget_usd;
    return next;
    return;
  end if;

  v_period_start := date_trunc('month', p_effective_at at time zone 'UTC') at time zone 'UTC';
  v_period_end := v_period_start + interval '1 month';

  if p_plan_code = 'reader' then
    perform pg_advisory_xact_lock(
      pg_catalog.hashtextextended('reader-cost-breaker', 0)
    );

    select coalesce(sum(amount_usd), 0) into v_reader_override
    from public.reader_cost_breaker_overrides
    where effective_from <= p_effective_at
      and effective_until > p_effective_at
      and expires_at > p_effective_at;
    v_reader_budget := p_reader_base_budget_usd + v_reader_override;

    select coalesce(sum(
      case
        when state = 'pending' then estimated_cost_usd
        when state = 'completed' then actual_cost_usd
        else 0
      end
    ), 0) into v_reader_cost
    from public.ai_metering_requests
    where plan_code = 'reader'
      and period_start = v_period_start
      and state in ('pending', 'completed');

    if v_reader_cost + p_estimated_cost_usd > v_reader_budget then
      result_code := 'reader_budget_exceeded';
      result_metering_request_id := null;
      result_state := null;
      result_reader_cost_usd := v_reader_cost;
      result_reader_budget_usd := v_reader_budget;
      return next;
      return;
    end if;
  end if;

  insert into public.ai_metering_requests (
    user_id, request_id, request_fingerprint, action_code,
    quote_version, quoted_credits, mode, plan_code,
    estimated_cost_usd, cost_rate_version,
    period_start, period_end, expires_at, started_at
  ) values (
    p_user_id, p_request_id, p_request_fingerprint, p_action_code,
    p_quote_version, p_quoted_credits, p_mode, p_plan_code,
    p_estimated_cost_usd, p_cost_rate_version,
    v_period_start, v_period_end,
    p_effective_at + make_interval(secs => p_hold_seconds), p_effective_at
  ) returning id into v_id;

  result_code := 'started';
  result_metering_request_id := v_id;
  result_state := 'pending';
  result_reader_cost_usd := case
    when p_plan_code = 'reader' then v_reader_cost + p_estimated_cost_usd
    else 0
  end;
  result_reader_budget_usd := v_reader_budget;
  return next;
end;
$lean_l4_01_begin$;

create or replace function public.attach_ai_metering_credit_reservation_v1(
  p_user_id uuid,
  p_request_id uuid,
  p_request_fingerprint text,
  p_credit_reservation_id uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $lean_l4_01_attach$
declare
  v_request public.ai_metering_requests%rowtype;
  v_reservation public.credit_reservations%rowtype;
begin
  if p_user_id is null or p_request_id is null
     or p_credit_reservation_id is null
     or p_request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'LEAN_L4_01_INVALID_ATTACH_INPUT';
  end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  select * into v_request from public.ai_metering_requests
  where user_id = p_user_id and request_id = p_request_id
  for update;
  if not found then return 'request_not_found'; end if;
  if v_request.request_fingerprint <> p_request_fingerprint then
    raise exception 'LEAN_L4_01_REQUEST_CONFLICT';
  end if;
  if v_request.state <> 'pending' then return 'already_' || v_request.state; end if;
  if v_request.mode <> 'enforce' then
    raise exception 'LEAN_L4_01_SHADOW_CREDIT_FORBIDDEN';
  end if;

  select * into v_reservation from public.credit_reservations
  where id = p_credit_reservation_id and user_id = p_user_id
  for update;
  if not found
     or v_reservation.request_id <> p_request_id
     or v_reservation.request_fingerprint <> p_request_fingerprint
     or v_reservation.action_code <> v_request.action_code
     or v_reservation.quoted_credits <> v_request.quoted_credits then
    raise exception 'LEAN_L4_01_CREDIT_RESERVATION_MISMATCH';
  end if;
  if v_request.credit_reservation_id is not null then
    return case
      when v_request.credit_reservation_id = p_credit_reservation_id then 'duplicate_attached'
      else 'attachment_conflict'
    end;
  end if;

  update public.ai_metering_requests
  set credit_reservation_id = p_credit_reservation_id
  where id = v_request.id;
  return 'attached';
end;
$lean_l4_01_attach$;

create or replace function public.complete_ai_metering_request_v1(
  p_user_id uuid,
  p_request_id uuid,
  p_request_fingerprint text,
  p_outcome text,
  p_actual_cost_usd numeric,
  p_result_reference text,
  p_effective_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $lean_l4_01_complete$
declare
  v_request public.ai_metering_requests%rowtype;
  v_credit_state text;
begin
  if p_user_id is null or p_request_id is null or p_effective_at is null
     or p_request_fingerprint !~ '^[a-f0-9]{64}$'
     or p_outcome not in (
       'succeeded', 'provider_error', 'timeout', 'aborted', 'moderated',
       'empty', 'persistence_error'
     )
     or p_actual_cost_usd < 0
     or (p_outcome = 'succeeded' and (
       p_result_reference is null or length(p_result_reference) not between 1 and 200
     ))
     or (p_result_reference is not null and length(p_result_reference) not between 1 and 200) then
    raise exception 'LEAN_L4_01_INVALID_COMPLETE_INPUT';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select * into v_request from public.ai_metering_requests
  where user_id = p_user_id and request_id = p_request_id
  for update;
  if not found then return 'request_not_found'; end if;
  if v_request.request_fingerprint <> p_request_fingerprint then
    raise exception 'LEAN_L4_01_REQUEST_CONFLICT';
  end if;
  if v_request.plan_code = 'reader' then
    perform pg_advisory_xact_lock(
      pg_catalog.hashtextextended('reader-cost-breaker', 0)
    );
  end if;
  if v_request.state = 'completed' then
    if v_request.outcome <> p_outcome
       or v_request.actual_cost_usd <> p_actual_cost_usd
       or v_request.result_reference is distinct from p_result_reference then
      raise exception 'LEAN_L4_01_COMPLETION_CONFLICT';
    end if;
    return 'duplicate_completed';
  end if;
  if v_request.state = 'released' then return 'already_released'; end if;
  if v_request.mode = 'enforce' and v_request.credit_reservation_id is null then
    raise exception 'LEAN_L4_01_CREDIT_RESERVATION_REQUIRED';
  end if;
  if v_request.mode = 'enforce' then
    select state into v_credit_state
    from public.credit_reservations
    where id = v_request.credit_reservation_id
      and user_id = p_user_id;
    if (p_outcome = 'succeeded' and v_credit_state is distinct from 'committed')
       or (p_outcome <> 'succeeded' and v_credit_state not in ('released', 'expired')) then
      raise exception 'LEAN_L4_01_CREDIT_SETTLEMENT_MISMATCH';
    end if;
  end if;

  update public.ai_metering_requests
  set state = 'completed', outcome = p_outcome,
      actual_cost_usd = p_actual_cost_usd,
      result_reference = p_result_reference,
      completed_at = p_effective_at
  where id = v_request.id;
  return 'completed';
end;
$lean_l4_01_complete$;

create or replace function public.release_ai_metering_request_v1(
  p_user_id uuid,
  p_request_id uuid,
  p_request_fingerprint text,
  p_outcome text,
  p_effective_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $lean_l4_01_release$
declare
  v_request public.ai_metering_requests%rowtype;
begin
  if p_user_id is null or p_request_id is null or p_effective_at is null
     or p_request_fingerprint !~ '^[a-f0-9]{64}$'
     or p_outcome not in ('credit_denied', 'control_released') then
    raise exception 'LEAN_L4_01_INVALID_RELEASE_INPUT';
  end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select * into v_request from public.ai_metering_requests
  where user_id = p_user_id and request_id = p_request_id
  for update;
  if not found then return 'request_not_found'; end if;
  if v_request.request_fingerprint <> p_request_fingerprint then
    raise exception 'LEAN_L4_01_REQUEST_CONFLICT';
  end if;
  if v_request.plan_code = 'reader' then
    perform pg_advisory_xact_lock(
      pg_catalog.hashtextextended('reader-cost-breaker', 0)
    );
  end if;
  if v_request.state = 'released' then return 'duplicate_released'; end if;
  if v_request.state = 'completed' then return 'already_completed'; end if;

  update public.ai_metering_requests
  set state = 'released', outcome = p_outcome,
      actual_cost_usd = 0, completed_at = p_effective_at
  where id = v_request.id;
  return 'released';
end;
$lean_l4_01_release$;

create or replace function public.record_reader_cost_breaker_override_v1(
  p_amount_usd numeric,
  p_actor_user_id uuid,
  p_reason text,
  p_effective_from timestamptz,
  p_effective_until timestamptz,
  p_expires_at timestamptz,
  p_created_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $lean_l4_01_override$
declare
  v_id uuid;
begin
  if p_amount_usd <= 0 or p_actor_user_id is null
     or p_reason is null or length(p_reason) not between 8 and 500
     or p_effective_from is null or p_effective_until is null
     or p_expires_at is null or p_created_at is null
     or p_effective_until <= p_effective_from
     or p_expires_at <= p_effective_from
     or p_expires_at > p_effective_until
     or not exists (select 1 from auth.users where id = p_actor_user_id) then
    raise exception 'LEAN_L4_01_INVALID_OVERRIDE_INPUT';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended('reader-cost-breaker', 0)
  );
  insert into public.reader_cost_breaker_overrides (
    amount_usd, actor_user_id, reason, effective_from,
    effective_until, expires_at, created_at
  ) values (
    p_amount_usd, p_actor_user_id, p_reason, p_effective_from,
    p_effective_until, p_expires_at, p_created_at
  ) returning id into v_id;
  return v_id;
end;
$lean_l4_01_override$;

revoke all on function public.begin_ai_metering_request_v1(
  uuid, uuid, text, text, text, integer, text, text, numeric, text,
  integer, integer, integer, integer, numeric, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.attach_ai_metering_credit_reservation_v1(
  uuid, uuid, text, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.complete_ai_metering_request_v1(
  uuid, uuid, text, text, numeric, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.release_ai_metering_request_v1(
  uuid, uuid, text, text, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.record_reader_cost_breaker_override_v1(
  numeric, uuid, text, timestamptz, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated, service_role;

grant execute on function public.begin_ai_metering_request_v1(
  uuid, uuid, text, text, text, integer, text, text, numeric, text,
  integer, integer, integer, integer, numeric, timestamptz
) to service_role;
grant execute on function public.attach_ai_metering_credit_reservation_v1(
  uuid, uuid, text, uuid
) to service_role;
grant execute on function public.complete_ai_metering_request_v1(
  uuid, uuid, text, text, numeric, text, timestamptz
) to service_role;
grant execute on function public.release_ai_metering_request_v1(
  uuid, uuid, text, text, timestamptz
) to service_role;
grant execute on function public.record_reader_cost_breaker_override_v1(
  numeric, uuid, text, timestamptz, timestamptz, timestamptz, timestamptz
) to service_role;

commit;
