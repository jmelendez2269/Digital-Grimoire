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
\if :{?actor_email}
\else
  \echo 'LEAN_L3_05_CONCURRENCY_GUARD_FAILED: actor_email is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as target_allowed \gset
\if :target_allowed
\else
  \echo 'LEAN_L3_05_CONCURRENCY_GUARD_FAILED: local target required'
  \quit 2
\endif

begin;
insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-05 concurrency actor"}'::jsonb, now(), now()
);
set local role service_role;
select public.get_credit_wallet_v1(
  :'actor_id', '2026-08-15 12:00:00+00', 20
);
reset role;
commit;

\echo 'LEAN_L3_05_CONCURRENCY_SETUP: PASS'
