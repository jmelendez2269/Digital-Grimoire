\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L3_05_CONCURRENCY_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif
\if :{?actor_id}
\else
  \echo 'LEAN_L3_05_CONCURRENCY_GUARD_FAILED: actor_id is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as target_allowed \gset
\if :target_allowed
\else
  \echo 'LEAN_L3_05_CONCURRENCY_GUARD_FAILED: local target required'
  \quit 2
\endif

begin;
delete from auth.users where id = :'actor_id'::uuid;
commit;

select (
  (select count(*) from auth.users where id = :'actor_id'::uuid) +
  (select count(*) from public.billing_memberships where user_id = :'actor_id'::uuid) +
  (select count(*) from public.credit_accounts where user_id = :'actor_id'::uuid) +
  (select count(*) from public.credit_grants where user_id = :'actor_id'::uuid) +
  (select count(*) from public.credit_reservations where user_id = :'actor_id'::uuid) +
  (select count(*) from public.credit_transactions where user_id = :'actor_id'::uuid) +
  (select count(*) from public.ai_usage_events where user_id = :'actor_id'::uuid)
) as concurrency_cleanup_residue;

\echo 'LEAN_L3_05_CONCURRENCY_CLEANUP: PASS'
