\set ON_ERROR_STOP on

-- Local-only, marker-owned fixture for the LEAN-L4-06 full-story gate.
select id as actor_id
from auth.users
where email = 'lean-l2-membership-reader@example.test'
  and raw_user_meta_data ->> 'fixture_marker' = 'lean-l2-local-membership-reader-v1'
\gset

\if :{?actor_id}
\else
  \echo 'LEAN_L4_06_SETUP_GUARD_FAILED: marker-owned Reader fixture is required'
  \quit 1
\endif

select set_config('lean.l4_06.actor_id', :'actor_id', false);

do $lean_l4_06_backup_guard$
begin
  if to_regnamespace('lean_l4_06_test') is not null then
    raise exception 'LEAN_L4_06_SETUP_GUARD_FAILED: billing backup schema already exists';
  end if;
end;
$lean_l4_06_backup_guard$;

create schema lean_l4_06_test authorization postgres;
revoke all on schema lean_l4_06_test from public, anon, authenticated, service_role;
create table lean_l4_06_test.billing_memberships_backup
  (like public.billing_memberships including all);
revoke all on table lean_l4_06_test.billing_memberships_backup
  from public, anon, authenticated, service_role;
insert into lean_l4_06_test.billing_memberships_backup
select * from public.billing_memberships
where user_id = :'actor_id'::uuid;

delete from public.billing_memberships
where user_id = :'actor_id'::uuid;

do $lean_l4_06_guard$
begin
  if not exists (
    select 1 from public.users
    where id = current_setting('lean.l4_06.actor_id')::uuid
      and email = 'lean-l2-membership-reader@example.test'
      and role = 'user'
      and subscription_status = 'free'
  ) then
    raise exception 'LEAN_L4_06_SETUP_GUARD_FAILED: non-admin Reader profile required';
  end if;

  if (select count(*) from lean_l4_06_test.billing_memberships_backup) <> 1
     or exists (
       select 1 from public.billing_memberships
       where user_id = current_setting('lean.l4_06.actor_id')::uuid
     ) then
    raise exception 'LEAN_L4_06_SETUP_GUARD_FAILED: billing projection backup failed';
  end if;

  if exists (select 1 from public.credit_accounts where user_id = current_setting('lean.l4_06.actor_id')::uuid)
     or exists (select 1 from public.ai_metering_requests where user_id = current_setting('lean.l4_06.actor_id')::uuid)
     or exists (select 1 from public.ai_usage_events where user_id = current_setting('lean.l4_06.actor_id')::uuid)
     or exists (select 1 from public.workings where user_id = current_setting('lean.l4_06.actor_id')::uuid)
     or exists (select 1 from public.convergence_responses where user_id = current_setting('lean.l4_06.actor_id')::uuid)
     or exists (select 1 from public.convergence_lens_expansions where user_id = current_setting('lean.l4_06.actor_id')::uuid) then
    raise exception 'LEAN_L4_06_SETUP_GUARD_FAILED: fixture has pre-existing L3/L4 residue';
  end if;
end;
$lean_l4_06_guard$;

insert into public.intentions (id, slug, label, aliases)
values (
  '4a060000-0000-4000-8000-000000000010',
  'clarity',
  'clarity',
  array['focus']::text[]
);

insert into public.correspondences (
  id, slug, name, category, description, lenses
)
values (
  '4a060000-0000-4000-8000-000000000020',
  'lean-l4-06-rosemary',
  'Rosemary',
  'herb_garden',
  'A local tagged correspondence used only to ground the LEAN-L4-06 clarity fixture.',
  array['scientific', 'symbolic_occult']::text[]
);

insert into public.entity_intentions (
  id, entity_id, intention_id, raw_value
)
values (
  '4a060000-0000-4000-8000-000000000030',
  '4a060000-0000-4000-8000-000000000020',
  '4a060000-0000-4000-8000-000000000010',
  'clarity'
);

select public.sync_monthly_credit_grant_v1(:'actor_id'::uuid, clock_timestamp()) as sync_result
\gset

\if :{?sync_result}
\else
  \echo 'LEAN_L4_06_SETUP_FAILED: monthly grant did not return a result'
  \quit 1
\endif

select id as grant_id
from public.credit_grants
where user_id = :'actor_id'::uuid
  and state = 'active'
  and valid_from <= clock_timestamp()
  and expires_at > clock_timestamp()
\gset

update public.credit_accounts
set available_credits = available_credits + 90,
    version = version + 1,
    updated_at = clock_timestamp()
where user_id = :'actor_id'::uuid;

insert into public.credit_transactions (
  user_id, grant_id, transaction_type, event_key, event_fingerprint,
  available_delta, reserved_delta, available_after, reserved_after,
  account_version, reason_code, created_at
)
select
  account.user_id,
  :'grant_id'::uuid,
  'adjustment',
  'adjustment:lean-l4-06:fixture-capacity',
  repeat('e', 64),
  90,
  0,
  account.available_credits,
  account.reserved_credits,
  account.version,
  'MANUAL_CORRECTION',
  account.updated_at
from public.credit_accounts as account
where account.user_id = :'actor_id'::uuid;

do $lean_l4_06_ready$
begin
  if not exists (
    select 1 from public.credit_accounts
    where user_id = current_setting('lean.l4_06.actor_id')::uuid
      and available_credits = 100
      and reserved_credits = 0
  ) then
    raise exception 'LEAN_L4_06_SETUP_FAILED: expected 100 available fixture credits';
  end if;
end;
$lean_l4_06_ready$;

select json_build_object(
  'result', 'ready',
  'role', 'reader',
  'available_credits', account.available_credits,
  'reserved_credits', account.reserved_credits,
  'tagged_graph_rows', 3
)
from public.credit_accounts as account
where account.user_id = :'actor_id'::uuid;
