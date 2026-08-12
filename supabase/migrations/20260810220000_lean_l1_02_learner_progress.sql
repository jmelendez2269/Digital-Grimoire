-- LEAN-L1-02: server-owned, replay-safe PRE learner progress.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l1-02-learner-progress'));

create table if not exists public.learner_progress_requests (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.learner_progress_requests is
  'Service-owned idempotency ledger for versioned learner progress writes.';

create index if not exists learner_progress_requests_owner_course_created_idx
  on public.learner_progress_requests (user_id, course_id, created_at desc);

alter table public.learner_progress_requests enable row level security;
revoke all on table public.learner_progress_requests
  from public, anon, authenticated;
grant select, insert on table public.learner_progress_requests to service_role;

-- L0-03 remains the outer boundary: customers may read only their enrollment
-- projection and cannot mutate authoritative progress directly.
alter table public.course_enrollments enable row level security;
revoke insert, update, delete, truncate, references, trigger
  on table public.course_enrollments
  from public, anon, authenticated;

drop policy if exists "Users can view their own enrollments"
  on public.course_enrollments;
create policy "Users can view their own enrollments"
  on public.course_enrollments
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.save_learner_course_progress_v1(
  p_user_id uuid,
  p_course_id uuid,
  p_request_id uuid,
  p_expected_revision integer,
  p_current_week integer,
  p_current_stage text,
  p_visited_weeks integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $lean_l1_02$
declare
  v_course_content jsonb;
  v_existing_progress jsonb;
  v_existing_request public.learner_progress_requests%rowtype;
  v_old_visited integer[] := array[]::integer[];
  v_payload_hash text;
  v_result jsonb;
  v_revision integer := 0;
  v_new_revision integer;
  v_saved_at timestamptz;
begin
  if p_user_id is null
    or p_course_id is null
    or p_request_id is null
    or p_current_week is null
    or p_current_week < 1
    or p_current_stage is null
    or p_current_stage <> all (array['start', 'read', 'companions', 'practice', 'finish'])
    or p_visited_weeks is null
    or cardinality(p_visited_weeks) = 0
    or p_expected_revision is not null and p_expected_revision < 0
  then
    raise exception using errcode = '22023', message = 'LEAN_L1_02:INVALID_REQUEST';
  end if;

  if p_visited_weeks is distinct from (
    select array_agg(week_number order by week_number)
    from (select distinct unnest(p_visited_weeks) as week_number) as normalized
  )
    or p_current_week <> all (p_visited_weeks)
    or exists (select 1 from unnest(p_visited_weeks) as week_number where week_number < 1)
  then
    raise exception using errcode = '22023', message = 'LEAN_L1_02:INVALID_REQUEST';
  end if;

  select course.content
  into v_course_content
  from public.courses as course
  where course.id = p_course_id
    and course.slug = 'pre-how-to-hold-two-things-at-once'
    and course.content->>'course_id_tag' = 'PRE';

  if not found then
    raise exception using errcode = '42501', message = 'LEAN_L1_02:COURSE_NOT_ALLOWLISTED';
  end if;

  if exists (
    select 1
    from unnest(p_visited_weeks) as requested(week_number)
    where not exists (
      select 1
      from jsonb_array_elements(coalesce(v_course_content->'weeks', '[]'::jsonb)) as course_week(value)
      where course_week.value->>'week_number' ~ '^[1-9][0-9]*$'
        and (course_week.value->>'week_number')::integer = requested.week_number
    )
  ) then
    raise exception using errcode = '22023', message = 'LEAN_L1_02:WEEK_NOT_FOUND';
  end if;

  v_payload_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'contractVersion', 1,
          'userId', p_user_id,
          'courseId', p_course_id,
          'expectedRevision', p_expected_revision,
          'currentWeekNumber', p_current_week,
          'currentStage', p_current_stage,
          'visitedWeekNumbers', to_jsonb(p_visited_weeks)
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(hashtext(p_request_id::text));

  select *
  into v_existing_request
  from public.learner_progress_requests
  where request_id = p_request_id;

  if found then
    if v_existing_request.user_id = p_user_id
      and v_existing_request.course_id = p_course_id
      and v_existing_request.payload_hash = v_payload_hash
    then
      return v_existing_request.result;
    end if;

    raise exception using errcode = '23505', message = 'LEAN_L1_02:REQUEST_REPLAY_MISMATCH';
  end if;

  select enrollment.progress
  into v_existing_progress
  from public.course_enrollments as enrollment
  where enrollment.user_id = p_user_id
    and enrollment.course_id = p_course_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'LEAN_L1_02:ENROLLMENT_REQUIRED';
  end if;

  if coalesce(v_existing_progress, '{}'::jsonb) <> '{}'::jsonb then
    if v_existing_progress->>'contractVersion' <> '1'
      or coalesce(v_existing_progress->>'revision', '') !~ '^[1-9][0-9]*$'
      or jsonb_typeof(v_existing_progress->'visitedWeekNumbers') <> 'array'
    then
      raise exception using errcode = '22023', message = 'LEAN_L1_02:INVALID_REQUEST';
    end if;

    v_revision := (v_existing_progress->>'revision')::integer;
    select coalesce(array_agg(value::integer order by ordinality), array[]::integer[])
    into v_old_visited
    from jsonb_array_elements_text(v_existing_progress->'visitedWeekNumbers')
      with ordinality as old_week(value, ordinality)
    where value ~ '^[1-9][0-9]*$';
  end if;

  if (v_revision = 0 and p_expected_revision is not null)
    or (v_revision > 0 and p_expected_revision is distinct from v_revision)
  then
    raise exception using errcode = '40001', message = 'LEAN_L1_02:SAVE_CONFLICT';
  end if;

  if exists (
    select 1
    from unnest(v_old_visited) as old_week
    where old_week <> all (p_visited_weeks)
  ) then
    raise exception using errcode = '22023', message = 'LEAN_L1_02:INVALID_REQUEST';
  end if;

  v_new_revision := v_revision + 1;
  v_saved_at := clock_timestamp();
  v_result := jsonb_build_object(
    'contractVersion', 1,
    'currentWeekNumber', p_current_week,
    'currentStage', p_current_stage,
    'visitedWeekNumbers', to_jsonb(p_visited_weeks),
    'revision', v_new_revision,
    'savedAt', to_char(v_saved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  update public.course_enrollments
  set current_week = p_current_week,
      progress = v_result
  where user_id = p_user_id
    and course_id = p_course_id;

  insert into public.learner_progress_requests (
    request_id,
    user_id,
    course_id,
    payload_hash,
    result,
    created_at
  ) values (
    p_request_id,
    p_user_id,
    p_course_id,
    v_payload_hash,
    v_result,
    v_saved_at
  );

  return v_result;
end;
$lean_l1_02$;

revoke all on function public.save_learner_course_progress_v1(
  uuid, uuid, uuid, integer, integer, text, integer[]
) from public, anon, authenticated;
grant execute on function public.save_learner_course_progress_v1(
  uuid, uuid, uuid, integer, integer, text, integer[]
) to service_role;

comment on function public.save_learner_course_progress_v1(
  uuid, uuid, uuid, integer, integer, text, integer[]
) is 'Service-only atomic PRE learner progress save with revision and replay protection.';

commit;
