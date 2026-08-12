\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L3_02_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l3_02_target_allowed \gset
\if :lean_l3_02_target_allowed
\else
  \echo 'LEAN_L3_02_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select
  gen_random_uuid() as actor_id,
  gen_random_uuid() as returning_id,
  gen_random_uuid() as scholar_id,
  gen_random_uuid() as adept_id,
  gen_random_uuid() as blocked_id,
  gen_random_uuid() as unverified_id
\gset

select
  'lean-l3-02-a-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email,
  'lean-l3-02-b-' || replace(:'run_id', '-', '') || '@example.invalid' as returning_email,
  'lean-l3-02-c-' || replace(:'run_id', '-', '') || '@example.invalid' as scholar_email,
  'lean-l3-02-d-' || replace(:'run_id', '-', '') || '@example.invalid' as adept_email,
  'lean-l3-02-e-' || replace(:'run_id', '-', '') || '@example.invalid' as blocked_email,
  'lean-l3-02-f-' || replace(:'run_id', '-', '') || '@example.invalid' as unverified_email
\gset

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-02 actor"}'::jsonb, now(), now()
),
(
  :'returning_id', 'authenticated', 'authenticated', :'returning_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-02 returning"}'::jsonb, now(), now()
),
(
  :'scholar_id', 'authenticated', 'authenticated', :'scholar_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-02 scholar"}'::jsonb, now(), now()
),
(
  :'adept_id', 'authenticated', 'authenticated', :'adept_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-02 adept"}'::jsonb, now(), now()
),
(
  :'blocked_id', 'authenticated', 'authenticated', :'blocked_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-02 blocked"}'::jsonb, now(), now()
),
(
  :'unverified_id', 'authenticated', 'authenticated', :'unverified_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-02 unverified"}'::jsonb, now(), now()
);

select set_config('lean.l3_02.actor_id', :'actor_id', true);
select set_config('lean.l3_02.returning_id', :'returning_id', true);
select set_config('lean.l3_02.scholar_id', :'scholar_id', true);
select set_config('lean.l3_02.adept_id', :'adept_id', true);
select set_config('lean.l3_02.blocked_id', :'blocked_id', true);
select set_config('lean.l3_02.unverified_id', :'unverified_id', true);

create or replace function pg_temp.lean_l3_02_assert_equal(
  p_actual text,
  p_expected text,
  p_marker text
)
returns void
language plpgsql
as $assert_equal$
begin
  if p_actual is distinct from p_expected then
    raise exception
      'LEAN_L3_02_ASSERTION_FAILED: % expected %, got %',
      p_marker, p_expected, p_actual;
  end if;
end;
$assert_equal$;

create or replace function pg_temp.lean_l3_02_expect_error(
  p_sql text,
  p_marker text
)
returns void
language plpgsql
as $expect_error$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_marker in sqlerrm) > 0 then
      return;
    end if;
    raise;
  end;

  raise exception 'LEAN_L3_02_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $lean_l3_02_authority$
begin
  if has_function_privilege(
    'anon',
    'public.sync_monthly_credit_grant_v1(uuid,timestamptz)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.sync_monthly_credit_grant_v1(uuid,timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: customer execute exists';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.sync_monthly_credit_grant_v1(uuid,timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: service execute missing';
  end if;
end;
$lean_l3_02_authority$;

set local role authenticated;
select pg_temp.lean_l3_02_expect_error(
  format(
    'select public.sync_monthly_credit_grant_v1(%L::uuid, %L::timestamptz)',
    :'actor_id', '2026-08-31 23:59:59+00'
  ),
  'permission denied'
);
reset role;

-- Reader receives ten once for the August UTC source.
set local role service_role;
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-08-31 23:59:59+00'
  ),
  'granted_reader',
  'initial Reader grant'
);
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-08-31 23:59:59+00'
  ),
  'duplicate_reader_grant',
  'Reader replay'
);
reset role;

select id as actor_reader_grant_id
from public.credit_grants
where user_id = :'actor_id'
  and source_key = 'reader:' || :'actor_id' || ':2026-08'
\gset

select set_config(
  'lean.l3_02.actor_reader_grant_id', :'actor_reader_grant_id', true
);

-- Simulate six credits already consumed so activation proves that only the
-- four remaining Reader credits expire before the full paid allowance lands.
set local role service_role;
insert into public.credit_transactions (
  user_id, grant_id, transaction_type, event_key, event_fingerprint,
  available_delta, reserved_delta, available_after, reserved_after,
  account_version, reason_code, created_at
) values (
  :'actor_id', :'actor_reader_grant_id', 'adjustment',
  'adjustment:lean-l3-02:' || :'run_id', repeat('a', 64),
  -6, 0, 4, 0, 2, 'TEST_CONSUMPTION', '2026-08-31 23:59:59+00'
);
update public.credit_accounts
set available_credits = 4, version = 2,
    updated_at = '2026-08-31 23:59:59+00'
