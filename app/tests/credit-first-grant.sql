\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values ('95000000-0000-4000-8000-000000000001','first-credit-test@example.test');
insert into public.billing_memberships(user_id,plan_code,stripe_status,pricing_cohort,offer_code,billing_interval,stripe_customer_id,stripe_subscription_id,current_period_start,current_period_end,access_until,last_stripe_event_id,last_stripe_event_created)
values ('95000000-0000-4000-8000-000000000001','student','active','founding','student_founding_monthly','month','cus_firstCreditTest','sub_firstCreditTest',now()-interval '1 day',now()+interval '29 days',now()+interval '29 days','evt_firstCreditTest',extract(epoch from now())::bigint);
do $$
declare effective timestamptz := now() - interval '1 second'; state text;
begin
  state := public.sync_monthly_credit_grant_v1('95000000-0000-4000-8000-000000000001',effective);
  if not exists (select 1 from public.credit_accounts where user_id = '95000000-0000-4000-8000-000000000001' and available_credits = 30 and created_at = effective and updated_at = effective) then
    raise exception 'First paid grant failed: %', state;
  end if;
  perform public.sync_monthly_credit_grant_v1('95000000-0000-4000-8000-000000000001',effective);
  if (select count(*) from public.credit_grants where user_id = '95000000-0000-4000-8000-000000000001') <> 1 then raise exception 'Duplicate first grant'; end if;
end $$;
rollback;
