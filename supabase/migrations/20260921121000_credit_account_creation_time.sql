-- A server passes its request timestamp before the database creates the first
-- account. Use that same timestamp for creation and the grant update, otherwise
-- updated_at can precede DEFAULT now() and violate the account constraint.
begin;
do $$
declare signature text; original text; corrected text;
begin
  foreach signature in array array[
    'public.sync_monthly_credit_grant_v1(uuid,timestamp with time zone)',
    'public.sync_monthly_credit_grant_legacy_v1(uuid,timestamp with time zone)'
  ] loop
    original := pg_get_functiondef(signature::regprocedure);
    corrected := regexp_replace(original,
      'insert into public.credit_accounts \(user_id\)\s+values \(p_user_id\)',
      'insert into public.credit_accounts (user_id, created_at, updated_at) values (p_user_id, p_effective_at, p_effective_at)');
    if corrected = original then raise exception 'Unexpected credit account initializer in %', signature; end if;
    execute corrected;
  end loop;
end $$;
commit;
