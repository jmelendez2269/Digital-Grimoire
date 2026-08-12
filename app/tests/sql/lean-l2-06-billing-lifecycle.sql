\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L2_06_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as lean_l2_06_target_allowed \gset
\if :lean_l2_06_target_allowed
\else
  \echo 'LEAN_L2_06_GUARD_FAILED: target must be local; remote targets are disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

select gen_random_uuid() as actor_id, gen_random_uuid() as other_id,
  gen_random_uuid() as request_one, gen_random_uuid() as request_two,
  gen_random_uuid() as request_three, gen_random_uuid() as request_four,
  gen_random_uuid() as request_five \gset
select
  'lean-l2-06-' || replace(:'run_id', '-', '') as marker,
  'lean-l2-06-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email,
  'lean-l2-06-other-' || replace(:'run_id', '-', '') || '@example.invalid' as other_email
\gset
select set_config('lean.l2_06.actor_id', :'actor_id', true);
select set_config('lean.l2_06.marker', :'marker', true);

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L2-06 actor"}'::jsonb, now(), now()
  ),
  (
    :'other_id', 'authenticated', 'authenticated', :'other_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L2-06 other"}'::jsonb, now(), now()
  );

create or replace function pg_temp.lean_l2_06_expect_error(
  p_sql text,
  p_marker text
)
returns void
language plpgsql
as $expect_error$
begin
  begin execute p_sql;
  exception when others then
    if position(p_marker in sqlerrm) > 0 then return; end if;
    raise;
  end;
  raise exception 'LEAN_L2_06_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $authority$
declare role_name text;
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'billing_reconciliation_requests'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'LEAN_L2_06_ASSERTION_FAILED: reconciliation RLS is not forced';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'billing_reconciliation_requests'
  ) then
    raise exception 'LEAN_L2_06_ASSERTION_FAILED: customer reconciliation policy exists';
  end if;
  foreach role_name in array array['anon', 'authenticated'] loop
    if has_table_privilege(
      role_name, 'public.billing_reconciliation_requests',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    ) or has_function_privilege(
      role_name,
      'public.reconcile_billing_membership_snapshot_v1(uuid,uuid,bigint,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,boolean)',
      'EXECUTE'
    ) then
      raise exception 'LEAN_L2_06_ASSERTION_FAILED: % retains reconciliation authority', role_name;
    end if;
  end loop;
end;
$authority$;

set local role authenticated;
select pg_temp.lean_l2_06_expect_error(
  'select * from public.billing_reconciliation_requests', 'permission denied'
);
reset role;

insert into public.billing_memberships (
  user_id, plan_code, stripe_status, pricing_cohort, offer_code,
  billing_interval, stripe_customer_id, stripe_subscription_id,
  current_period_start, current_period_end, cancel_at_period_end,
  access_until, billing_hold, last_stripe_event_id, last_stripe_event_created
) values (
  :'actor_id', 'student', 'active', 'founding',
  'student_founding_monthly', 'month', 'cus_LeanL206Actor',
  'sub_LeanL206Actor', '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z',
  false, '2026-09-01T00:00:00Z', false, 'evt_LeanL206Seed', 100
);

-- Paid authority permits the fixture to cross the Reader cap.
insert into public.journal_pages (user_id, title, content, is_archived)
select :'actor_id'::uuid, :'marker' || '-page-' || n::text, '{}'::jsonb, false
from generate_series(1, 51) as n;

set local role service_role;
select public.reconcile_billing_membership_snapshot_v1(
  :'request_one', :'actor_id', 2000, repeat('a', 64), 'project', null,
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL206Actor', 'sub_LeanL206Actor',
  '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z', false
) as renewal_disposition \gset
reset role;
select set_config('lean.l2_06.renewal_disposition', :'renewal_disposition', true);

do $renewal$
begin
  if current_setting('lean.l2_06.renewal_disposition') <> 'updated' or not exists (
    select 1 from public.billing_memberships
    where user_id = current_setting('lean.l2_06.actor_id')::uuid
      and plan_code = 'student'
      and pricing_cohort = 'founding'
      and offer_code = 'student_founding_monthly'
      and current_period_end = '2026-10-01T00:00:00Z'
      and billing_hold = false
  ) then
    raise exception 'LEAN_L2_06_ASSERTION_FAILED: founding renewal drifted';
  end if;
end;
$renewal$;

set local role service_role;
select public.reconcile_billing_membership_snapshot_v1(
  :'request_two', :'actor_id', 2100, repeat('b', 64), 'project', null,
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL206Actor', 'sub_LeanL206Actor',
  '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z', true
) as scheduled_disposition \gset
select public.reconcile_billing_membership_snapshot_v1(
  :'request_three', :'actor_id', 2200, repeat('c', 64), 'project', null,
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL206Actor', 'sub_LeanL206Actor',
  '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z', false
) as reactivated_disposition \gset
reset role;
select set_config('lean.l2_06.scheduled_disposition', :'scheduled_disposition', true);
select set_config('lean.l2_06.reactivated_disposition', :'reactivated_disposition', true);

