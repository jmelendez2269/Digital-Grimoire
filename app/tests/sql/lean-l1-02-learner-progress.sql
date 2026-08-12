\set ON_ERROR_STOP on

\if :{?prismarium_target}
\else
  \echo 'Missing prismarium_target. This test is local-only.'
  \quit 3
\endif

\if :{?run_id}
\else
  select gen_random_uuid() as run_id \gset
\endif

begin;

select
  gen_random_uuid() as actor_id,
  gen_random_uuid() as other_id,
  gen_random_uuid() as actor_enrollment_id,
  gen_random_uuid() as other_enrollment_id,
  gen_random_uuid() as request_one_id,
  gen_random_uuid() as request_two_id,
  gen_random_uuid() as request_three_id,
  gen_random_uuid() as request_four_id,
  gen_random_uuid() as non_pre_request_id
\gset

select set_config('lean.l1_02.actor_id', :'actor_id', true);
select set_config('lean.l1_02.other_id', :'other_id', true);
select set_config('lean.l1_02.actor_enrollment_id', :'actor_enrollment_id', true);
select set_config('lean.l1_02.other_enrollment_id', :'other_enrollment_id', true);
select set_config('lean.l1_02.request_one_id', :'request_one_id', true);

select
  'lean-l1-02-' || replace(:'run_id', '-', '') as marker,
  'lean-l1-02-a-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email,
  'lean-l1-02-b-' || replace(:'run_id', '-', '') || '@example.invalid' as other_email
\gset

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  :'actor_id', 'authenticated', 'authenticated', :'actor_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L1-02 fixture A"}'::jsonb, now(), now()
),
(
  :'other_id', 'authenticated', 'authenticated', :'other_email', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L1-02 fixture B"}'::jsonb, now(), now()
);

insert into public.courses (title, slug, content, is_published)
values (
  'LEAN L1-02 PRE fixture',
  'pre-how-to-hold-two-things-at-once',
  '{"course_id_tag":"PRE","weeks":[{"week_number":1},{"week_number":2}]}'::jsonb,
  false
)
on conflict (slug) do update
set title = excluded.title,
    content = excluded.content,
    is_published = excluded.is_published
returning id as pre_course_id
\gset

select set_config('lean.l1_02.pre_course_id', :'pre_course_id', true);

insert into public.courses (title, slug, content, is_published)
values (
  'LEAN L1-02 non-PRE fixture',
  :'marker' || '-c01',
  '{"course_id_tag":"C01","weeks":[{"week_number":1}]}'::jsonb,
  true
)
returning id as non_pre_course_id
\gset

insert into public.course_enrollments (
  id, user_id, course_id, current_week, progress
) values
  (:'actor_enrollment_id', :'actor_id', :'pre_course_id', 1, '{}'::jsonb),
  (:'other_enrollment_id', :'other_id', :'pre_course_id', 1, '{}'::jsonb);

do $lean_l1_02_fixture_check$
begin
  if not exists (
    select 1 from public.users
    where id = current_setting('lean.l1_02.actor_id')::uuid
  )
    or not exists (
      select 1 from public.users
      where id = current_setting('lean.l1_02.other_id')::uuid
    )
  then
    raise exception 'LEAN_L1_02_ASSERTION_FAILED: auth profile trigger did not create both fixtures';
  end if;
end;
$lean_l1_02_fixture_check$;

create or replace function pg_temp.lean_l1_02_expect_error(
  p_sql text,
  p_marker text
)
returns void
language plpgsql
as $expect_error$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_marker in sqlerrm) > 0 then
      return;
    end if;
    raise;
  end;

  raise exception 'LEAN_L1_02_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $lean_l1_02_privileges$
begin
  if has_table_privilege('authenticated', 'public.course_enrollments', 'INSERT')
    or has_table_privilege('authenticated', 'public.course_enrollments', 'UPDATE')
    or has_table_privilege('authenticated', 'public.course_enrollments', 'DELETE')
    or has_table_privilege('anon', 'public.course_enrollments', 'UPDATE')
    or has_any_column_privilege('authenticated', 'public.learner_progress_requests', 'SELECT')
    or has_any_column_privilege('authenticated', 'public.learner_progress_requests', 'INSERT')
    or has_function_privilege(
      'authenticated',
      'public.save_learner_course_progress_v1(uuid,uuid,uuid,integer,integer,text,integer[])',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.save_learner_course_progress_v1(uuid,uuid,uuid,integer,integer,text,integer[])',
      'EXECUTE'
    )
  then
    raise exception 'LEAN_L1_02_ASSERTION_FAILED: table or function privileges are unsafe';
  end if;
end;
$lean_l1_02_privileges$;

-- Customer reads see only their own enrollment; the idempotency ledger is not
-- customer-readable at all.
select set_config('request.jwt.claim.sub', :'actor_id', true);
set local role authenticated;
select
  count(*) filter (where user_id = :'actor_id'::uuid) as own_rows,
  count(*) filter (where user_id = :'other_id'::uuid) as other_rows
from public.course_enrollments
where course_id = :'pre_course_id'::uuid
\gset
reset role;

select set_config('lean.l1_02.own_rows', :'own_rows', true);
select set_config('lean.l1_02.other_rows', :'other_rows', true);

do $lean_l1_02_rls$
begin
  if current_setting('lean.l1_02.own_rows')::integer <> 1
    or current_setting('lean.l1_02.other_rows')::integer <> 0
  then
    raise exception 'LEAN_L1_02_ASSERTION_FAILED: owner-only enrollment RLS failed';
  end if;
