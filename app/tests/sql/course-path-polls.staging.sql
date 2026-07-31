\set ON_ERROR_STOP on

-- STAGING ONLY.
--
-- Run this file with psql and the explicit marker:
--   --set=prismarium_target=staging
--
-- Every fixture and state change is enclosed in one transaction. A successful
-- run reaches the explicit ROLLBACK at the bottom. With ON_ERROR_STOP enabled,
-- a failed run exits psql, which also rolls back the open transaction when the
-- connection closes.

\if :{?prismarium_target}
\else
  \echo 'REFUSING TO RUN: pass --set=prismarium_target=staging'
  \quit 3
\endif

select lower(:'prismarium_target') = 'staging' as prismarium_target_is_staging
\gset

\if :prismarium_target_is_staging
\else
  \echo 'REFUSING TO RUN: prismarium_target must be exactly "staging"'
  \quit 3
\endif

\echo 'Running the course-path ballot integration test in a rollback-only transaction...'

begin;

set local application_name =
  'prismarium-course-path-poll-staging-rollback-test';
set local lock_timeout = '5s';
set local statement_timeout = '90s';

-- Prevent two copies of this test from changing the same fixed course slugs at
-- once. The lock is automatically released by ROLLBACK.
select pg_advisory_xact_lock(
  hashtextextended(
    'prismarium-course-path-poll-staging-rollback-test',
    0
  )
);

-- Creating one temporary object initializes this session's pg_temp namespace.
create temporary table course_path_poll_test_bootstrap (
  initialized boolean not null
) on commit drop;

insert into course_path_poll_test_bootstrap (initialized) values (true);

create function pg_temp.course_path_poll_assert(
  condition boolean,
  assertion_message text
)
returns void
language plpgsql
as $assertion$
begin
  if condition is distinct from true then
    raise exception 'COURSE_POLL_TEST_ASSERTION_FAILED: %', assertion_message;
  end if;
end;
$assertion$;

-- Fail clearly when the migration has not been applied to the target.
select pg_temp.course_path_poll_assert(
  to_regclass('public.course_path_polls') is not null,
  'course_path_polls table is missing; apply migration 20260730000200 first'
);
select pg_temp.course_path_poll_assert(
  to_regclass('public.course_path_poll_options') is not null,
  'course_path_poll_options table is missing'
);
select pg_temp.course_path_poll_assert(
  to_regclass('public.course_path_poll_votes') is not null,
  'course_path_poll_votes table is missing'
);
select pg_temp.course_path_poll_assert(
  to_regclass('public.course_path_poll_rate_buckets') is not null,
  'course_path_poll_rate_buckets table is missing'
);
select pg_temp.course_path_poll_assert(
  to_regprocedure(
    'public.course_path_poll_create_draft(text,text,uuid[],uuid)'
  ) is not null,
  'course_path_poll_create_draft function is missing'
);
select pg_temp.course_path_poll_assert(
  to_regprocedure('public.course_path_poll_open(uuid,uuid)') is not null,
  'course_path_poll_open function is missing'
);
select pg_temp.course_path_poll_assert(
  to_regprocedure(
    'public.course_path_poll_launch_records_ready(uuid)'
  ) is not null,
  'course_path_poll_launch_records_ready function is missing'
);
select pg_temp.course_path_poll_assert(
  to_regprocedure(
    'public.course_path_poll_public_view(text,text)'
  ) is not null,
  'course_path_poll_public_view function is missing'
);
select pg_temp.course_path_poll_assert(
  to_regprocedure(
    'public.course_path_poll_cast_vote(text,uuid,text,text,integer,integer)'
  ) is not null,
  'course_path_poll_cast_vote function is missing'
);
select pg_temp.course_path_poll_assert(
  to_regprocedure('public.course_path_poll_close(uuid,uuid)') is not null,
  'course_path_poll_close function is missing'
);
select pg_temp.course_path_poll_assert(
  to_regprocedure(
    'public.course_path_poll_record_editorial_decision(uuid,uuid,text,uuid)'
  ) is not null,
  'course_path_poll_record_editorial_decision function is missing'
);
select pg_temp.course_path_poll_assert(
  to_regprocedure('public.course_path_poll_archive(uuid,uuid)') is not null,
  'course_path_poll_archive function is missing'
);

select pg_temp.course_path_poll_assert(
  to_regrole('service_role') is not null
    and to_regrole('anon') is not null
    and to_regrole('authenticated') is not null,
  'expected Supabase roles service_role, anon, and authenticated'
);

-- The four ballot tables must remain service-only. Validate both ACLs and RLS,
-- then make two direct denied-access probes as anon/authenticated below.
do $privileges$
declare
  table_name text;
  relation_oid regclass;
  row_security_enabled boolean;
  policy_count integer;
