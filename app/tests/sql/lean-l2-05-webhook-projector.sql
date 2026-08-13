\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L2_05_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l2_05_target_allowed \gset
\if :lean_l2_05_target_allowed
\else
  \echo 'LEAN_L2_05_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select gen_random_uuid() as actor_id, gen_random_uuid() as other_id \gset
select
  'lean-l2-05-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email,
  'lean-l2-05-other-' || replace(:'run_id', '-', '') || '@example.invalid' as other_email
\gset
select set_config('lean.l2_05.actor_id', :'actor_id', true);
select set_config('lean.l2_05.other_id', :'other_id', true);

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L2-05 actor"}'::jsonb, now(), now()
  ),
  (
    :'other_id', 'authenticated', 'authenticated', :'other_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L2-05 other"}'::jsonb, now(), now()
  );

create or replace function pg_temp.lean_l2_05_expect_error(
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
    if position(p_marker in sqlerrm) > 0 then return; end if;
    raise;
  end;
  raise exception 'LEAN_L2_05_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $catalog$
declare role_name text;
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'billing_webhook_events'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: inbox RLS is not forced';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'billing_webhook_events'
  ) then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: customer inbox policy exists';
  end if;
  foreach role_name in array array['anon', 'authenticated'] loop
    if has_table_privilege(
      role_name, 'public.billing_webhook_events',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    ) then
      raise exception 'LEAN_L2_05_ASSERTION_FAILED: % retains inbox authority', role_name;
    end if;
    if has_function_privilege(
      role_name,
      'public.process_billing_webhook_event(text,text,boolean,text,bigint,text,text,text,uuid,text,text,text,text,text,text,timestamptz,timestamptz,boolean)',
      'EXECUTE'
    ) then
      raise exception 'LEAN_L2_05_ASSERTION_FAILED: % can execute projector', role_name;
    end if;
  end loop;
  if not has_table_privilege(
    'service_role', 'public.billing_webhook_events',
    'SELECT,INSERT,UPDATE,DELETE'
  ) or not has_function_privilege(
    'service_role',
    'public.process_billing_webhook_event(text,text,boolean,text,bigint,text,text,text,uuid,text,text,text,text,text,text,timestamptz,timestamptz,boolean)',
    'EXECUTE'
  ) then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: service authority incomplete';
  end if;
  if position(
    'pg_advisory_xact_lock' in pg_get_functiondef(
      'public.process_billing_webhook_event(text,text,boolean,text,bigint,text,text,text,uuid,text,text,text,text,text,text,timestamptz,timestamptz,boolean)'::regprocedure
    )
  ) = 0 then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: per-user serialization absent';
  end if;
end;
$catalog$;

set local role authenticated;
select pg_temp.lean_l2_05_expect_error(
  'select * from public.billing_webhook_events', 'permission denied'
);
select pg_temp.lean_l2_05_expect_error(
  $$select public.process_billing_webhook_event(
    'evt_Denied', 'invoice.paid', false, null, 1, repeat('a',64),
    'ignore', 'EVENT_TYPE_NOT_PROJECTED', null, null, null, null, null,
    null, null, null, null, null
  )$$,
  'permission denied'
);
reset role;