end;
$lean_l1_02_rls$;

-- `is_published` is false above on purpose. The exact PRE allowlist and owned
-- enrollment, not publication, authorize the progress write.
set local role service_role;
select public.save_learner_course_progress_v1(
  :'actor_id', :'pre_course_id', :'request_one_id', null,
  1, 'read', array[1]
) as first_result
\gset

-- Identical replay returns the original result without a second revision.
select public.save_learner_course_progress_v1(
  :'actor_id', :'pre_course_id', :'request_one_id', null,
  1, 'read', array[1]
) as replay_result
\gset
reset role;

select set_config('lean.l1_02.first_result', :'first_result', true);
select set_config('lean.l1_02.replay_result', :'replay_result', true);

do $lean_l1_02_first_save$
declare
  stored jsonb;
begin
  select progress into stored
  from public.course_enrollments
  where id = current_setting('lean.l1_02.actor_enrollment_id')::uuid;

  if stored->>'revision' <> '1'
    or stored->>'currentWeekNumber' <> '1'
    or stored->>'currentStage' <> 'read'
    or current_setting('lean.l1_02.first_result')::jsonb
      is distinct from current_setting('lean.l1_02.replay_result')::jsonb
    or (
      select count(*) from public.learner_progress_requests
      where request_id = current_setting('lean.l1_02.request_one_id')::uuid
    ) <> 1
  then
    raise exception 'LEAN_L1_02_ASSERTION_FAILED: first save or identical replay failed';
  end if;
end;
$lean_l1_02_first_save$;

select pg_temp.lean_l1_02_expect_error(
  format(
    'select public.save_learner_course_progress_v1(%L::uuid,%L::uuid,%L::uuid,null,1,%L,array[1])',
    :'actor_id', :'pre_course_id', :'request_one_id', 'practice'
  ),
  'LEAN_L1_02:REQUEST_REPLAY_MISMATCH'
);

select pg_temp.lean_l1_02_expect_error(
  format(
    'select public.save_learner_course_progress_v1(%L::uuid,%L::uuid,%L::uuid,0,2,%L,array[1,2])',
    :'actor_id', :'pre_course_id', :'request_two_id', 'start'
  ),
  'LEAN_L1_02:SAVE_CONFLICT'
);

select pg_temp.lean_l1_02_expect_error(
  format(
    'select public.save_learner_course_progress_v1(%L::uuid,%L::uuid,%L::uuid,1,3,%L,array[1,2,3])',
    :'actor_id', :'pre_course_id', :'request_three_id', 'start'
  ),
  'LEAN_L1_02:WEEK_NOT_FOUND'
);

select pg_temp.lean_l1_02_expect_error(
  format(
    'select public.save_learner_course_progress_v1(%L::uuid,%L::uuid,%L::uuid,null,1,%L,array[1])',
    :'actor_id', :'non_pre_course_id', :'non_pre_request_id', 'start'
  ),
  'LEAN_L1_02:COURSE_NOT_ALLOWLISTED'
);

set local role service_role;
select public.save_learner_course_progress_v1(
  :'actor_id', :'pre_course_id', :'request_four_id', 1,
  2, 'practice', array[1,2]
) as second_result
\gset
reset role;

select pg_temp.lean_l1_02_expect_error(
  format(
    'select public.save_learner_course_progress_v1(%L::uuid,%L::uuid,%L::uuid,2,2,%L,array[2])',
    :'actor_id', :'pre_course_id', gen_random_uuid(), 'finish'
  ),
  'LEAN_L1_02:INVALID_REQUEST'
);

do $lean_l1_02_final_state$
declare
  stored jsonb;
begin
  select progress into stored
  from public.course_enrollments
  where id = current_setting('lean.l1_02.actor_enrollment_id')::uuid;

  if stored->>'revision' <> '2'
    or stored->>'currentWeekNumber' <> '2'
    or stored->>'currentStage' <> 'practice'
    or stored->'visitedWeekNumbers' is distinct from '[1,2]'::jsonb
    or (
      select current_week from public.course_enrollments
      where id = current_setting('lean.l1_02.actor_enrollment_id')::uuid
    ) <> 2
    or (
      select count(*) from public.learner_progress_requests
      where user_id = current_setting('lean.l1_02.actor_id')::uuid
    ) <> 2
    or (
      select progress from public.course_enrollments
      where id = current_setting('lean.l1_02.other_enrollment_id')::uuid
    ) <> '{}'::jsonb
  then
    raise exception 'LEAN_L1_02_ASSERTION_FAILED: final owner/revision state is wrong';
  end if;
end;
$lean_l1_02_final_state$;

select
  :'prismarium_target' as target,
  1 as owner_success,
  1 as identical_replay,
  1 as changed_replay_denied,
  1 as stale_revision_denied,
  1 as non_pre_denied,
  1 as unknown_week_denied,
  1 as cross_user_hidden,
  1 as direct_customer_mutation_denied,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id in (:'actor_id'::uuid, :'other_id'::uuid)) +
  (select count(*) from public.course_enrollments where id in (:'actor_enrollment_id'::uuid, :'other_enrollment_id'::uuid)) +
  (select count(*) from public.learner_progress_requests where request_id in (
    :'request_one_id'::uuid, :'request_two_id'::uuid, :'request_three_id'::uuid,
    :'request_four_id'::uuid, :'non_pre_request_id'::uuid
  ))
) as cleanup_residue;

\echo 'LEAN_L1_02_LOCAL_RESULT: PASS'