begin
  foreach table_name in array array[
    'public.course_path_polls',
    'public.course_path_poll_options',
    'public.course_path_poll_votes',
    'public.course_path_poll_rate_buckets'
  ]
  loop
    relation_oid := to_regclass(table_name);

    perform pg_temp.course_path_poll_assert(
      has_table_privilege('service_role', table_name, 'SELECT')
        and has_table_privilege('service_role', table_name, 'INSERT')
        and has_table_privilege('service_role', table_name, 'UPDATE')
        and has_table_privilege('service_role', table_name, 'DELETE'),
      table_name || ' must grant full DML to service_role'
    );
    perform pg_temp.course_path_poll_assert(
      not has_table_privilege('anon', table_name, 'SELECT')
        and not has_table_privilege('anon', table_name, 'INSERT')
        and not has_table_privilege('anon', table_name, 'UPDATE')
        and not has_table_privilege('anon', table_name, 'DELETE')
        and not has_table_privilege('authenticated', table_name, 'SELECT')
        and not has_table_privilege('authenticated', table_name, 'INSERT')
        and not has_table_privilege('authenticated', table_name, 'UPDATE')
        and not has_table_privilege('authenticated', table_name, 'DELETE'),
      table_name || ' must not grant visitor/member table access'
    );

    select relation.relrowsecurity
      into row_security_enabled
    from pg_class as relation
    where relation.oid = relation_oid;

    perform pg_temp.course_path_poll_assert(
      row_security_enabled,
      table_name || ' must have row-level security enabled'
    );

    select count(*)
      into policy_count
    from pg_policies
    where schemaname = split_part(table_name, '.', 1)
      and tablename = split_part(table_name, '.', 2);

    perform pg_temp.course_path_poll_assert(
      policy_count = 0,
      table_name || ' must not expose rows through an RLS policy'
    );
  end loop;
end;
$privileges$;

do $function_privileges$
declare
  function_name text;
  function_oid regprocedure;
begin
  foreach function_name in array array[
    'public.course_path_poll_create_draft(text,text,uuid[],uuid)',
    'public.course_path_poll_launch_records_ready(uuid)',
    'public.course_path_poll_open(uuid,uuid)',
    'public.course_path_poll_public_view(text,text)',
    'public.course_path_poll_admin_vote_counts()',
    'public.course_path_poll_cast_vote(text,uuid,text,text,integer,integer)',
    'public.course_path_poll_close(uuid,uuid)',
    'public.course_path_poll_record_editorial_decision(uuid,uuid,text,uuid)',
    'public.course_path_poll_archive(uuid,uuid)'
  ]
  loop
    function_oid := to_regprocedure(function_name);
    perform pg_temp.course_path_poll_assert(
      function_oid is not null,
      function_name || ' is missing'
    );
    perform pg_temp.course_path_poll_assert(
      has_function_privilege('service_role', function_name, 'EXECUTE'),
      function_name || ' must be executable by service_role'
    );
    perform pg_temp.course_path_poll_assert(
      not has_function_privilege('anon', function_name, 'EXECUTE')
        and not has_function_privilege(
          'authenticated',
          function_name,
          'EXECUTE'
        ),
      function_name || ' must not be executable by anon/authenticated'
    );
  end loop;
end;
$function_privileges$;

-- Exercise the ACLs themselves, not only the catalog predicates.
set local role anon;
do $anon_denial$
begin
  begin
    perform 1 from public.course_path_polls limit 1;
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: anon unexpectedly read poll rows';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.course_path_poll_public_view(
      'permission-probe',
      null
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: anon unexpectedly executed public_view';
  exception
    when insufficient_privilege then null;
  end;
end;
$anon_denial$;
reset role;

set local role authenticated;
do $authenticated_denial$
begin
  begin
    perform 1 from public.course_path_poll_votes limit 1;
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: authenticated unexpectedly read votes';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.course_path_poll_cast_vote(
      'permission-probe',
      '00000000-0000-0000-0000-000000000001'::uuid,
      repeat('f', 64),
      null,
      10,
      60
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: authenticated unexpectedly cast a vote';
  exception
    when insufficient_privilege then null;
  end;
end;
$authenticated_denial$;
reset role;

-- The unique partial index permits only one open ballot. Do not interfere with
-- an intentionally open staging ballot; ask the operator to close it first.
select pg_temp.course_path_poll_assert(
  not exists (
    select 1
    from public.course_path_polls
    where status = 'open'
  ),
  'staging already has an open ballot; close it before running this test'
);

create temporary table course_path_poll_test_context (
  admin_id uuid not null,
  member_id uuid not null,
  pre_id uuid not null,
  c01_id uuid not null,
  fd01_id uuid not null,
  poll_slug text not null,
  secondary_poll_slug text not null,
  poll_id uuid,
  secondary_poll_id uuid,
  c01_option_id uuid,
  fd01_option_id uuid,
  secondary_c01_option_id uuid,
  secondary_fd01_option_id uuid
) on commit drop;

insert into course_path_poll_test_context (
  admin_id,
  member_id,
  pre_id,
  c01_id,
  fd01_id,
  poll_slug,
  secondary_poll_slug
)
values (
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  'staging-ballot-' || replace(gen_random_uuid()::text, '-', ''),
  'staging-ballot-tie-' || replace(gen_random_uuid()::text, '-', '')
);

insert into public.users (id, email, name, role)
select
  context.admin_id,
  'course-poll-admin-' || context.admin_id::text || '@invalid.example',
  'Course poll staging test admin',
  'admin'
from course_path_poll_test_context as context;

insert into public.users (id, email, name, role)
select
  context.member_id,
  'course-poll-member-' || context.member_id::text || '@invalid.example',
  'Course poll staging test member',
  'user'
from course_path_poll_test_context as context;