where user_id = :'actor_id';

insert into public.billing_memberships (
  user_id, plan_code, stripe_status, pricing_cohort, offer_code,
  billing_interval, stripe_customer_id, stripe_subscription_id,
  current_period_start, current_period_end, cancel_at_period_end,
  access_until, billing_hold, last_stripe_event_id,
  last_stripe_event_created
) values (
  :'actor_id', 'student', 'active', 'founding',
  'student_founding_monthly', 'month',
  'cus_leanL302Actor', 'sub_leanL302Actor',
  '2026-08-20 00:00:00+00', '2026-09-20 00:00:00+00', false,
  '2026-09-20 00:00:00+00', false, 'evt_leanL302Actor1', 1787184000
);

select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-08-31 23:59:59+00'
  ),
  'granted_student',
  'Reader to Student activation'
);
reset role;

do $lean_l3_02_activation$
declare
  v_account public.credit_accounts%rowtype;
begin
  select * into strict v_account from public.credit_accounts
  where user_id = current_setting('lean.l3_02.actor_id')::uuid;
  if v_account.available_credits <> 30
     or v_account.reserved_credits <> 0
     or v_account.version <> 4 then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: activation balance/version';
  end if;
  if not exists (
    select 1 from public.credit_grants
    where id = current_setting('lean.l3_02.actor_reader_grant_id')::uuid
      and state = 'expired'
  ) or not exists (
    select 1 from public.credit_transactions
    where grant_id = current_setting(
      'lean.l3_02.actor_reader_grant_id'
    )::uuid
      and transaction_type = 'expire'
      and available_delta = -4
      and reason_code = 'READER_REPLACED_BY_PAID'
  ) then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: Reader remainder not expired';
  end if;
end;
$lean_l3_02_activation$;

-- Replay and cancel-at-period-end preserve the same paid grant and balance.
set local role service_role;
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-09-01 00:00:00+00'
  ),
  'duplicate_paid_grant',
  'paid replay'
);
update public.billing_memberships
set cancel_at_period_end = true, updated_at = now()
where user_id = :'actor_id';
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-09-01 00:00:00+00'
  ),
  'duplicate_paid_grant',
  'cancel at period end preservation'
);

-- Renewal expires the old remainder and grants exactly 30, never 60.
update public.billing_memberships
set stripe_status = 'active',
    current_period_start = '2026-09-20 00:00:00+00',
    current_period_end = '2026-10-20 00:00:00+00',
    access_until = '2026-10-20 00:00:00+00',
    cancel_at_period_end = false,
    last_stripe_event_id = 'evt_leanL302Actor2',
    last_stripe_event_created = 1789862400,
    updated_at = now()
where user_id = :'actor_id';
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-09-20 00:00:00+00'
  ),
  'granted_student',
  'paid renewal'
);
reset role;

do $lean_l3_02_renewal$
begin
  if not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_02.actor_id')::uuid
      and available_credits = 30
      and reserved_credits = 0
      and version = 6
  ) or (
    select count(*) from public.credit_grants
    where user_id = current_setting('lean.l3_02.actor_id')::uuid
      and source_kind = 'subscription_monthly'
      and granted_credits = 30
  ) <> 2 or (
    select count(*) from public.credit_grants
    where user_id = current_setting('lean.l3_02.actor_id')::uuid
      and state = 'active'
  ) <> 1 then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: renewal rolled over or duplicated';
  end if;
end;
$lean_l3_02_renewal$;

-- An older delayed projection cannot replace the newer active paid period.
set local role service_role;
update public.billing_memberships
set current_period_start = '2026-08-20 00:00:00+00',
    current_period_end = '2026-09-20 00:00:00+00',
    access_until = '2026-09-20 00:00:00+00',
    last_stripe_event_id = 'evt_leanL302ActorDelayed',
    last_stripe_event_created = 1787184001,
    updated_at = now()
where user_id = :'actor_id';
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-09-19 23:59:59+00'
  ),
  'stale_billing_projection_ignored',
  'delayed older paid period'
);

-- Restore the current projection, then prove terminal state is early-blocked
-- and becomes Reader only at the verified period end.
update public.billing_memberships
set stripe_status = 'canceled',
    current_period_start = '2026-09-20 00:00:00+00',
    current_period_end = '2026-10-20 00:00:00+00',
    access_until = '2026-10-20 00:00:00+00',
    last_stripe_event_id = 'evt_leanL302ActorTerminal',
    last_stripe_event_created = 1792454400,
    updated_at = now()
