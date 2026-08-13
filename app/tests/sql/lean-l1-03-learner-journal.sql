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
  gen_random_uuid() as reader_id,
  gen_random_uuid() as paid_id,
  gen_random_uuid() as outsider_id,
  gen_random_uuid() as reader_enrollment_id,
  gen_random_uuid() as paid_enrollment_id,
  gen_random_uuid() as request_one_id,
  gen_random_uuid() as request_two_id,
  gen_random_uuid() as request_three_id,
  gen_random_uuid() as request_four_id,
  gen_random_uuid() as request_five_id,
  gen_random_uuid() as paid_request_id,
  gen_random_uuid() as outsider_request_id,
  gen_random_uuid() as unknown_week_request_id,
  gen_random_uuid() as non_pre_request_id,
  'lean-l1-03-' || replace(:'run_id', '-', '') as marker
\gset

select set_config('lean.l1_03.reader_id', :'reader_id', true);
select set_config('lean.l1_03.paid_id', :'paid_id', true);
select set_config('lean.l1_03.marker', :'marker', true);
select set_config('lean.l1_03.request_one_id', :'request_one_id', true);

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  :'reader_id', 'authenticated', 'authenticated',
  :'marker' || '-reader@example.invalid', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L1-03 Reader"}'::jsonb, now(), now()
),
(
  :'paid_id', 'authenticated', 'authenticated',
  :'marker' || '-paid@example.invalid', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L1-03 Paid"}'::jsonb, now(), now()
),
(
  :'outsider_id', 'authenticated', 'authenticated',
  :'marker' || '-outsider@example.invalid', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"LEAN L1-03 Outsider"}'::jsonb, now(), now()
);

update public.users
set subscription_status = case
  when id = :'paid_id'::uuid then 'student'
  else 'free'
end
where id in (:'reader_id'::uuid, :'paid_id'::uuid, :'outsider_id'::uuid);

-- L1 runs this story before the authoritative membership projection exists.
-- Full-chain rehearsals run it after L2 has retired the legacy users field as
-- paid authority, so give the same synthetic paid fixture one exact active
-- service-owned membership when that table is present.
select to_regclass('public.billing_memberships') is not null
  as lean_l1_03_has_authoritative_membership
\gset
\if :lean_l1_03_has_authoritative_membership
set local role service_role;
insert into public.billing_memberships (
  user_id,
  plan_code,
  stripe_status,
  pricing_cohort,
  offer_code,
  billing_interval,
  current_period_start,
  current_period_end,
  access_until,
  billing_hold,
  status_observed_at
) values (
  :'paid_id',
  'student',
  'active',
  'founding',
  'student_founding_monthly',
  'month',
  now() - interval '1 day',
  now() + interval '29 days',
  now() + interval '29 days',
  false,
  now()
);
reset role;
\endif