-- Use the fixed launch slugs required by course_path_poll_open. Existing
-- staging rows are reused; only is_published is changed, and ROLLBACK restores
-- its original value. If a course is absent, the inserted fixture also rolls
-- back.
insert into public.courses (
  id,
  title,
  slug,
  premise,
  content,
  is_published
)
select
  context.pre_id,
  'PRE — How to Hold Two Things at Once',
  'pre-how-to-hold-two-things-at-once',
  'Shared beginning',
  jsonb_build_object(
    'course_id_tag',
    'PRE',
    'core_question',
    'How can we hold tension without collapsing it?'
  ),
  false
from course_path_poll_test_context as context
on conflict (slug) do update
set is_published = excluded.is_published;

insert into public.courses (
  id,
  title,
  slug,
  premise,
  content,
  is_published
)
select
  context.c01_id,
  'How Humans Know What They Know',
  'c01-how-humans-know-what-they-know',
  'A course about knowledge',
  jsonb_build_object(
    'course_id_tag',
    'C01',
    'core_question',
    'How do humans know what they know?'
  ),
  true
from course_path_poll_test_context as context
on conflict (slug) do update
set is_published = excluded.is_published;

insert into public.courses (
  id,
  title,
  slug,
  premise,
  content,
  is_published
)
select
  context.fd01_id,
  'Mythic Imagination',
  'fd01-mythic-imagination-from-classical-pattern-to-personal-meaning',
  'A course about mythic comparison',
  jsonb_build_object(
    'course_id_tag',
    'FD01',
    'core_question',
    'What can comparison support without claiming transmission?'
  ),
  false
from course_path_poll_test_context as context
on conflict (slug) do update
set is_published = excluded.is_published;

update course_path_poll_test_context as context
set
  pre_id = pre_course.id,
  c01_id = c01_course.id,
  fd01_id = fd01_course.id
from public.courses as pre_course,
  public.courses as c01_course,
  public.courses as fd01_course
where pre_course.slug = 'pre-how-to-hold-two-things-at-once'
  and c01_course.slug = 'c01-how-humans-know-what-they-know'
  and fd01_course.slug =
    'fd01-mythic-imagination-from-classical-pattern-to-personal-meaning';

grant select, update on course_path_poll_test_context to service_role;

-- Visitor/member calls are denied above. The remainder runs exactly as the
-- server-side data layer does: through service_role.
set local role service_role;

