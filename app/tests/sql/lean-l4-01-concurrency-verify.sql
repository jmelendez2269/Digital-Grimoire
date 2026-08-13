\set ON_ERROR_STOP on

select set_config('lean.l4_01.actor_a_id', :'actor_a_id', false);
select set_config('lean.l4_01.actor_b_id', :'actor_b_id', false);
select set_config('lean.l4_01.request_a_id', :'request_a_id', false);
select set_config('lean.l4_01.request_b_id', :'request_b_id', false);

do $lean_l4_01_concurrency_verify$
declare
  v_pending integer;
  v_reader_cost numeric;
begin
  select count(*) into v_pending
  from public.ai_metering_requests
  where request_id in (
    current_setting('lean.l4_01.request_a_id')::uuid,
    current_setting('lean.l4_01.request_b_id')::uuid
  )
    and state = 'pending';

  select coalesce(sum(
    case
      when state = 'pending' then estimated_cost_usd
      when state = 'completed' then actual_cost_usd
      else 0
    end
  ), 0) into v_reader_cost
  from public.ai_metering_requests
  where plan_code = 'reader'
    and period_start = '2026-08-01 00:00:00+00'
    and user_id in (
      current_setting('lean.l4_01.actor_a_id')::uuid,
      current_setting('lean.l4_01.actor_b_id')::uuid
    )
    and state in ('pending', 'completed');

  if v_pending <> 1 or v_reader_cost <> 49.99 then
    raise exception
      'LEAN_L4_01_CONCURRENCY_FAILED: pending %, Reader cost %',
      v_pending, v_reader_cost;
  end if;
  if exists (
    select 1 from public.credit_accounts
    where user_id in (
      current_setting('lean.l4_01.actor_a_id')::uuid,
      current_setting('lean.l4_01.actor_b_id')::uuid
    )
      and (available_credits <> 10 or reserved_credits <> 0)
  ) then
    raise exception 'LEAN_L4_01_CONCURRENCY_FAILED: shadow changed credits';
  end if;
end;
$lean_l4_01_concurrency_verify$;

select 'LEAN_L4_01_CONCURRENCY_VERIFY: PASS' as result;