where user_id = :'actor_id';
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-10-19 23:59:59+00'
  ),
  'blocked_billing_state',
  'terminal state before period end'
);
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-10-20 00:00:00+00'
  ),
  'granted_reader',
  'terminal return to Reader'
);
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'actor_id', '2026-10-20 00:00:01+00'
  ),
  'duplicate_reader_grant',
  'terminal Reader replay'
);
reset role;

-- A Reader source used earlier in the same UTC month is never issued twice.
set local role service_role;
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'returning_id', '2026-08-15 00:00:00+00'
  ),
  'granted_reader',
  'returning initial Reader'
);
insert into public.billing_memberships (
  user_id, plan_code, stripe_status, pricing_cohort, offer_code,
  billing_interval, stripe_customer_id, stripe_subscription_id,
  current_period_start, current_period_end, cancel_at_period_end,
  access_until, billing_hold, last_stripe_event_id,
  last_stripe_event_created
) values (
  :'returning_id', 'student', 'active', 'standard',
  'student_standard_monthly', 'month',
  'cus_leanL302Return', 'sub_leanL302Return',
  '2026-08-10 00:00:00+00', '2026-08-25 00:00:00+00', false,
  '2026-08-25 00:00:00+00', false, 'evt_leanL302Return1', 1786320000
);
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'returning_id', '2026-08-15 00:00:00+00'
  ),
  'granted_student',
  'same-month paid activation'
);
update public.billing_memberships
set stripe_status = 'canceled',
    last_stripe_event_id = 'evt_leanL302Return2',
    last_stripe_event_created = 1787616000,
    updated_at = now()
where user_id = :'returning_id';
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'returning_id', '2026-08-25 00:00:00+00'
  ),
  'reader_source_already_used',
  'same-month Reader not reissued'
);
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'returning_id', '2026-09-01 00:00:00+00'
  ),
  'granted_reader',
  'next UTC month Reader grant'
);
reset role;

-- Verified Scholar and Adept monthly periods receive exact plan allowances.
set local role service_role;
insert into public.billing_memberships (
  user_id, plan_code, stripe_status, pricing_cohort, offer_code,
  billing_interval, stripe_customer_id, stripe_subscription_id,
  current_period_start, current_period_end, cancel_at_period_end,
  access_until, billing_hold, last_stripe_event_id,
  last_stripe_event_created
) values
(
  :'scholar_id', 'scholar', 'active', 'standard', 'scholar_monthly',
  'month', 'cus_leanL302Scholar', 'sub_leanL302Scholar',
  '2026-08-01 00:00:00+00', '2026-09-01 00:00:00+00', false,
  '2026-09-01 00:00:00+00', false, 'evt_leanL302Scholar1', 1785542400
),
(
  :'adept_id', 'adept', 'active', 'standard', 'adept_monthly',
  'month', 'cus_leanL302Adept', 'sub_leanL302Adept',
  '2026-08-01 00:00:00+00', '2026-09-01 00:00:00+00', false,
  '2026-09-01 00:00:00+00', false, 'evt_leanL302Adept1', 1785542401
);
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'scholar_id', '2026-08-15 00:00:00+00'
  ),
  'granted_scholar',
  'Scholar allowance'
);
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'adept_id', '2026-08-15 00:00:00+00'
  ),
  'granted_adept',
  'Adept allowance'
);

-- Held and unverified projections fail closed with no grant.
insert into public.billing_memberships (
  user_id, plan_code, stripe_status, pricing_cohort, offer_code,
  billing_interval, stripe_customer_id, stripe_subscription_id,
  current_period_start, current_period_end, cancel_at_period_end,
  access_until, billing_hold, last_stripe_event_id,
  last_stripe_event_created
) values
(
  :'blocked_id', 'scholar', 'active', 'standard', 'scholar_monthly',
  'month', 'cus_leanL302Blocked', 'sub_leanL302Blocked',
  '2026-08-01 00:00:00+00', '2026-09-01 00:00:00+00', false,
  '2026-09-01 00:00:00+00', true, 'evt_leanL302Blocked1', 1785542402
),
(
  :'unverified_id', 'scholar', 'active', 'standard', 'scholar_monthly',
  'month', 'cus_leanL302Unverified', 'sub_leanL302Unverified',
  '2026-08-01 00:00:00+00', '2026-09-01 00:00:00+00', false,
  '2026-09-01 00:00:00+00', false, null, null
);
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'blocked_id', '2026-08-15 00:00:00+00'
  ),
  'blocked_billing_state',
  'billing hold'
);
select pg_temp.lean_l3_02_assert_equal(
  public.sync_monthly_credit_grant_v1(
    :'unverified_id', '2026-08-15 00:00:00+00'
  ),
  'blocked_billing_state',
  'unverified paid projection'
);
reset role;