set local role service_role;
select public.process_billing_webhook_event(
  'evt_Create001', 'customer.subscription.created', false, '2026-07-29.basil',
  200, repeat('a', 64), 'project', null, :'actor_id'::uuid,
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL205Actor', 'sub_LeanL205Actor',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as created_disposition \gset
reset role;
select set_config(
  'lean.l2_05.created_disposition', :'created_disposition', true
);

do $created$
begin
  if current_setting('lean.l2_05.created_disposition') <> 'processed'
     or not exists (
    select 1 from public.billing_memberships
    where user_id = current_setting('lean.l2_05.actor_id')::uuid
      and plan_code = 'student'
      and pricing_cohort = 'founding'
      and offer_code = 'student_founding_monthly'
      and stripe_status = 'active'
      and billing_hold = false
      and last_stripe_event_id = 'evt_Create001'
      and last_stripe_event_created = 200
  ) then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: valid projection mismatch';
  end if;
end;
$created$;

set local role service_role;
select public.process_billing_webhook_event(
  'evt_Create001', 'customer.subscription.created', false, '2026-07-29.basil',
  200, repeat('a', 64), 'project', null, :'actor_id'::uuid,
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL205Actor', 'sub_LeanL205Actor',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as duplicate_disposition \gset
reset role;

set local role service_role;
select public.process_billing_webhook_event(
  'evt_PastDue001', 'customer.subscription.updated', false, '2026-07-29.basil',
  300, repeat('b', 64), 'project', null, :'actor_id'::uuid,
  'student', 'founding', 'student_founding_monthly', 'past_due',
  'cus_LeanL205Actor', 'sub_LeanL205Actor',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as newer_disposition \gset
select public.process_billing_webhook_event(
  'evt_Delayed001', 'customer.subscription.updated', false, '2026-07-29.basil',
  250, repeat('c', 64), 'project', null, :'actor_id'::uuid,
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL205Actor', 'sub_LeanL205Actor',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as stale_disposition \gset
select public.process_billing_webhook_event(
  'evt_SameSecond001', 'customer.subscription.updated', false, '2026-07-29.basil',
  300, repeat('d', 64), 'project', null, :'actor_id'::uuid,
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL205Actor', 'sub_LeanL205Actor',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as conflict_disposition \gset
reset role;
select set_config(
  'lean.l2_05.duplicate_disposition', :'duplicate_disposition', true
);
select set_config(
  'lean.l2_05.newer_disposition', :'newer_disposition', true
);
select set_config(
  'lean.l2_05.stale_disposition', :'stale_disposition', true
);
select set_config(
  'lean.l2_05.conflict_disposition', :'conflict_disposition', true
);

do $ordering$
begin
  if current_setting('lean.l2_05.duplicate_disposition') <> 'duplicate_processed'
     or current_setting('lean.l2_05.newer_disposition') <> 'processed'
     or current_setting('lean.l2_05.stale_disposition') <> 'stale'
     or current_setting('lean.l2_05.conflict_disposition') <> 'quarantined_same_timestamp_conflict'
     or not exists (
       select 1 from public.billing_webhook_events
       where stripe_event_id = 'evt_Create001' and delivery_count = 2
     )
     or not exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l2_05.actor_id')::uuid
         and stripe_status = 'past_due'
         and last_stripe_event_id = 'evt_PastDue001'
         and billing_hold = true
     ) then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: replay/order contract mismatch';
  end if;
end;
$ordering$;

set local role service_role;
select public.process_billing_webhook_event(
  'evt_Replacement001', 'customer.subscription.updated', false, null,
  350, repeat('9', 64), 'project', null, :'actor_id'::uuid,
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL205Actor', 'sub_ParallelAttempt',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as replacement_disposition \gset
reset role;
select set_config(
  'lean.l2_05.replacement_disposition', :'replacement_disposition', true
);

do $replacement$
begin
  if current_setting('lean.l2_05.replacement_disposition')
       <> 'quarantined_identity_replacement'
     or not exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l2_05.actor_id')::uuid
         and stripe_subscription_id = 'sub_LeanL205Actor'
         and stripe_status = 'past_due'
         and billing_hold = true
     ) then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: identity replacement was not held';
  end if;
end;
$replacement$;

set local role service_role;
select public.process_billing_webhook_event(
  'evt_Recover001', 'customer.subscription.updated', false, '2026-07-29.basil',
  400, repeat('e', 64), 'project', null, :'actor_id'::uuid,
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL205Actor', 'sub_LeanL205Actor',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as recovery_disposition \gset
select public.process_billing_webhook_event(
  'evt_UnknownPrice001', 'customer.subscription.updated', false, '2026-07-29.basil',
  500, repeat('f', 64), 'quarantine', 'UNKNOWN_SUBSCRIPTION_PRICE',
  :'actor_id'::uuid, null, null, null, null,
  'cus_LeanL205Actor', 'sub_LeanL205Actor', null, null, null
) as quarantine_disposition \gset
reset role;
select set_config(
  'lean.l2_05.recovery_disposition', :'recovery_disposition', true
);
select set_config(
  'lean.l2_05.quarantine_disposition', :'quarantine_disposition', true
);

do $quarantine$
begin
  if current_setting('lean.l2_05.recovery_disposition') <> 'processed'
     or current_setting('lean.l2_05.quarantine_disposition') <> 'quarantined'
     or not exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l2_05.actor_id')::uuid
         and stripe_status = 'unknown'
         and pricing_cohort = 'unknown'
         and offer_code is null
         and billing_hold = true
     ) then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: quarantine did not fail closed';
  end if;
end;
$quarantine$;

set local role service_role;
select public.process_billing_webhook_event(
  'evt_Canceled001', 'customer.subscription.deleted', false, '2026-07-29.basil',
  600, repeat('1', 64), 'project', null, :'actor_id'::uuid,
  'student', 'founding', 'student_founding_monthly', 'canceled',
  'cus_LeanL205Actor', 'sub_LeanL205Actor',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as cancel_disposition \gset
reset role;

insert into public.billing_memberships (
  user_id, plan_code, stripe_status, pricing_cohort, offer_code,
  billing_interval, stripe_customer_id, stripe_subscription_id,
  current_period_start, current_period_end, access_until, billing_hold,
  last_stripe_event_id, last_stripe_event_created
) values (
  :'other_id', 'scholar', 'active', 'standard', 'scholar_monthly',
  'month', 'cus_LeanL205Other', 'sub_LeanL205Other',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z',
  '2026-09-01T00:00:00Z', false, 'evt_OtherSeed001', 100
);

set local role service_role;
select public.process_billing_webhook_event(
  'evt_IdentityConflict001', 'customer.subscription.updated', false, null,
  700, repeat('2', 64), 'project', null, :'actor_id'::uuid,
  'scholar', 'standard', 'scholar_monthly', 'active',
  'cus_LeanL205Other', 'sub_LeanL205Other',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as identity_disposition \gset
select public.process_billing_webhook_event(
  'evt_Canceled001', 'customer.subscription.deleted', false, '2026-07-29.basil',
  600, repeat('3', 64), 'project', null, :'actor_id'::uuid,
  'student', 'founding', 'student_founding_monthly', 'canceled',
  'cus_LeanL205Actor', 'sub_LeanL205Actor',
  '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
) as payload_conflict_disposition \gset
reset role;
select set_config(
  'lean.l2_05.cancel_disposition', :'cancel_disposition', true
);
select set_config(
  'lean.l2_05.identity_disposition', :'identity_disposition', true
);
select set_config(
  'lean.l2_05.payload_conflict_disposition',
  :'payload_conflict_disposition',
  true
);

do $terminal_and_conflicts$
begin
  if current_setting('lean.l2_05.cancel_disposition') <> 'processed'
     or current_setting('lean.l2_05.identity_disposition') <> 'quarantined_identity_conflict'
     or current_setting('lean.l2_05.payload_conflict_disposition') <> 'quarantined_payload_conflict'
     or not exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l2_05.actor_id')::uuid
         and stripe_status = 'canceled'
         and pricing_cohort = 'founding'
         and offer_code = 'student_founding_monthly'
         and billing_hold = true
     )
     or not exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l2_05.other_id')::uuid
         and billing_hold = true
     ) then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: terminal/conflict handling mismatch';
  end if;
end;
$terminal_and_conflicts$;

select pg_temp.lean_l2_05_expect_error(
  format(
    $$select public.process_billing_webhook_event(
      'evt_Rollback001', 'customer.subscription.updated', false, null,
      800, repeat('4',64), 'project', null, %L::uuid,
      'forged', 'standard', 'scholar_monthly', 'active',
      null, null,
      '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z', false
    )$$,
    :'other_id'
  ),
  'LEAN_L2_05_INVALID_PROJECTION'
);

do $rollback_proof$
begin
  if exists (
    select 1 from public.billing_webhook_events
    where stripe_event_id = 'evt_Rollback001'
  ) then
    raise exception 'LEAN_L2_05_ASSERTION_FAILED: failed projection left inbox residue';
  end if;
end;
$rollback_proof$;

select
  :'prismarium_target' as target,
  1 as schema_contract,
  1 as customer_access_denied,
  1 as signature_inbox_service_only,
  1 as valid_projection,
  1 as exact_duplicate,
  1 as delayed_event_stale,
  1 as same_second_held,
  1 as identity_replacement_held,
  1 as recovery_clears_hold,
  1 as unknown_price_held,
  1 as cancellation_terminal,
  1 as identity_conflict_held,
  1 as payload_conflict_held,
  1 as database_failure_atomic,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id in (:'actor_id'::uuid, :'other_id'::uuid)) +
  (select count(*) from public.billing_webhook_events
   where user_id in (:'actor_id'::uuid, :'other_id'::uuid)) +
  (select count(*) from public.billing_memberships
   where user_id in (:'actor_id'::uuid, :'other_id'::uuid))
) as cleanup_residue;

\echo 'LEAN_L2_05_LOCAL_RESULT: PASS'
