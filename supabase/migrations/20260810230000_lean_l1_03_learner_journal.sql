-- LEAN-L1-03: authorized, replay-safe PRE workbook saves in the Study Journal.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;
select pg_advisory_xact_lock(hashtext('prismarium-lean-l1-03-learner-journal'));

-- Reconcile workbook columns into the canonical migration chain. Every new
-- column is nullable so existing Journal pages keep their exact behavior.
alter table public.journal_pages
  add column if not exists course_id uuid references public.courses(id) on delete set null,
  add column if not exists week_number integer,
  add column if not exists entry_type text,
  add column if not exists artifact_name text,
  add column if not exists tags jsonb,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists source_key text,
  add column if not exists learner_revision integer,
  add column if not exists learner_saved_at timestamptz;

do $lean_l1_03_constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.journal_pages'::regclass
      and conname = 'journal_pages_entry_type_check'
  ) then
    alter table public.journal_pages
      add constraint journal_pages_entry_type_check
      check (
        entry_type is null
        or entry_type in ('free', 'lens_exercise', 'synthesis', 'note', 'capstone')
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.journal_pages'::regclass
      and conname = 'journal_pages_source_key_check'
  ) then
    alter table public.journal_pages
      add constraint journal_pages_source_key_check
      check (
        source_key is null
        or char_length(source_key) between 1 and 80
          and source_key ~ '^[a-z0-9]+([._:-][a-z0-9]+)*$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.journal_pages'::regclass
      and conname = 'journal_pages_learner_revision_check'
  ) then
    alter table public.journal_pages
      add constraint journal_pages_learner_revision_check
      check (learner_revision is null or learner_revision >= 1);
  end if;
end;
$lean_l1_03_constraints$;

create index if not exists journal_pages_course_week_idx
  on public.journal_pages (course_id, week_number)
  where course_id is not null;

create unique index if not exists journal_pages_learner_source_uidx
  on public.journal_pages (user_id, course_id, week_number, source_key)
  where source_key is not null;

create table if not exists public.learner_journal_requests (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  page_id uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.learner_journal_requests is
  'Service-owned idempotency ledger for versioned learner workbook saves.';

create index if not exists learner_journal_requests_owner_course_created_idx
  on public.learner_journal_requests (user_id, course_id, created_at desc);

alter table public.learner_journal_requests enable row level security;
revoke all on table public.learner_journal_requests
  from public, anon, authenticated;
grant select, insert on table public.learner_journal_requests to service_role;

-- The Reader cap belongs in the database so simultaneous requests and direct
-- authenticated Journal writes follow the same rule. Paid and legacy-paid
-- states are unlimited. Downgraded accounts keep every page and may edit or
-- archive them; only a new active page or restore is blocked at 50.
create or replace function public.enforce_journal_active_page_limit_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $lean_l1_03_limit$
declare
  v_role text;
  v_subscription_status text;
  v_active_count integer;
  v_needs_slot boolean;
begin
  v_needs_slot := tg_op = 'INSERT'
    and new.is_archived is not true
    or tg_op = 'UPDATE'
      and old.is_archived is true
      and new.is_archived is not true;

  if not v_needs_slot then
    return new;
  end if;

  select account.role, account.subscription_status
  into v_role, v_subscription_status
  from public.users as account
  where account.id = new.user_id;

  if v_role = 'admin'
    or v_subscription_status in ('student', 'scholar', 'adept', 'premium', 'active')
  then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('lean-l1-03-journal-limit:' || new.user_id::text, 0)
  );

  select count(*)::integer
  into v_active_count
  from public.journal_pages as page
  where page.user_id = new.user_id
    and page.is_archived is not true;

  if v_active_count >= 50 then
    raise exception using
      errcode = '42501',
      message = 'LEAN_L1_03:JOURNAL_LIMIT_REACHED';
  end if;

  return new;