do $scheduled_and_reactivated$
begin
  if current_setting('lean.l2_06.scheduled_disposition') <> 'updated'
     or current_setting('lean.l2_06.reactivated_disposition') <> 'updated'
     or not exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l2_06.actor_id')::uuid
         and stripe_status = 'active'
         and pricing_cohort = 'founding'
         and cancel_at_period_end = false
         and access_until = '2026-10-01T00:00:00Z'
     ) then
    raise exception 'LEAN_L2_06_ASSERTION_FAILED: cancel/reactivate lifecycle drifted';
  end if;
end;
$scheduled_and_reactivated$;

set local role service_role;
select public.process_billing_webhook_event(
  'evt_LeanL206Delayed', 'customer.subscription.updated', false, null,
  2100, repeat('d', 64), 'project', null, :'actor_id',
  'student', 'founding', 'student_founding_monthly', 'active',
  'cus_LeanL206Actor', 'sub_LeanL206Actor',
  '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z', true
) as delayed_disposition \gset
reset role;
select set_config('lean.l2_06.delayed_disposition', :'delayed_disposition', true);

do $delayed$
begin
  if current_setting('lean.l2_06.delayed_disposition') <> 'stale_after_reconciliation'
     or not exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l2_06.actor_id')::uuid
         and cancel_at_period_end = false
     ) then
    raise exception 'LEAN_L2_06_ASSERTION_FAILED: delayed webhook overwrote reconciliation';
  end if;
end;
$delayed$;

set local role service_role;
select public.reconcile_billing_membership_snapshot_v1(
  :'request_four', :'actor_id', 2300, repeat('e', 64), 'project', null,
  'student', 'founding', 'student_founding_monthly', 'canceled',
  'cus_LeanL206Actor', 'sub_LeanL206Actor',
  '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z', false
) as terminal_disposition \gset
reset role;
select set_config('lean.l2_06.terminal_disposition', :'terminal_disposition', true);

update public.journal_pages
set title = :'marker' || '-edited-after-terminal'
where user_id = :'actor_id'::uuid and title = :'marker' || '-page-1';

select pg_temp.lean_l2_06_expect_error(
  format(
    'insert into public.journal_pages (user_id,title,content,is_archived) values (%L::uuid,%L,%L::jsonb,false)',
    :'actor_id', :'marker' || '-blocked-over-limit', '{}'
  ),
  'LEAN_L1_03:JOURNAL_LIMIT_REACHED'
);

update public.journal_pages set is_archived = true
where user_id = :'actor_id'::uuid
  and title in (:'marker' || '-page-2', :'marker' || '-page-3');
insert into public.journal_pages (user_id, title, content, is_archived)
values (:'actor_id', :'marker' || '-new-after-below-limit', '{}'::jsonb, false);

do $terminal_journal$
begin
  if current_setting('lean.l2_06.terminal_disposition') <> 'updated'
     or not exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l2_06.actor_id')::uuid
         and stripe_status = 'canceled'
     )
     or (select count(*) from public.journal_pages
         where user_id = current_setting('lean.l2_06.actor_id')::uuid) <> 52
     or (select count(*) from public.journal_pages
         where user_id = current_setting('lean.l2_06.actor_id')::uuid
           and is_archived = false) <> 50
     or not exists (
       select 1 from public.journal_pages
       where user_id = current_setting('lean.l2_06.actor_id')::uuid
         and title = current_setting('lean.l2_06.marker') || '-edited-after-terminal'
     ) then
    raise exception 'LEAN_L2_06_ASSERTION_FAILED: terminal Journal retention mismatch';
  end if;
end;
$terminal_journal$;

set local role service_role;
select public.reconcile_billing_membership_snapshot_v1(
  :'request_five', :'actor_id', 2400, repeat('f', 64), 'quarantine',
  'UNKNOWN_SUBSCRIPTION_PRICE', null, null, null, null,
  'cus_LeanL206Actor', 'sub_LeanL206Actor', null, null, null
) as quarantine_disposition \gset
reset role;
select set_config('lean.l2_06.quarantine_disposition', :'quarantine_disposition', true);

do $quarantine$
begin
  if current_setting('lean.l2_06.quarantine_disposition') <> 'quarantined'
     or not exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l2_06.actor_id')::uuid
         and billing_hold = true
     ) then
    raise exception 'LEAN_L2_06_ASSERTION_FAILED: reconciliation quarantine did not hold';
  end if;
end;
$quarantine$;

select
  :'prismarium_target' as target,
  1 as schema_contract,
  1 as customer_authority_denied,
  1 as founding_renewal_preserved,
  1 as cancellation_scheduled,
  1 as preterminal_reactivation,
  1 as delayed_webhook_stale,
  1 as terminal_reader_transition,
  1 as journal_pages_retained,
  1 as journal_edit_retained,
  1 as over_limit_new_page_blocked,
  1 as below_limit_new_page_allowed,
  1 as invalid_snapshot_held,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users
   where id in (:'actor_id'::uuid, :'other_id'::uuid)) +
  (select count(*) from public.billing_memberships
   where user_id in (:'actor_id'::uuid, :'other_id'::uuid)) +
  (select count(*) from public.billing_reconciliation_requests
   where user_id in (:'actor_id'::uuid, :'other_id'::uuid)) +
  (select count(*) from public.journal_pages
   where user_id in (:'actor_id'::uuid, :'other_id'::uuid))
) as cleanup_residue;

\echo 'LEAN_L2_06_LOCAL_RESULT: PASS'