do $lean_l3_02_final_state$
declare
  v_mismatch_count integer;
begin
  if not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_02.actor_id')::uuid
      and available_credits = 10
      and reserved_credits = 0
      and version = 8
  ) then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: terminal Reader state';
  end if;

  if not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_02.returning_id')::uuid
      and available_credits = 10
      and reserved_credits = 0
      and version = 5
  ) or (
    select count(*) from public.credit_grants
    where user_id = current_setting('lean.l3_02.returning_id')::uuid
      and source_key = 'reader:'
        || current_setting('lean.l3_02.returning_id') || ':2026-08'
  ) <> 1 then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: Reader UTC reset/idempotency';
  end if;

  if not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_02.scholar_id')::uuid
      and available_credits = 100
  ) or not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l3_02.adept_id')::uuid
      and available_credits = 300
  ) then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: paid allowances';
  end if;

  if exists (
    select 1 from public.credit_grants
    where user_id in (
      current_setting('lean.l3_02.blocked_id')::uuid,
      current_setting('lean.l3_02.unverified_id')::uuid
    )
  ) then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: blocked state received grant';
  end if;

  select count(*) into v_mismatch_count
  from public.credit_accounts as account
  left join (
    select
      user_id,
      coalesce(sum(available_delta), 0) as available_ledger,
      coalesce(sum(reserved_delta), 0) as reserved_ledger,
      coalesce(max(account_version), 0) as ledger_version
    from public.credit_transactions
    group by user_id
  ) as ledger on ledger.user_id = account.user_id
  where account.user_id in (
      current_setting('lean.l3_02.actor_id')::uuid,
      current_setting('lean.l3_02.returning_id')::uuid,
      current_setting('lean.l3_02.scholar_id')::uuid,
      current_setting('lean.l3_02.adept_id')::uuid,
      current_setting('lean.l3_02.blocked_id')::uuid,
      current_setting('lean.l3_02.unverified_id')::uuid
    )
    and (
      account.available_credits <> coalesce(ledger.available_ledger, 0)
      or account.reserved_credits <> coalesce(ledger.reserved_ledger, 0)
      or account.version <> coalesce(ledger.ledger_version, 0)
    );

  if v_mismatch_count <> 0 then
    raise exception 'LEAN_L3_02_ASSERTION_FAILED: ledger/account mismatch';
  end if;
end;
$lean_l3_02_final_state$;

select
  :'prismarium_target' as target,
  1 as service_only,
  1 as reader_ten,
  1 as reader_replay,
  1 as activation_full_allowance,
  1 as reader_remainder_expired,
  1 as cancel_preserved,
  1 as renewal_once,
  1 as no_rollover,
  1 as delayed_ignored,
  1 as early_terminal_blocked,
  1 as terminal_reader,
  1 as same_month_reader_once,
  1 as utc_boundary_reset,
  1 as scholar_hundred,
  1 as adept_three_hundred,
  1 as ambiguous_blocked,
  1 as accounting_agrees,
  1 as source_idempotency,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id in (
    :'actor_id'::uuid, :'returning_id'::uuid, :'scholar_id'::uuid,
    :'adept_id'::uuid, :'blocked_id'::uuid, :'unverified_id'::uuid
  )) +
  (select count(*) from public.billing_memberships where user_id in (
    :'actor_id'::uuid, :'returning_id'::uuid, :'scholar_id'::uuid,
    :'adept_id'::uuid, :'blocked_id'::uuid, :'unverified_id'::uuid
  )) +
  (select count(*) from public.credit_accounts where user_id in (
    :'actor_id'::uuid, :'returning_id'::uuid, :'scholar_id'::uuid,
    :'adept_id'::uuid, :'blocked_id'::uuid, :'unverified_id'::uuid
  )) +
  (select count(*) from public.credit_grants where user_id in (
    :'actor_id'::uuid, :'returning_id'::uuid, :'scholar_id'::uuid,
    :'adept_id'::uuid, :'blocked_id'::uuid, :'unverified_id'::uuid
  )) +
  (select count(*) from public.credit_transactions where user_id in (
    :'actor_id'::uuid, :'returning_id'::uuid, :'scholar_id'::uuid,
    :'adept_id'::uuid, :'blocked_id'::uuid, :'unverified_id'::uuid
  ))
) as cleanup_residue;

\echo 'LEAN_L3_02_LOCAL_BOUNDARIES: 18/18 PASS'
\echo 'LEAN_L3_02_LOCAL_RESULT: PASS'