-- Admin authorization is checked inside the SECURITY DEFINER function.
do $unauthorized_draft$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_create_draft(
      context_record.poll_slug,
      'Which course should become the next YouTube series?',
      array[context_record.c01_id, context_record.fd01_id],
      context_record.member_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: non-admin created a draft';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_ADMIN_REQUIRED' then
        raise;
      end if;
  end;
end;
$unauthorized_draft$;

do $requires_two_options$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_create_draft(
      context_record.poll_slug,
      'Which course should become the next YouTube series?',
      array[context_record.c01_id],
      context_record.admin_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: one-option draft was accepted';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_REQUIRES_TWO_DISTINCT_OPTIONS' then
        raise;
      end if;
  end;

  begin
    perform public.course_path_poll_create_draft(
      context_record.poll_slug,
      'Which course should become the next YouTube series?',
      array[context_record.c01_id, context_record.c01_id],
      context_record.admin_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: duplicate options were accepted';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_REQUIRES_TWO_DISTINCT_OPTIONS' then
        raise;
      end if;
  end;
end;
$requires_two_options$;

-- FD01 is intentionally unpublished at this point.
do $published_options_required$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_create_draft(
      context_record.poll_slug,
      'Which course should become the next YouTube series?',
      array[context_record.c01_id, context_record.fd01_id],
      context_record.admin_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: unpublished option was accepted';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_OPTIONS_MUST_BE_PUBLISHED' then
        raise;
      end if;
  end;
end;
$published_options_required$;

reset role;
update public.courses
set is_published = true
where id = (
  select fd01_id from course_path_poll_test_context
);
set local role service_role;

update course_path_poll_test_context as context
set poll_id = public.course_path_poll_create_draft(
  context.poll_slug,
  'Which course should become the next YouTube series?',
  array[context.c01_id, context.fd01_id],
  context.admin_id
);

update course_path_poll_test_context as context
set secondary_poll_id = public.course_path_poll_create_draft(
  context.secondary_poll_slug,
  'Tie-path integration fixture',
  array[context.c01_id, context.fd01_id],
  context.admin_id
);

update course_path_poll_test_context as context
set
  c01_option_id = primary_c01.id,
  fd01_option_id = primary_fd01.id,
  secondary_c01_option_id = secondary_c01.id,
  secondary_fd01_option_id = secondary_fd01.id
from public.course_path_poll_options as primary_c01,
  public.course_path_poll_options as primary_fd01,
  public.course_path_poll_options as secondary_c01,
  public.course_path_poll_options as secondary_fd01
where primary_c01.poll_id = context.poll_id
  and primary_c01.course_id = context.c01_id
  and primary_fd01.poll_id = context.poll_id
  and primary_fd01.course_id = context.fd01_id
  and secondary_c01.poll_id = context.secondary_poll_id
  and secondary_c01.course_id = context.c01_id
  and secondary_fd01.poll_id = context.secondary_poll_id
  and secondary_fd01.course_id = context.fd01_id;

do $draft_shape$
declare
  context_record record;
  option_count integer;
  option_slugs text[];
  option_orders smallint[];
  published_option_count integer;
begin
  select * into context_record from course_path_poll_test_context;

  select
    count(*),
    array_agg(course.slug order by option_record.sort_order),
    array_agg(option_record.sort_order order by option_record.sort_order)
  into option_count, option_slugs, option_orders
  from public.course_path_poll_options as option_record
  join public.courses as course on course.id = option_record.course_id
  where option_record.poll_id = context_record.poll_id;

  select count(*)
    into published_option_count
  from public.course_path_poll_options as option_record
  join public.courses as course on course.id = option_record.course_id
  where option_record.poll_id = context_record.poll_id
    and course.is_published;

  perform pg_temp.course_path_poll_assert(
    option_count = 2,
    'draft must have exactly two options'
  );
  perform pg_temp.course_path_poll_assert(
    option_slugs = array[
      'c01-how-humans-know-what-they-know',
      'fd01-mythic-imagination-from-classical-pattern-to-personal-meaning'
    ],
    'draft options must be C01 then FD01'
  );
  perform pg_temp.course_path_poll_assert(
    option_orders = array[0, 1]::smallint[],
    'draft option order must be stable'
  );
  perform pg_temp.course_path_poll_assert(
    published_option_count = 2,
    'both draft options must be published'
  );
end;
$draft_shape$;

do $unauthorized_open$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_open(
      context_record.poll_id,
      context_record.member_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: non-admin opened a poll';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_ADMIN_REQUIRED' then
        raise;
      end if;
  end;
end;
$unauthorized_open$;

-- Both candidates are published, but PRE is not. Opening must remain gated.
do $pre_gate$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_open(
      context_record.poll_id,
      context_record.admin_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: poll opened without published PRE';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_PRE_PUBLIC_RECORD_REQUIRED' then
        raise;
      end if;
  end;
end;
$pre_gate$;

reset role;
update public.courses
set is_published = true
where id = (
  select pre_id from course_path_poll_test_context
);

-- Snapshot course state after satisfying the publication gate. Ballot close,
-- audience result, editorial decision, and archive must not mutate it.
create temporary table course_path_poll_test_course_snapshot
on commit drop
as
select
  course.id,
  course.title,
  course.slug,
  course.description,
  course.premise,
  course.learning_outcomes,
  course.course_type,
  course.level,
  course.duration_weeks,
  course.content,
  course.is_published,
  course.created_at,
  course.updated_at
from public.courses as course
where course.id in (
  select pre_id from course_path_poll_test_context
  union all
  select c01_id from course_path_poll_test_context
  union all
  select fd01_id from course_path_poll_test_context
);

grant select on course_path_poll_test_course_snapshot to service_role;
set local role service_role;

select public.course_path_poll_open(
  context.poll_id,
  context.admin_id
)
from course_path_poll_test_context as context;

select pg_temp.course_path_poll_assert(
  (
    select poll.status = 'open'
      and poll.opened_at is not null
      and poll.opened_by = context.admin_id
    from public.course_path_polls as poll
    cross join course_path_poll_test_context as context
    where poll.id = context.poll_id
  ),
  'manual open must record open status, timestamp, and actor'
);

-- All option mutations must be blocked after opening.
do $option_lock$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    update public.course_path_poll_options
    set label_override = 'Must remain locked'
    where id = context_record.c01_option_id;
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: open option update was accepted';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_OPTIONS_LOCKED' then
        raise;
      end if;
  end;

  begin
    delete from public.course_path_poll_options
    where id = context_record.fd01_option_id;
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: open option delete was accepted';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_OPTIONS_LOCKED' then
        raise;
      end if;
  end;

  begin
    insert into public.course_path_poll_options (
      poll_id,
      course_id,
      sort_order
    )
    values (
      context_record.poll_id,
      context_record.c01_id,
      0
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: open option insert was accepted';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_OPTIONS_LOCKED' then
        raise;
      end if;
  end;
end;
$option_lock$;

-- An open ballot must fail closed if PRE or either candidate becomes
-- unpublished after opening. Each unavailable attempt consumes its voter rate
-- bucket, returns a safe sentinel, writes no vote, and hides the open poll.
update public.courses
set is_published = false
where id = (
  select pre_id from course_path_poll_test_context
);

do $pre_unpublished_vote$
declare
  context_record record;
  payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;
  payload := public.course_path_poll_cast_vote(
    context_record.poll_slug,
    context_record.c01_option_id,
    repeat('b', 64),
    null,
    10,
    60
  );

  perform pg_temp.course_path_poll_assert(
    payload = jsonb_build_object('errorCode', 'not_available'),
    'unpublished PRE must return the not_available vote sentinel'
  );
  perform pg_temp.course_path_poll_assert(
    public.course_path_poll_public_view(
      context_record.poll_slug,
      repeat('b', 64)
    ) is null,
    'open public view must disappear while PRE is unpublished'
  );
  perform pg_temp.course_path_poll_assert(
    not exists (
      select 1
      from public.course_path_poll_votes
      where poll_id = context_record.poll_id
        and voter_hash = repeat('b', 64)
    ),
    'unavailable PRE attempt must not write a vote'
  );
  perform pg_temp.course_path_poll_assert(
    (
      select count(*) = 1 and min(request_count) = 1
      from public.course_path_poll_rate_buckets
      where poll_id = context_record.poll_id
        and identifier_kind = 'voter'
        and identifier_hash = repeat('b', 64)
    ),
    'unavailable PRE attempt must consume one atomic rate bucket'
  );
end;
$pre_unpublished_vote$;

update public.courses
set is_published = true
where id = (
  select pre_id from course_path_poll_test_context
);

update public.courses
set is_published = false
where id = (
  select c01_id from course_path_poll_test_context
);

do $c01_unpublished_vote$
declare
  context_record record;
  payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;
  payload := public.course_path_poll_cast_vote(
    context_record.poll_slug,
    context_record.fd01_option_id,
    repeat('c', 64),
    null,
    10,
    60
  );

  perform pg_temp.course_path_poll_assert(
    payload = jsonb_build_object('errorCode', 'not_available'),
    'unpublished C01 must return the not_available vote sentinel'
  );
  perform pg_temp.course_path_poll_assert(
    public.course_path_poll_public_view(
      context_record.poll_slug,
      repeat('c', 64)
    ) is null,
    'open public view must disappear while C01 is unpublished'
  );
  perform pg_temp.course_path_poll_assert(
    not exists (
      select 1
      from public.course_path_poll_votes
      where poll_id = context_record.poll_id
        and voter_hash = repeat('c', 64)
    ),
    'unavailable C01 attempt must not write a vote'
  );
  perform pg_temp.course_path_poll_assert(
    (
      select count(*) = 1 and min(request_count) = 1
      from public.course_path_poll_rate_buckets
      where poll_id = context_record.poll_id
        and identifier_kind = 'voter'
        and identifier_hash = repeat('c', 64)
    ),
    'unavailable C01 attempt must consume one atomic rate bucket'
  );
end;
$c01_unpublished_vote$;

update public.courses
set is_published = true
where id = (
  select c01_id from course_path_poll_test_context
);

update public.courses
set is_published = false
where id = (
  select fd01_id from course_path_poll_test_context
);

do $fd01_unpublished_vote$
declare
  context_record record;
  payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;
  payload := public.course_path_poll_cast_vote(
    context_record.poll_slug,
    context_record.c01_option_id,
    repeat('d', 64),
    null,
    10,
    60
  );

  perform pg_temp.course_path_poll_assert(
    payload = jsonb_build_object('errorCode', 'not_available'),
    'unpublished FD01 must return the not_available vote sentinel'
  );
  perform pg_temp.course_path_poll_assert(
    public.course_path_poll_public_view(
      context_record.poll_slug,
      repeat('d', 64)
    ) is null,
    'open public view must disappear while FD01 is unpublished'
  );
  perform pg_temp.course_path_poll_assert(
    not exists (
      select 1
      from public.course_path_poll_votes
      where poll_id = context_record.poll_id
        and voter_hash = repeat('d', 64)
    ),
    'unavailable FD01 attempt must not write a vote'
  );
  perform pg_temp.course_path_poll_assert(
    (
      select count(*) = 1 and min(request_count) = 1
      from public.course_path_poll_rate_buckets
      where poll_id = context_record.poll_id
        and identifier_kind = 'voter'
        and identifier_hash = repeat('d', 64)
    ),
    'unavailable FD01 attempt must consume one atomic rate bucket'
  );
end;
$fd01_unpublished_vote$;

update public.courses
set is_published = true
where id = (
  select fd01_id from course_path_poll_test_context
);

-- Live totals stay hidden for a browser that has not voted.
do $hidden_live_totals$
declare
  context_record record;
  payload jsonb;
  option_payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;
  payload := public.course_path_poll_public_view(
    context_record.poll_slug,
    repeat('9', 64)
  );

  perform pg_temp.course_path_poll_assert(
    payload ->> 'status' = 'open',
    'public view must expose open status'
  );
  perform pg_temp.course_path_poll_assert(
    (payload ->> 'resultsVisible')::boolean is false,
    'live results must be hidden before this browser votes'
  );
  perform pg_temp.course_path_poll_assert(
    payload -> 'totalVotes' = 'null'::jsonb,
    'hidden live total must be JSON null'
  );
  perform pg_temp.course_path_poll_assert(
    payload -> 'viewerChoiceOptionId' = 'null'::jsonb,
    'non-voter must not have a viewer choice'
  );
  perform pg_temp.course_path_poll_assert(
    jsonb_array_length(payload -> 'options') = 2,
    'public view must contain exactly two safe options'
  );

  for option_payload in
    select value from jsonb_array_elements(payload -> 'options')
  loop
    perform pg_temp.course_path_poll_assert(
      option_payload -> 'voteCount' = 'null'::jsonb
        and option_payload -> 'percentage' = 'null'::jsonb,
      'each live count and percentage must be hidden before voting'
    );
  end loop;
end;
$hidden_live_totals$;

-- An option belonging to another poll returns a safe sentinel after rate
-- accounting. The counter commits while the invalid vote never does.
do $cross_poll_rejected$
declare
  context_record record;
  payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;

  payload := public.course_path_poll_cast_vote(
    context_record.poll_slug,
    context_record.secondary_c01_option_id,
    repeat('6', 64),
    null,
    10,
    60
  );

  perform pg_temp.course_path_poll_assert(
    payload = jsonb_build_object('errorCode', 'option_mismatch'),
    'cross-poll vote must return the option_mismatch sentinel'
  );
  perform pg_temp.course_path_poll_assert(
    (
      select count(*) = 1 and min(request_count) = 1
      from public.course_path_poll_rate_buckets
      where poll_id = context_record.poll_id
        and identifier_kind = 'voter'
        and identifier_hash = repeat('6', 64)
    ),
    'rejected cross-poll option must consume one atomic rate bucket'
  );
  perform pg_temp.course_path_poll_assert(
    not exists (
      select 1
      from public.course_path_poll_votes
      where poll_id = context_record.poll_id
        and voter_hash = repeat('6', 64)
    ),
    'rejected cross-poll option must not write a vote'
  );
end;
$cross_poll_rejected$;

-- One browser may change its current vote. The primary key keeps one row.
do $mutable_browser_vote$
declare
  context_record record;
  first_payload jsonb;
  changed_payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;

  first_payload := public.course_path_poll_cast_vote(
    context_record.poll_slug,
    context_record.c01_option_id,
    repeat('1', 64),
    null,
    10,
    60
  );

  perform pg_temp.course_path_poll_assert(
    (first_payload ->> 'resultsVisible')::boolean
      and (first_payload ->> 'totalVotes')::integer = 1
      and first_payload ->> 'viewerChoiceOptionId' =
        context_record.c01_option_id::text,
    'first accepted vote must reveal results to that browser'
  );

  changed_payload := public.course_path_poll_cast_vote(
    context_record.poll_slug,
    context_record.fd01_option_id,
    repeat('1', 64),
    null,
    10,
    60
  );

  perform pg_temp.course_path_poll_assert(
    (changed_payload ->> 'totalVotes')::integer = 1,
    'changing a vote must not create a second vote row'
  );
  perform pg_temp.course_path_poll_assert(
    changed_payload ->> 'viewerChoiceOptionId' =
      context_record.fd01_option_id::text,
    'changed vote must become the browser current choice'
  );
  perform pg_temp.course_path_poll_assert(
    (
      select count(*) = 1
        and min(vote.option_id::text) =
          context_record.fd01_option_id::text
      from public.course_path_poll_votes as vote
      where vote.poll_id = context_record.poll_id
        and vote.voter_hash = repeat('1', 64)
    ),
    'database must keep exactly one mutable vote per browser hash'
  );
end;
$mutable_browser_vote$;

-- Two more browsers produce a deterministic 2–1 FD01 audience leader.
select public.course_path_poll_cast_vote(
  context.poll_slug,
  context.fd01_option_id,
  repeat('2', 64),
  null,
  10,
  60
)
from course_path_poll_test_context as context;

select public.course_path_poll_cast_vote(
  context.poll_slug,
  context.c01_option_id,
  repeat('3', 64),
  null,
  10,
  60
)
from course_path_poll_test_context as context;

-- Seed the current and next minute so the limiter test cannot flake at a
-- minute boundary. A rejected call runs inside a PL/pgSQL subtransaction; its
-- counter increment and any vote write must roll back together.
insert into public.course_path_poll_rate_buckets (
  poll_id,
  identifier_kind,
  identifier_hash,
  bucket_start,
  request_count,
  expires_at
)
select
  context.poll_id,
  seed.identifier_kind,
  seed.identifier_hash,
  bucket.bucket_start,
  1,
  bucket.bucket_start + interval '10 minutes'
from course_path_poll_test_context as context
cross join (
  values
    ('voter'::text, repeat('4', 64)),
    ('network'::text, repeat('a', 64))
) as seed(identifier_kind, identifier_hash)
cross join lateral (
  values
    (date_trunc('minute', clock_timestamp())),
    (date_trunc('minute', clock_timestamp()) + interval '1 minute')
) as bucket(bucket_start);

do $atomic_voter_limit$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_cast_vote(
      context_record.poll_slug,
      context_record.c01_option_id,
      repeat('4', 64),
      null,
      1,
      60
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: voter rate limit was not enforced';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_RATE_LIMITED' then
        raise;
      end if;
  end;

  perform pg_temp.course_path_poll_assert(
    not exists (
      select 1
      from public.course_path_poll_votes
      where poll_id = context_record.poll_id
        and voter_hash = repeat('4', 64)
    ),
    'rate-limited voter must not write a vote'
  );
  perform pg_temp.course_path_poll_assert(
    (
      select count(*) = 2 and bool_and(request_count = 1)
      from public.course_path_poll_rate_buckets
      where poll_id = context_record.poll_id
        and identifier_kind = 'voter'
        and identifier_hash = repeat('4', 64)
    ),
    'failed voter-limit call must atomically roll back its counter increment'
  );
end;
$atomic_voter_limit$;

do $atomic_network_limit$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_cast_vote(
      context_record.poll_slug,
      context_record.c01_option_id,
      repeat('5', 64),
      repeat('a', 64),
      10,
      1
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: network rate limit was not enforced';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_RATE_LIMITED' then
        raise;
      end if;
  end;

  perform pg_temp.course_path_poll_assert(
    not exists (
      select 1
      from public.course_path_poll_votes
      where poll_id = context_record.poll_id
        and voter_hash = repeat('5', 64)
    ),
    'network-rate-limited request must not write a vote'
  );
  perform pg_temp.course_path_poll_assert(
    not exists (
      select 1
      from public.course_path_poll_rate_buckets
      where poll_id = context_record.poll_id
        and identifier_kind = 'voter'
        and identifier_hash = repeat('5', 64)
    ),
    'network rejection must roll back the new voter rate bucket'
  );
  perform pg_temp.course_path_poll_assert(
    (
      select count(*) = 2 and bool_and(request_count = 1)
      from public.course_path_poll_rate_buckets
      where poll_id = context_record.poll_id
        and identifier_kind = 'network'
        and identifier_hash = repeat('a', 64)
    ),
    'failed network-limit call must atomically roll back its counter increment'
  );
end;
$atomic_network_limit$;

-- Votes exist, but a different browser still cannot see live totals.
do $still_hidden_for_non_voter$
declare
  context_record record;
  payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;
  payload := public.course_path_poll_public_view(
    context_record.poll_slug,
    repeat('9', 64)
  );

  perform pg_temp.course_path_poll_assert(
    (payload ->> 'resultsVisible')::boolean is false
      and payload -> 'totalVotes' = 'null'::jsonb,
    'live totals must remain hidden for every browser until it votes'
  );
end;
$still_hidden_for_non_voter$;

do $unauthorized_close$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_close(
      context_record.poll_id,
      context_record.member_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: non-admin closed a poll';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_ADMIN_REQUIRED' then
        raise;
      end if;
  end;

  perform pg_temp.course_path_poll_assert(
    (
      select status = 'open'
      from public.course_path_polls
      where id = context_record.poll_id
    ),
    'failed close authorization must leave the poll open'
  );
end;
$unauthorized_close$;

select public.course_path_poll_close(
  context.poll_id,
  context.admin_id
)
from course_path_poll_test_context as context;

do $closed_leader_and_final_totals$
declare
  context_record record;
  payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;
  payload := public.course_path_poll_public_view(
    context_record.poll_slug,
    null
  );

  perform pg_temp.course_path_poll_assert(
    (
      select poll.status = 'closed'
        and poll.closed_at is not null
        and poll.closed_by = context_record.admin_id
        and poll.audience_result_kind = 'leader'
        and poll.audience_leader_option_id =
          context_record.fd01_option_id
      from public.course_path_polls as poll
      where poll.id = context_record.poll_id
    ),
    'manual close must persist the 2–1 FD01 audience leader'
  );
  perform pg_temp.course_path_poll_assert(
    not exists (
      select 1
      from public.course_path_poll_rate_buckets
      where poll_id = context_record.poll_id
    ),
    'manual close must delete short-lived rate buckets'
  );
  perform pg_temp.course_path_poll_assert(
    payload ->> 'status' = 'closed'
      and (payload ->> 'resultsVisible')::boolean
      and (payload ->> 'totalVotes')::integer = 3,
    'final totals must be public after manual close'
  );
  perform pg_temp.course_path_poll_assert(
    (payload -> 'options' -> 0 ->> 'voteCount')::integer = 1
      and (payload -> 'options' -> 0 ->> 'percentage')::numeric = 33.3
      and (payload -> 'options' -> 1 ->> 'voteCount')::integer = 2
      and (payload -> 'options' -> 1 ->> 'percentage')::numeric = 66.7,
    'closed public totals must be exact and correctly rounded'
  );
  perform pg_temp.course_path_poll_assert(
    payload #>> '{audienceResult,kind}' = 'leader'
      and payload #>> '{audienceResult,leaderCourseSlug}' =
        'fd01-mythic-imagination-from-classical-pattern-to-personal-meaning'
      and (payload -> 'options' -> 1 ->> 'isAudienceLeader')::boolean,
    'public audience result must name FD01 without changing release state'
  );
end;
$closed_leader_and_final_totals$;

-- Closing is manual and final: the vote function refuses further changes.
do $closed_vote_rejected$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_cast_vote(
      context_record.poll_slug,
      context_record.c01_option_id,
      repeat('1', 64),
      null,
      10,
      60
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: vote changed after close';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_NOT_OPEN' then
        raise;
      end if;
  end;
end;
$closed_vote_rejected$;

-- The editorial decision is separate and may transparently differ from the
-- audience leader. Here the audience chose FD01 and the editor records C01.
do $unauthorized_editorial_decision$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_record_editorial_decision(
      context_record.poll_id,
      context_record.c01_option_id,
      'Editorial fixture',
      context_record.member_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: non-admin recorded a decision';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_ADMIN_REQUIRED' then
        raise;
      end if;
  end;
end;
$unauthorized_editorial_decision$;

do $cross_poll_editorial_rejected$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_record_editorial_decision(
      context_record.poll_id,
      context_record.secondary_c01_option_id,
      'Must not cross poll boundaries',
      context_record.admin_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: cross-poll editorial option was accepted';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_OPTION_MISMATCH' then
        raise;
      end if;
  end;
end;
$cross_poll_editorial_rejected$;

select public.course_path_poll_record_editorial_decision(
  context.poll_id,
  context.c01_option_id,
  '  C01 follows for editorial scheduling reasons.  ',
  context.admin_id
)
from course_path_poll_test_context as context;

do $separate_editorial_decision$
declare
  context_record record;
  payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;
  payload := public.course_path_poll_public_view(
    context_record.poll_slug,
    null
  );

  perform pg_temp.course_path_poll_assert(
    (
      select poll.audience_leader_option_id =
          context_record.fd01_option_id
        and poll.editorial_selection_option_id =
          context_record.c01_option_id
        and poll.editorial_decided_by = context_record.admin_id
        and poll.editorial_decided_at is not null
        and poll.editorial_decision_note =
          'C01 follows for editorial scheduling reasons.'
      from public.course_path_polls as poll
      where poll.id = context_record.poll_id
    ),
    'editorial decision must be stored separately from audience result'
  );
  perform pg_temp.course_path_poll_assert(
    payload #>> '{audienceResult,leaderCourseSlug}' =
        'fd01-mythic-imagination-from-classical-pattern-to-personal-meaning'
      and payload #>> '{editorialDecision,courseSlug}' =
        'c01-how-humans-know-what-they-know'
      and payload #>> '{editorialDecision,note}' =
        'C01 follows for editorial scheduling reasons.',
    'public result must transparently show differing audience/editorial choices'
  );
end;
$separate_editorial_decision$;

do $unauthorized_archive$
declare
  context_record record;
begin
  select * into context_record from course_path_poll_test_context;

  begin
    perform public.course_path_poll_archive(
      context_record.poll_id,
      context_record.member_id
    );
    raise exception
      'COURSE_POLL_TEST_ASSERTION_FAILED: non-admin archived a poll';
  exception
    when others then
      if sqlerrm <> 'COURSE_POLL_ADMIN_REQUIRED' then
        raise;
      end if;
  end;
end;
$unauthorized_archive$;

select public.course_path_poll_archive(
  context.poll_id,
  context.admin_id
)
from course_path_poll_test_context as context;

do $archived_public_normalization$
declare
  context_record record;
  payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;
  payload := public.course_path_poll_public_view(
    context_record.poll_slug,
    null
  );

  perform pg_temp.course_path_poll_assert(
    (
      select poll.status = 'archived'
        and poll.archived_at is not null
        and poll.archived_by = context_record.admin_id
      from public.course_path_polls as poll
      where poll.id = context_record.poll_id
    ),
    'archive must retain an auditable internal archived state'
  );
  perform pg_temp.course_path_poll_assert(
    payload ->> 'status' = 'closed'
      and (payload ->> 'resultsVisible')::boolean
      and (payload ->> 'totalVotes')::integer = 3
      and payload #>> '{editorialDecision,courseSlug}' =
        'c01-how-humans-know-what-they-know',
    'archived ballot must remain public as a normalized closed final result'
  );
end;
$archived_public_normalization$;

-- Exercise the tie branch on the second poll after the first is archived.
select public.course_path_poll_open(
  context.secondary_poll_id,
  context.admin_id
)
from course_path_poll_test_context as context;

select public.course_path_poll_cast_vote(
  context.secondary_poll_slug,
  context.secondary_c01_option_id,
  repeat('7', 64),
  null,
  10,
  60
)
from course_path_poll_test_context as context;

select public.course_path_poll_cast_vote(
  context.secondary_poll_slug,
  context.secondary_fd01_option_id,
  repeat('8', 64),
  null,
  10,
  60
)
from course_path_poll_test_context as context;

select public.course_path_poll_close(
  context.secondary_poll_id,
  context.admin_id
)
from course_path_poll_test_context as context;

do $tie_result$
declare
  context_record record;
  payload jsonb;
begin
  select * into context_record from course_path_poll_test_context;
  payload := public.course_path_poll_public_view(
    context_record.secondary_poll_slug,
    null
  );

  perform pg_temp.course_path_poll_assert(
    (
      select poll.status = 'closed'
        and poll.audience_result_kind = 'tie'
        and poll.audience_leader_option_id is null
      from public.course_path_polls as poll
      where poll.id = context_record.secondary_poll_id
    ),
    'one vote per option must close as a tie without a leader'
  );
  perform pg_temp.course_path_poll_assert(
    payload #>> '{audienceResult,kind}' = 'tie'
      and payload #> '{audienceResult,leaderCourseSlug}' = 'null'::jsonb
      and (payload ->> 'totalVotes')::integer = 2
      and (payload -> 'options' -> 0 ->> 'percentage')::numeric = 50.0
      and (payload -> 'options' -> 1 ->> 'percentage')::numeric = 50.0
      and not (payload -> 'options' -> 0 ->> 'isAudienceLeader')::boolean
      and not (payload -> 'options' -> 1 ->> 'isAudienceLeader')::boolean,
    'public tie must show final 50/50 totals and no audience leader'
  );
end;
$tie_result$;

-- Ballot lifecycle operations are advisory only. Verify every course field is
-- unchanged from the snapshot taken after satisfying the publication gate.
select pg_temp.course_path_poll_assert(
  (
    select count(*) = 3
    from course_path_poll_test_course_snapshot as snapshot
    join public.courses as course on course.id = snapshot.id
    where row(
      course.title,
      course.slug,
      course.description,
      course.premise,
      course.learning_outcomes,
      course.course_type,
      course.level,
      course.duration_weeks,
      course.content,
      course.is_published,
      course.created_at,
      course.updated_at
    ) is not distinct from row(
      snapshot.title,
      snapshot.slug,
      snapshot.description,
      snapshot.premise,
      snapshot.learning_outcomes,
      snapshot.course_type,
      snapshot.level,
      snapshot.duration_weeks,
      snapshot.content,
      snapshot.is_published,
      snapshot.created_at,
      snapshot.updated_at
    )
  ),
  'polling must not change course access, content, or release configuration'
);

reset role;

-- Explicitly prove all fixture rows still exist immediately before rollback.
-- This makes a false-positive caused by early fixture cleanup impossible.
select pg_temp.course_path_poll_assert(
  (
    select count(*) = 2
    from public.course_path_polls as poll
    join course_path_poll_test_context as context
      on poll.id in (context.poll_id, context.secondary_poll_id)
  ),
  'both transactional poll fixtures must exist before rollback'
);

rollback;

\echo 'PASS: course-path ballot staging integration checks completed; all changes rolled back.'
