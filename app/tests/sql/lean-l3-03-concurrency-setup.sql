\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L3_03_CONCURRENCY_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif
\if :{?actor_id}
\else
  \echo 'LEAN_L3_03_CONCURRENCY_GUARD_FAILED: actor_id is required'
  \quit 2
\endif
\if :{?actor_email}
\else
  \echo 'LEAN_L3_03_CONCURRENCY_GUARD_FAILED: actor_email is required'
  \quit 2
\endif

select :'prismarium_target' = 'local' as target_allowed \gset
\if :target_allowed
\else
  \echo 'LEAN_L3_03_CONCURRENCY_GUARD_FAILED: local target required'
  \quit 2
\endif

begin;
insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L3-03 concurrency actor"}'::jsonb, now(), now()
);
commit;

\echo 'LEAN_L3_03_CONCURRENCY_SETUP: PASS'