end;
$lean_l1_03_limit$;

revoke all on function public.enforce_journal_active_page_limit_v1()
  from public, anon, authenticated;

drop trigger if exists enforce_journal_active_page_limit_v1
  on public.journal_pages;
create trigger enforce_journal_active_page_limit_v1
  before insert or update of is_archived on public.journal_pages
  for each row execute function public.enforce_journal_active_page_limit_v1();

-- Preserve ordinary owner Journal CRUD while keeping learner-owned source,
-- revision, and server timestamp metadata out of customer write authority.
alter table public.journal_pages enable row level security;
revoke insert, update on table public.journal_pages
  from public, anon, authenticated;
grant select, delete on table public.journal_pages to authenticated;
grant insert (
  user_id, title, content, parent_id, icon, is_archived,
  course_id, week_number, entry_type, artifact_name, tags, is_pinned
) on table public.journal_pages to authenticated;
grant update (
  title, content, parent_id, icon, is_archived, tags, is_pinned
) on table public.journal_pages to authenticated;
grant all on table public.journal_pages to service_role;

create or replace function public.save_learner_journal_page_v1(
  p_user_id uuid,
  p_course_id uuid,
  p_request_id uuid,
  p_week_number integer,
  p_source_key text,
  p_entry_type text,
  p_artifact_name text,
  p_title text,
  p_content jsonb,
  p_page_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $lean_l1_03_save$
declare
  v_course_content jsonb;
  v_existing_page public.journal_pages%rowtype;
  v_existing_request public.learner_journal_requests%rowtype;
  v_payload_hash text;
  v_result jsonb;
  v_new_revision integer;
  v_saved_at timestamptz;
  v_page_id uuid;
begin
  if p_user_id is null
    or p_course_id is null
    or p_request_id is null
    or p_week_number is null
    or p_week_number < 1
    or p_source_key is null
    or char_length(p_source_key) not between 1 and 80
    or p_source_key !~ '^[a-z0-9]+([._:-][a-z0-9]+)*$'
    or p_entry_type is null
    or p_entry_type <> all (array['lens_exercise', 'synthesis', 'note', 'capstone'])
    or p_artifact_name is not null
      and (char_length(btrim(p_artifact_name)) not between 1 and 200)
    or p_title is null
    or char_length(btrim(p_title)) not between 1 and 200
    or (p_page_id is null) <> (p_expected_revision is null)
    or p_expected_revision is not null and p_expected_revision < 1
  then
    raise exception using errcode = '22023', message = 'LEAN_L1_03:INVALID_REQUEST';
  end if;

  select course.content
  into v_course_content
  from public.courses as course
  where course.id = p_course_id
    and course.slug = 'pre-how-to-hold-two-things-at-once'
    and course.content->>'course_id_tag' = 'PRE';

  if not found then
    raise exception using errcode = '42501', message = 'LEAN_L1_03:COURSE_NOT_ALLOWLISTED';
  end if;

  if not exists (
    select 1
    from public.course_enrollments as enrollment
    where enrollment.user_id = p_user_id
      and enrollment.course_id = p_course_id
  ) then
    raise exception using errcode = '42501', message = 'LEAN_L1_03:ENROLLMENT_REQUIRED';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_course_content->'weeks', '[]'::jsonb)) as course_week(value)
    where course_week.value->>'week_number' ~ '^[1-9][0-9]*$'
      and (course_week.value->>'week_number')::integer = p_week_number
  ) then
    raise exception using errcode = '22023', message = 'LEAN_L1_03:WEEK_NOT_FOUND';
  end if;

  v_payload_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'contractVersion', 1,
          'userId', p_user_id,
          'courseId', p_course_id,
          'weekNumber', p_week_number,
          'sourceKey', p_source_key,
          'entryType', p_entry_type,
          'artifactName', p_artifact_name,
          'title', btrim(p_title),
          'content', p_content,
          'pageId', p_page_id,
          'expectedRevision', p_expected_revision
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));

  select *
  into v_existing_request
  from public.learner_journal_requests
  where request_id = p_request_id;

  if found then
    if v_existing_request.user_id = p_user_id
      and v_existing_request.course_id = p_course_id
      and v_existing_request.payload_hash = v_payload_hash
    then
      return v_existing_request.result;
    end if;

    raise exception using errcode = '23505', message = 'LEAN_L1_03:REQUEST_REPLAY_MISMATCH';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'lean-l1-03-source:' || p_user_id::text || ':' || p_course_id::text ||
      ':' || p_week_number::text || ':' || p_source_key,
      0
    )
  );

  v_saved_at := clock_timestamp();

  if p_page_id is null then
    if exists (
      select 1 from public.journal_pages as page
      where page.user_id = p_user_id
        and page.course_id = p_course_id
        and page.week_number = p_week_number
        and page.source_key = p_source_key
    ) then
      raise exception using errcode = '40001', message = 'LEAN_L1_03:SAVE_CONFLICT';
    end if;

    v_page_id := gen_random_uuid();
    v_new_revision := 1;

    insert into public.journal_pages (
      id, user_id, course_id, week_number, source_key, entry_type,
      artifact_name, title, content, is_archived,
      learner_revision, learner_saved_at
    ) values (
      v_page_id, p_user_id, p_course_id, p_week_number, p_source_key, p_entry_type,
      case when p_artifact_name is null then null else btrim(p_artifact_name) end,
      btrim(p_title), p_content, false, v_new_revision, v_saved_at
    );
  else
    select *
    into v_existing_page
    from public.journal_pages as page
    where page.id = p_page_id
      and page.user_id = p_user_id
      and page.course_id = p_course_id
      and page.week_number = p_week_number
      and page.source_key = p_source_key
    for update;

    if not found
      or v_existing_page.learner_revision is null
      or v_existing_page.learner_revision is distinct from p_expected_revision
    then
      raise exception using errcode = '40001', message = 'LEAN_L1_03:SAVE_CONFLICT';
    end if;

    v_page_id := p_page_id;
    v_new_revision := v_existing_page.learner_revision + 1;

    update public.journal_pages
    set entry_type = p_entry_type,
        artifact_name = case
          when p_artifact_name is null then null else btrim(p_artifact_name)
        end,
        title = btrim(p_title),
        content = p_content,
        learner_revision = v_new_revision,
        learner_saved_at = v_saved_at
    where id = v_page_id;
  end if;

  v_result := jsonb_build_object(
    'contractVersion', 1,
    'pageId', v_page_id,
    'weekNumber', p_week_number,
    'sourceKey', p_source_key,
    'entryType', p_entry_type,
    'artifactName', case
      when p_artifact_name is null then null else btrim(p_artifact_name)
    end,
    'title', btrim(p_title),
    'content', p_content,
    'revision', v_new_revision,
    'savedAt', to_char(v_saved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  insert into public.learner_journal_requests (
    request_id, user_id, course_id, page_id, payload_hash, result, created_at
  ) values (
    p_request_id, p_user_id, p_course_id, v_page_id,
    v_payload_hash, v_result, v_saved_at
  );

  return v_result;
end;
$lean_l1_03_save$;

revoke all on function public.save_learner_journal_page_v1(
  uuid, uuid, uuid, integer, text, text, text, text, jsonb, uuid, integer
) from public, anon, authenticated;
grant execute on function public.save_learner_journal_page_v1(
  uuid, uuid, uuid, integer, text, text, text, text, jsonb, uuid, integer
) to service_role;

comment on function public.save_learner_journal_page_v1(
  uuid, uuid, uuid, integer, text, text, text, text, jsonb, uuid, integer
) is 'Service-only atomic PRE workbook save with ownership, revision, replay, and Reader-cap protection.';

commit;
