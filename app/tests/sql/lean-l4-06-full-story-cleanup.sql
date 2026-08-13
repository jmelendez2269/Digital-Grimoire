\set ON_ERROR_STOP on

select id as actor_id
from auth.users
where email = 'lean-l2-membership-reader@example.test'
  and raw_user_meta_data ->> 'fixture_marker' = 'lean-l2-local-membership-reader-v1'
\gset

\if :{?actor_id}
\else
  \echo 'LEAN_L4_06_CLEANUP_GUARD_FAILED: marker-owned Reader fixture is required'
  \quit 1
\endif

select set_config('lean.l4_06.actor_id', :'actor_id', false);

delete from public.convergence_lens_expansions
where user_id = :'actor_id'::uuid;
delete from public.convergence_responses
where user_id = :'actor_id'::uuid;
delete from public.workings
where user_id = :'actor_id'::uuid;
delete from public.ai_usage_events
where user_id = :'actor_id'::uuid;
delete from public.ai_metering_requests
where user_id = :'actor_id'::uuid;
delete from public.credit_transactions
where user_id = :'actor_id'::uuid;
delete from public.credit_reservations
where user_id = :'actor_id'::uuid;
delete from public.credit_grants
where user_id = :'actor_id'::uuid;
delete from public.credit_accounts
where user_id = :'actor_id'::uuid;

do $lean_l4_06_restore$
begin
  if to_regclass('lean_l4_06_test.billing_memberships_backup') is not null then
    if (select count(*) from lean_l4_06_test.billing_memberships_backup) <> 1 then
      raise exception 'LEAN_L4_06_CLEANUP_FAILED: billing backup is not exact';
    end if;
    delete from public.billing_memberships
    where user_id = current_setting('lean.l4_06.actor_id')::uuid;
    insert into public.billing_memberships
    select * from lean_l4_06_test.billing_memberships_backup;
    execute 'drop schema lean_l4_06_test cascade';
  end if;
end;
$lean_l4_06_restore$;

delete from public.entity_intentions
where id = '4a060000-0000-4000-8000-000000000030';
delete from public.correspondences
where id = '4a060000-0000-4000-8000-000000000020';
delete from public.intentions
where id = '4a060000-0000-4000-8000-000000000010';

do $lean_l4_06_cleanup$
begin
  if (
    (select count(*) from public.credit_accounts where user_id = current_setting('lean.l4_06.actor_id')::uuid) +
    (select count(*) from public.credit_grants where user_id = current_setting('lean.l4_06.actor_id')::uuid) +
    (select count(*) from public.credit_reservations where user_id = current_setting('lean.l4_06.actor_id')::uuid) +
    (select count(*) from public.credit_transactions where user_id = current_setting('lean.l4_06.actor_id')::uuid) +
    (select count(*) from public.ai_metering_requests where user_id = current_setting('lean.l4_06.actor_id')::uuid) +
    (select count(*) from public.ai_usage_events where user_id = current_setting('lean.l4_06.actor_id')::uuid) +
    (select count(*) from public.workings where user_id = current_setting('lean.l4_06.actor_id')::uuid) +
    (select count(*) from public.convergence_responses where user_id = current_setting('lean.l4_06.actor_id')::uuid) +
    (select count(*) from public.convergence_lens_expansions where user_id = current_setting('lean.l4_06.actor_id')::uuid) +
    (select count(*) from public.entity_intentions where id = '4a060000-0000-4000-8000-000000000030') +
    (select count(*) from public.correspondences where id = '4a060000-0000-4000-8000-000000000020') +
    (select count(*) from public.intentions where id = '4a060000-0000-4000-8000-000000000010')
  ) <> 0 then
    raise exception 'LEAN_L4_06_CLEANUP_FAILED: tagged residue remains';
  end if;
  if to_regnamespace('lean_l4_06_test') is not null then
    raise exception 'LEAN_L4_06_CLEANUP_FAILED: billing backup schema remains';
  end if;
end;
$lean_l4_06_cleanup$;

select json_build_object(
  'result', 'clean',
  'residue', 0,
  'account_retained', exists (
    select 1 from auth.users
    where id = :'actor_id'::uuid
      and raw_user_meta_data ->> 'fixture_marker' = 'lean-l2-local-membership-reader-v1'
  )
);
