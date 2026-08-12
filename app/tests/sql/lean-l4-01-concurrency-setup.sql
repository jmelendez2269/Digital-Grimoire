\set ON_ERROR_STOP on

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    :'actor_a_id', 'authenticated', 'authenticated', :'actor_a_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L4-01 concurrency A"}'::jsonb, now(), now()
  ),
  (
    :'actor_b_id', 'authenticated', 'authenticated', :'actor_b_email', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L4-01 concurrency B"}'::jsonb, now(), now()
  );

set role service_role;
select result_code from public.begin_ai_metering_request_v1(
  :'actor_a_id', :'seed_request_id', repeat('9', 64),
  'working.generate', 'lean-launch-v1', 1, 'shadow', 'reader',
  0, 'lean-reader-guardrail-v1', 10, 100, 600, 300, 50,
  '2026-08-16 12:00:00+00'
);
select public.complete_ai_metering_request_v1(
  :'actor_a_id', :'seed_request_id', repeat('9', 64),
  'succeeded', 49.94, 'test:reader-cost-seed',
  '2026-08-16 12:00:01+00'
);
reset role;

select 'LEAN_L4_01_CONCURRENCY_SETUP: PASS' as result;