insert into public.courses (title, slug, content, is_published)
values (
  'LEAN L1-03 PRE fixture',
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

insert into public.courses (title, slug, content, is_published)
values (
  'LEAN L1-03 non-PRE fixture',
  :'marker' || '-c01',
  '{"course_id_tag":"C01","weeks":[{"week_number":1}]}'::jsonb,
  true
)
returning id as non_pre_course_id
\gset

insert into public.course_enrollments (
  id, user_id, course_id, current_week, progress
) values
  (:'reader_enrollment_id', :'reader_id', :'pre_course_id', 1, '{}'::jsonb),
  (:'paid_enrollment_id', :'paid_id', :'pre_course_id', 1, '{}'::jsonb);

create or replace function pg_temp.lean_l1_03_expect_error(
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

  raise exception 'LEAN_L1_03_ASSERTION_FAILED: expected error marker %', p_marker;
end;
$expect_error$;

do $lean_l1_03_privileges$
begin
  if has_column_privilege('authenticated', 'public.journal_pages', 'source_key', 'INSERT')
    or has_column_privilege('authenticated', 'public.journal_pages', 'source_key', 'UPDATE')
    or has_column_privilege('authenticated', 'public.journal_pages', 'learner_revision', 'UPDATE')
    or not has_column_privilege('authenticated', 'public.journal_pages', 'title', 'INSERT')
    or not has_column_privilege('authenticated', 'public.journal_pages', 'content', 'UPDATE')
    or has_any_column_privilege('authenticated', 'public.learner_journal_requests', 'SELECT')
    or has_any_column_privilege('authenticated', 'public.learner_journal_requests', 'INSERT')
    or has_function_privilege(
      'authenticated',
      'public.save_learner_journal_page_v1(uuid,uuid,uuid,integer,text,text,text,text,jsonb,uuid,integer)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.save_learner_journal_page_v1(uuid,uuid,uuid,integer,text,text,text,text,jsonb,uuid,integer)',
      'EXECUTE'
    )
  then
    raise exception 'LEAN_L1_03_ASSERTION_FAILED: table, column, or function privileges are unsafe';
  end if;
end;
$lean_l1_03_privileges$;

-- Begin the Reader with 49 active ordinary pages. The PRE workbook save is the
-- 50th and is allowed even though the course row is deliberately unpublished.
insert into public.journal_pages (user_id, title, content, is_archived)
select
  :'reader_id',
  :'marker' || '-reader-' || page_number,
  jsonb_build_object('type', 'doc', 'content', jsonb_build_array()),
  false
from generate_series(1, 49) as page_number;

set local role service_role;
select public.save_learner_journal_page_v1(
  :'reader_id', :'pre_course_id', :'request_one_id',
  1, 'synthesis:week-reflection', 'synthesis', 'Two-Truth Reflection',
  'Week 1 reflection', '{"type":"doc","content":[]}'::jsonb,
  null, null
) as first_result
\gset

select public.save_learner_journal_page_v1(
  :'reader_id', :'pre_course_id', :'request_one_id',
  1, 'synthesis:week-reflection', 'synthesis', 'Two-Truth Reflection',
  'Week 1 reflection', '{"type":"doc","content":[]}'::jsonb,
  null, null
) as replay_result
\gset
reset role;

select set_config('lean.l1_03.first_result', :'first_result', true);
select set_config('lean.l1_03.replay_result', :'replay_result', true);
select set_config(
  'lean.l1_03.reader_page_id',
  (:'first_result'::jsonb->>'pageId'),
  true
);

do $lean_l1_03_first_save$
begin
  if current_setting('lean.l1_03.first_result')::jsonb
      is distinct from current_setting('lean.l1_03.replay_result')::jsonb
    or current_setting('lean.l1_03.first_result')::jsonb->>'revision' <> '1'
    or (
      select count(*) from public.journal_pages
      where user_id = current_setting('lean.l1_03.reader_id')::uuid
        and is_archived is not true
    ) <> 50
    or (
      select count(*) from public.learner_journal_requests
      where request_id = current_setting('lean.l1_03.request_one_id')::uuid
    ) <> 1
  then
    raise exception 'LEAN_L1_03_ASSERTION_FAILED: first save, cap boundary, or replay failed';
  end if;
end;
$lean_l1_03_first_save$;

select pg_temp.lean_l1_03_expect_error(
  format(
    'select public.save_learner_journal_page_v1(%L::uuid,%L::uuid,%L::uuid,1,%L,%L,%L,%L,%L::jsonb,null,null)',
    :'reader_id', :'pre_course_id', :'request_one_id',
    'synthesis:week-reflection', 'synthesis', 'Two-Truth Reflection',
    'Changed replay', '{"type":"doc","content":[{"type":"paragraph"}]}'
  ),
  'LEAN_L1_03:REQUEST_REPLAY_MISMATCH'
);

select pg_temp.lean_l1_03_expect_error(
  format(
    'select public.save_learner_journal_page_v1(%L::uuid,%L::uuid,%L::uuid,2,%L,%L,null,%L,%L::jsonb,null,null)',
    :'reader_id', :'pre_course_id', :'request_two_id',
    'note:second-source', 'note', 'Second source', '{"type":"doc","content":[]}'
  ),
  'LEAN_L1_03:JOURNAL_LIMIT_REACHED'
);

-- Updating the 50th page consumes no new slot and remains allowed.
set local role service_role;
select public.save_learner_journal_page_v1(
  :'reader_id', :'pre_course_id', :'request_three_id',
  1, 'synthesis:week-reflection', 'synthesis', 'Two-Truth Reflection',
  'Week 1 reflection revised', '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  current_setting('lean.l1_03.reader_page_id')::uuid, 1
) as update_result
\gset
reset role;

select pg_temp.lean_l1_03_expect_error(
  format(
    'select public.save_learner_journal_page_v1(%L::uuid,%L::uuid,%L::uuid,1,%L,%L,%L,%L,%L::jsonb,%L::uuid,1)',
    :'reader_id', :'pre_course_id', :'request_four_id',
    'synthesis:week-reflection', 'synthesis', 'Two-Truth Reflection',
    'Stale update', '{"type":"doc","content":[]}',
    current_setting('lean.l1_03.reader_page_id')
  ),
  'LEAN_L1_03:SAVE_CONFLICT'
);

-- Ordinary direct writes also meet the same database cap.
select set_config('request.jwt.claim.sub', :'reader_id', true);
set local role authenticated;
select pg_temp.lean_l1_03_expect_error(
  format(
    'insert into public.journal_pages (user_id,title,content,is_archived) values (%L::uuid,%L,%L::jsonb,false)',
    :'reader_id', :'marker' || '-blocked-direct', '{"type":"doc","content":[]}'
  ),
  'LEAN_L1_03:JOURNAL_LIMIT_REACHED'
);
reset role;

-- Archiving one page creates one slot, which an authorized PRE save can use.
update public.journal_pages
set is_archived = true
where user_id = :'reader_id'::uuid
  and title = :'marker' || '-reader-1';

set local role service_role;
select public.save_learner_journal_page_v1(
  :'reader_id', :'pre_course_id', :'request_five_id',
  2, 'note:second-source', 'note', null,
  'Second source', '{"type":"doc","content":[]}'::jsonb,
  null, null
) as second_source_result
\gset
reset role;

select pg_temp.lean_l1_03_expect_error(
  format(
    'select public.save_learner_journal_page_v1(%L::uuid,%L::uuid,%L::uuid,3,%L,%L,null,%L,%L::jsonb,null,null)',
    :'reader_id', :'pre_course_id', :'unknown_week_request_id',
    'note:unknown-week', 'note', 'Unknown week', '{"type":"doc","content":[]}'
  ),
  'LEAN_L1_03:WEEK_NOT_FOUND'
);

select pg_temp.lean_l1_03_expect_error(
  format(
    'select public.save_learner_journal_page_v1(%L::uuid,%L::uuid,%L::uuid,1,%L,%L,null,%L,%L::jsonb,null,null)',
    :'reader_id', :'non_pre_course_id', :'non_pre_request_id',
    'note:non-pre', 'note', 'Non PRE', '{"type":"doc","content":[]}'
  ),
  'LEAN_L1_03:COURSE_NOT_ALLOWLISTED'
);

select pg_temp.lean_l1_03_expect_error(
  format(
    'select public.save_learner_journal_page_v1(%L::uuid,%L::uuid,%L::uuid,1,%L,%L,null,%L,%L::jsonb,null,null)',
    :'outsider_id', :'pre_course_id', :'outsider_request_id',
    'note:no-enrollment', 'note', 'No enrollment', '{"type":"doc","content":[]}'
  ),
  'LEAN_L1_03:ENROLLMENT_REQUIRED'
);

-- Paid is unlimited. After a downgrade above 50, all work stays visible and
-- editable. Restore remains blocked until active pages are below 50.
insert into public.journal_pages (user_id, title, content, is_archived)
select
  :'paid_id',
  :'marker' || '-paid-' || page_number,
  '{"type":"doc","content":[]}'::jsonb,
  false
from generate_series(1, 51) as page_number;

set local role service_role;
select public.save_learner_journal_page_v1(
  :'paid_id', :'pre_course_id', :'paid_request_id',
  1, 'capstone:paid', 'capstone', null,
  'Paid workbook page', '{"type":"doc","content":[]}'::jsonb,
  null, null
) as paid_result
\gset
reset role;

\if :lean_l1_03_has_authoritative_membership
set local role service_role;
delete from public.billing_memberships where user_id = :'paid_id'::uuid;
reset role;
\endif
update public.users set subscription_status = 'free' where id = :'paid_id'::uuid;

select set_config('request.jwt.claim.sub', :'paid_id', true);
set local role authenticated;
update public.journal_pages
set title = :'marker' || '-paid-edited'
where user_id = :'paid_id'::uuid
  and title = :'marker' || '-paid-4';

update public.journal_pages set is_archived = true
where user_id = :'paid_id'::uuid and title = :'marker' || '-paid-1';

select pg_temp.lean_l1_03_expect_error(
  format(
    'update public.journal_pages set is_archived=false where user_id=%L::uuid and title=%L',
    :'paid_id', :'marker' || '-paid-1'
  ),
  'LEAN_L1_03:JOURNAL_LIMIT_REACHED'
);

update public.journal_pages set is_archived = true
where user_id = :'paid_id'::uuid and title in (
  :'marker' || '-paid-2', :'marker' || '-paid-3'
);

update public.journal_pages set is_archived = false
where user_id = :'paid_id'::uuid and title = :'marker' || '-paid-1';

select
  count(*) as paid_total_rows,
  count(*) filter (where is_archived is not true) as paid_active_rows,
  count(*) filter (where title = :'marker' || '-paid-edited') as paid_edited_rows
from public.journal_pages
where user_id = :'paid_id'::uuid
\gset
reset role;

select set_config('lean.l1_03.paid_total_rows', :'paid_total_rows', true);
select set_config('lean.l1_03.paid_active_rows', :'paid_active_rows', true);
select set_config('lean.l1_03.paid_edited_rows', :'paid_edited_rows', true);
select set_config('lean.l1_03.update_result', :'update_result', true);
select set_config('lean.l1_03.second_source_result', :'second_source_result', true);

select set_config('request.jwt.claim.sub', :'reader_id', true);
set local role authenticated;
select count(*) as cross_user_rows
from public.journal_pages
where user_id = :'paid_id'::uuid
\gset
reset role;

select set_config('lean.l1_03.cross_user_rows', :'cross_user_rows', true);

do $lean_l1_03_final$
begin
  if current_setting('lean.l1_03.paid_total_rows')::integer <> 52
    or current_setting('lean.l1_03.paid_active_rows')::integer <> 50
    or current_setting('lean.l1_03.paid_edited_rows')::integer <> 1
    or current_setting('lean.l1_03.cross_user_rows')::integer <> 0
    or current_setting('lean.l1_03.update_result')::jsonb->>'revision' <> '2'
    or current_setting('lean.l1_03.second_source_result')::jsonb->>'revision' <> '1'
    or (
      select count(*) from public.journal_pages
      where user_id = current_setting('lean.l1_03.reader_id')::uuid
        and is_archived is not true
    ) <> 50
  then
    raise exception 'LEAN_L1_03_ASSERTION_FAILED: final cap, retention, edit, reload, or RLS state is wrong';
  end if;
end;
$lean_l1_03_final$;

select
  :'prismarium_target' as target,
  1 as reader_boundary,
  1 as paid_unlimited,
  1 as downgraded_retained,
  1 as edit_over_limit,
  1 as restore_gate,
  1 as identical_replay,
  1 as changed_replay_denied,
  1 as stale_revision_denied,
  1 as unknown_week_denied,
  1 as non_pre_denied,
  1 as unenrolled_denied,
  1 as cross_user_hidden,
  1 as metadata_protected,
  'PASS' as result;

rollback;

select (
  (select count(*) from auth.users where id in (
    :'reader_id'::uuid, :'paid_id'::uuid, :'outsider_id'::uuid
  )) +
  (select count(*) from public.journal_pages where title like :'marker' || '%') +
  (select count(*) from public.learner_journal_requests where request_id in (
    :'request_one_id'::uuid, :'request_two_id'::uuid, :'request_three_id'::uuid,
    :'request_four_id'::uuid, :'request_five_id'::uuid, :'paid_request_id'::uuid,
    :'outsider_request_id'::uuid, :'unknown_week_request_id'::uuid,
    :'non_pre_request_id'::uuid
  ))
) as cleanup_residue;

\echo 'LEAN_L1_03_LOCAL_RESULT: PASS'
