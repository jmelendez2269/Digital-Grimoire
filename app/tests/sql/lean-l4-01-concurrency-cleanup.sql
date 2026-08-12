\set ON_ERROR_STOP on

delete from auth.users
where id in (:'actor_a_id'::uuid, :'actor_b_id'::uuid);

select (
  (select count(*) from auth.users
    where id in (:'actor_a_id'::uuid, :'actor_b_id'::uuid)) +
  (select count(*) from public.credit_accounts
    where user_id in (:'actor_a_id'::uuid, :'actor_b_id'::uuid)) +
  (select count(*) from public.credit_grants
    where user_id in (:'actor_a_id'::uuid, :'actor_b_id'::uuid)) +
  (select count(*) from public.credit_reservations
    where user_id in (:'actor_a_id'::uuid, :'actor_b_id'::uuid)) +
  (select count(*) from public.credit_transactions
    where user_id in (:'actor_a_id'::uuid, :'actor_b_id'::uuid)) +
  (select count(*) from public.ai_metering_requests
    where user_id in (:'actor_a_id'::uuid, :'actor_b_id'::uuid)) +
  (select count(*) from public.ai_usage_events
    where user_id in (:'actor_a_id'::uuid, :'actor_b_id'::uuid))
) as concurrency_cleanup_residue;
