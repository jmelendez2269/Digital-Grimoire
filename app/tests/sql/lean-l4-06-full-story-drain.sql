\set ON_ERROR_STOP on

select id as actor_id
from auth.users
where email = 'lean-l2-membership-reader@example.test'
  and raw_user_meta_data ->> 'fixture_marker' = 'lean-l2-local-membership-reader-v1'
\gset

\if :{?actor_id}
\else
  \echo 'LEAN_L4_06_DRAIN_GUARD_FAILED: marker-owned Reader fixture is required'
  \quit 1
\endif

select id as grant_id
from public.credit_grants
where user_id = :'actor_id'::uuid and state = 'active'
\gset

select available_credits as drain_amount
from public.credit_accounts
where user_id = :'actor_id'::uuid
\gset

update public.credit_accounts
set available_credits = 0,
    version = version + 1,
    updated_at = clock_timestamp()
where user_id = :'actor_id'::uuid
  and available_credits = :'drain_amount'::integer
  and :'drain_amount'::integer > 0;

insert into public.credit_transactions (
  user_id, grant_id, transaction_type, event_key, event_fingerprint,
  available_delta, reserved_delta, available_after, reserved_after,
  account_version, reason_code, created_at
)
select
  account.user_id,
  :'grant_id'::uuid,
  'adjustment',
  'adjustment:lean-l4-06:insufficient-balance',
  repeat('f', 64),
  -(:'drain_amount'::integer),
  0,
  account.available_credits,
  account.reserved_credits,
  account.version,
  'MANUAL_CORRECTION',
  account.updated_at
from public.credit_accounts as account
where account.user_id = :'actor_id'::uuid
  and account.available_credits = 0
  and account.reserved_credits = 0;

select json_build_object(
  'result', 'drained',
  'available_credits', available_credits,
  'reserved_credits', reserved_credits
)
from public.credit_accounts
where user_id = :'actor_id'::uuid;
