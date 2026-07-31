-- Advisory course-path ballot infrastructure.
--
-- This migration is intentionally additive. The four tables below are
-- service-role only: visitors vote through a server action, and administrators
-- manage ballots through authenticated server actions. No ballot operation
-- changes course publication, access, release order, or YouTube configuration.

create table if not exists public.course_path_polls (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  question text not null,
  status text not null default 'draft',
  audience_result_kind text not null default 'pending',
  audience_leader_option_id uuid,
  editorial_selection_option_id uuid,
  editorial_decision_note text,
  created_by uuid references public.users(id) on delete set null,
  opened_by uuid references public.users(id) on delete set null,
  closed_by uuid references public.users(id) on delete set null,
  archived_by uuid references public.users(id) on delete set null,
  editorial_decided_by uuid references public.users(id) on delete set null,
  opened_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  editorial_decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_path_polls_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint course_path_polls_question_present
    check (length(btrim(question)) between 1 and 240),
  constraint course_path_polls_status_valid
    check (status in ('draft', 'open', 'closed', 'archived')),
  constraint course_path_polls_audience_result_valid
    check (audience_result_kind in ('pending', 'leader', 'tie', 'no_votes')),
  constraint course_path_polls_open_timestamps_valid
    check (
      (status = 'draft' and opened_at is null and closed_at is null and archived_at is null)
      or (status = 'open' and opened_at is not null and closed_at is null and archived_at is null)
      or (status = 'closed' and opened_at is not null and closed_at is not null and archived_at is null)
      or (status = 'archived' and opened_at is not null and closed_at is not null and archived_at is not null)
    ),
  constraint course_path_polls_audience_leader_shape
    check (
      (audience_result_kind = 'leader' and audience_leader_option_id is not null)
      or (audience_result_kind <> 'leader' and audience_leader_option_id is null)
    ),
  constraint course_path_polls_editorial_shape
    check (
      (editorial_selection_option_id is null
        and editorial_decided_by is null
        and editorial_decided_at is null)
      or (editorial_selection_option_id is not null
        and editorial_decided_by is not null
        and editorial_decided_at is not null)
    )
);

create table if not exists public.course_path_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.course_path_polls(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  label_override text,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  constraint course_path_poll_options_order_valid check (sort_order in (0, 1)),
  constraint course_path_poll_options_label_present
    check (label_override is null or length(btrim(label_override)) between 1 and 120),
  constraint course_path_poll_options_poll_course_unique unique (poll_id, course_id),
  constraint course_path_poll_options_poll_order_unique unique (poll_id, sort_order),
  constraint course_path_poll_options_poll_id_id_unique unique (poll_id, id)
);

alter table public.course_path_polls
  add constraint course_path_polls_audience_leader_same_poll
  foreign key (id, audience_leader_option_id)
  references public.course_path_poll_options(poll_id, id)
  deferrable initially deferred;

alter table public.course_path_polls
  add constraint course_path_polls_editorial_selection_same_poll
  foreign key (id, editorial_selection_option_id)
  references public.course_path_poll_options(poll_id, id)
  deferrable initially deferred;

create table if not exists public.course_path_poll_votes (
  poll_id uuid not null references public.course_path_polls(id) on delete cascade,
  option_id uuid not null,
  voter_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (poll_id, voter_hash),
  constraint course_path_poll_votes_hash_format
    check (voter_hash ~ '^[a-f0-9]{64}$'),
  constraint course_path_poll_votes_option_same_poll
    foreign key (poll_id, option_id)
    references public.course_path_poll_options(poll_id, id)
    on delete restrict
);

create table if not exists public.course_path_poll_rate_buckets (
  poll_id uuid not null references public.course_path_polls(id) on delete cascade,
  identifier_kind text not null,
  identifier_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 1,
  expires_at timestamptz not null,
  primary key (poll_id, identifier_kind, identifier_hash, bucket_start),
  constraint course_path_poll_rate_buckets_kind_valid
    check (identifier_kind in ('voter', 'network')),
  constraint course_path_poll_rate_buckets_hash_format
    check (identifier_hash ~ '^[a-f0-9]{64}$'),
  constraint course_path_poll_rate_buckets_count_valid check (request_count > 0),
  constraint course_path_poll_rate_buckets_expiry_valid check (expires_at > bucket_start)
);

create unique index if not exists course_path_polls_one_open_idx
  on public.course_path_polls ((status))
  where status = 'open';

create index if not exists course_path_poll_votes_option_idx
  on public.course_path_poll_votes (poll_id, option_id);

create index if not exists course_path_poll_rate_buckets_expiry_idx
  on public.course_path_poll_rate_buckets (expires_at);

alter table public.course_path_polls enable row level security;
alter table public.course_path_poll_options enable row level security;
alter table public.course_path_poll_votes enable row level security;
alter table public.course_path_poll_rate_buckets enable row level security;

revoke all on table public.course_path_polls from public, anon, authenticated;
revoke all on table public.course_path_poll_options from public, anon, authenticated;
revoke all on table public.course_path_poll_votes from public, anon, authenticated;
revoke all on table public.course_path_poll_rate_buckets from public, anon, authenticated;

grant all on table public.course_path_polls to service_role;
grant all on table public.course_path_poll_options to service_role;
grant all on table public.course_path_poll_votes to service_role;
grant all on table public.course_path_poll_rate_buckets to service_role;

create or replace function public.course_path_poll_protect_open_options()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_poll_id uuid;
  target_status text;
begin
  target_poll_id := coalesce(new.poll_id, old.poll_id);

  select poll.status
    into target_status
  from public.course_path_polls as poll
  where poll.id = target_poll_id
  for update;

  if target_status is distinct from 'draft' then
    raise exception 'COURSE_POLL_OPTIONS_LOCKED';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists course_path_poll_options_lock_after_open
  on public.course_path_poll_options;
create trigger course_path_poll_options_lock_after_open
before insert or update or delete on public.course_path_poll_options
for each row execute function public.course_path_poll_protect_open_options();

create or replace function public.course_path_poll_launch_records_ready(
  p_poll_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.courses as pre_course
      where pre_course.slug = 'pre-how-to-hold-two-things-at-once'
        and pre_course.is_published = true
    )
    and (
      select count(*)
      from public.course_path_poll_options as option_record
      join public.courses as course on course.id = option_record.course_id
      where option_record.poll_id = p_poll_id
        and course.is_published = true
        and course.slug in (
          'c01-how-humans-know-what-they-know',
          'fd01-mythic-imagination-from-classical-pattern-to-personal-meaning'
        )
    ) = 2;
$$;

create or replace function public.course_path_poll_create_draft(
  p_slug text,
  p_question text,
  p_course_ids uuid[],
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_poll_id uuid;
  published_course_count integer;
begin
  if p_actor_id is null or not exists (
    select 1
    from public.users as actor
    where actor.id = p_actor_id and actor.role = 'admin'
  ) then
    raise exception 'COURSE_POLL_ADMIN_REQUIRED';
  end if;

  if p_slug is null
    or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or length(btrim(coalesce(p_question, ''))) not between 1 and 240
  then
    raise exception 'COURSE_POLL_INVALID_DRAFT';
  end if;

  if coalesce(array_length(p_course_ids, 1), 0) <> 2
    or p_course_ids[1] = p_course_ids[2]
  then
    raise exception 'COURSE_POLL_REQUIRES_TWO_DISTINCT_OPTIONS';
  end if;

  select count(*)
    into published_course_count
  from public.courses as course
  where course.id = any(p_course_ids)
    and course.is_published = true;

  if published_course_count <> 2 then
    raise exception 'COURSE_POLL_OPTIONS_MUST_BE_PUBLISHED';
  end if;

  insert into public.course_path_polls (slug, question, created_by)
  values (p_slug, btrim(p_question), p_actor_id)
  returning id into created_poll_id;

  insert into public.course_path_poll_options (poll_id, course_id, sort_order)
  values
    (created_poll_id, p_course_ids[1], 0),
    (created_poll_id, p_course_ids[2], 1);

  return created_poll_id;
end;
$$;

create or replace function public.course_path_poll_open(
  p_poll_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  option_count integer;
  published_option_count integer;
  launch_candidate_count integer;
begin
  if p_actor_id is null or not exists (
    select 1
    from public.users as actor
    where actor.id = p_actor_id and actor.role = 'admin'
  ) then
    raise exception 'COURSE_POLL_ADMIN_REQUIRED';
  end if;

  perform 1
  from public.course_path_polls as poll
  where poll.id = p_poll_id and poll.status = 'draft'
  for update;

  if not found then
    raise exception 'COURSE_POLL_NOT_DRAFT';
  end if;

  select
    count(*),
    count(*) filter (where course.is_published = true)
  into option_count, published_option_count
  from public.course_path_poll_options as option_record
  join public.courses as course on course.id = option_record.course_id
  where option_record.poll_id = p_poll_id;

  if option_count <> 2 or published_option_count <> 2 then
    raise exception 'COURSE_POLL_REQUIRES_TWO_PUBLISHED_OPTIONS';
  end if;

  if not exists (
    select 1
    from public.courses as pre_course
    where pre_course.slug = 'pre-how-to-hold-two-things-at-once'
      and pre_course.is_published = true
  ) then
    raise exception 'COURSE_POLL_PRE_PUBLIC_RECORD_REQUIRED';
  end if;

  select count(*)
    into launch_candidate_count
  from public.course_path_poll_options as option_record
  join public.courses as course on course.id = option_record.course_id
  where option_record.poll_id = p_poll_id
    and course.is_published = true
    and course.slug in (
      'c01-how-humans-know-what-they-know',
      'fd01-mythic-imagination-from-classical-pattern-to-personal-meaning'
    );

  if launch_candidate_count <> 2 then
    raise exception 'COURSE_POLL_LAUNCH_CANDIDATES_REQUIRED';
  end if;

  update public.course_path_polls
  set
    status = 'open',
    opened_at = clock_timestamp(),
    opened_by = p_actor_id,
    updated_at = clock_timestamp()
  where id = p_poll_id;
end;
$$;

create or replace function public.course_path_poll_public_view(
  p_poll_slug text,
  p_voter_hash text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_poll public.course_path_polls%rowtype;
  viewer_option_id uuid;
  reveal_results boolean;
  total_vote_count integer;
  option_payload jsonb;
begin
  select poll.*
    into target_poll
  from public.course_path_polls as poll
  where poll.slug = p_poll_slug
    and poll.status in ('open', 'closed', 'archived')
    and (
      poll.status in ('closed', 'archived')
      or public.course_path_poll_launch_records_ready(poll.id)
    )
  limit 1;

  if not found then
    return null;
  end if;

  if p_voter_hash is not null and p_voter_hash ~ '^[a-f0-9]{64}$' then
    select vote.option_id
      into viewer_option_id
    from public.course_path_poll_votes as vote
    where vote.poll_id = target_poll.id
      and vote.voter_hash = p_voter_hash;
  end if;

  reveal_results :=
    target_poll.status in ('closed', 'archived')
    or viewer_option_id is not null;

  select count(*)
    into total_vote_count
  from public.course_path_poll_votes as vote
  where vote.poll_id = target_poll.id;

  select jsonb_agg(
    jsonb_build_object(
      'optionId', ranked.option_id,
      'courseSlug', ranked.course_slug,
      'code', ranked.course_code,
      'title', ranked.title,
      'coreQuestion', ranked.core_question,
      'href', '/courses/' || ranked.course_slug,
      'voteCount', case when reveal_results then ranked.vote_count else null end,
      'percentage', case
        when reveal_results and total_vote_count > 0
          then round((ranked.vote_count::numeric * 100) / total_vote_count, 1)
        when reveal_results then 0
        else null
      end,
      'isAudienceLeader',
        target_poll.audience_result_kind = 'leader'
        and target_poll.audience_leader_option_id = ranked.option_id
    )
    order by ranked.sort_order
  )
    into option_payload
  from (
    select
      option_record.id as option_id,
      option_record.sort_order,
      course.slug as course_slug,
      coalesce(nullif(course.content ->> 'course_id_tag', ''), upper(split_part(course.slug, '-', 1))) as course_code,
      coalesce(nullif(option_record.label_override, ''), course.title) as title,
      coalesce(nullif(course.content ->> 'core_question', ''), nullif(course.premise, ''), '') as core_question,
      count(vote.option_id)::integer as vote_count
    from public.course_path_poll_options as option_record
    join public.courses as course on course.id = option_record.course_id
    left join public.course_path_poll_votes as vote
      on vote.poll_id = option_record.poll_id
      and vote.option_id = option_record.id
    where option_record.poll_id = target_poll.id
    group by
      option_record.id,
      option_record.sort_order,
      option_record.label_override,
      course.slug,
      course.content,
      course.title,
      course.premise
  ) as ranked;

  return jsonb_build_object(
    'slug', target_poll.slug,
    'question', target_poll.question,
    -- Archived ballots remain a public, read-only final result. The public
    -- shape deliberately normalizes them to "closed" so internal lifecycle
    -- state never crosses the learner boundary.
    'status', case
      when target_poll.status = 'archived' then 'closed'
      else target_poll.status
    end,
    'viewerChoiceOptionId', viewer_option_id,
    'resultsVisible', reveal_results,
    'totalVotes', case when reveal_results then total_vote_count else null end,
    'options', coalesce(option_payload, '[]'::jsonb),
    'audienceResult', jsonb_build_object(
      'kind', target_poll.audience_result_kind,
      'leaderCourseSlug', (
        select course.slug
        from public.course_path_poll_options as leader_option
        join public.courses as course on course.id = leader_option.course_id
        where leader_option.poll_id = target_poll.id
          and leader_option.id = target_poll.audience_leader_option_id
      )
    ),
    'editorialDecision', case
      when target_poll.editorial_selection_option_id is null then null
      else jsonb_build_object(
        'courseSlug', (
          select course.slug
          from public.course_path_poll_options as selected_option
          join public.courses as course on course.id = selected_option.course_id
          where selected_option.poll_id = target_poll.id
            and selected_option.id = target_poll.editorial_selection_option_id
        ),
        'note', target_poll.editorial_decision_note
      )
    end
  );
end;
$$;

create or replace function public.course_path_poll_admin_vote_counts()
returns table (
  poll_id uuid,
  option_id uuid,
  vote_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    vote.poll_id,
    vote.option_id,
    count(*) as vote_count
  from public.course_path_poll_votes as vote
  group by vote.poll_id, vote.option_id;
$$;

create or replace function public.course_path_poll_cast_vote(
  p_poll_slug text,
  p_option_id uuid,
  p_voter_hash text,
  p_network_hash text default null,
  p_voter_limit integer default 10,
  p_network_limit integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_poll_id uuid;
  current_bucket timestamptz;
  current_count integer;
begin
  if p_voter_hash is null or p_voter_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'COURSE_POLL_INVALID_VOTER';
  end if;

  if p_network_hash is not null and p_network_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'COURSE_POLL_INVALID_NETWORK';
  end if;

  if p_voter_limit < 1 or p_network_limit < 1 then
    raise exception 'COURSE_POLL_INVALID_RATE_LIMIT';
  end if;

  select poll.id
    into target_poll_id
  from public.course_path_polls as poll
  where poll.slug = p_poll_slug and poll.status = 'open'
  for key share;

  if not found then
    raise exception 'COURSE_POLL_NOT_OPEN';
  end if;

  current_bucket := date_trunc('minute', clock_timestamp());

  delete from public.course_path_poll_rate_buckets
  where expires_at < current_bucket;

  insert into public.course_path_poll_rate_buckets (
    poll_id,
    identifier_kind,
    identifier_hash,
    bucket_start,
    request_count,
    expires_at
  )
  values (
    target_poll_id,
    'voter',
    p_voter_hash,
    current_bucket,
    1,
    current_bucket + interval '10 minutes'
  )
  on conflict (poll_id, identifier_kind, identifier_hash, bucket_start)
  do update set
    request_count = public.course_path_poll_rate_buckets.request_count + 1,
    expires_at = greatest(
      public.course_path_poll_rate_buckets.expires_at,
      excluded.expires_at
    )
  returning request_count into current_count;

  if current_count > p_voter_limit then
    raise exception 'COURSE_POLL_RATE_LIMITED';
  end if;

  if p_network_hash is not null then
    insert into public.course_path_poll_rate_buckets (
      poll_id,
      identifier_kind,
      identifier_hash,
      bucket_start,
      request_count,
      expires_at
    )
    values (
      target_poll_id,
      'network',
      p_network_hash,
      current_bucket,
      1,
      current_bucket + interval '10 minutes'
    )
    on conflict (poll_id, identifier_kind, identifier_hash, bucket_start)
    do update set
      request_count = public.course_path_poll_rate_buckets.request_count + 1,
      expires_at = greatest(
        public.course_path_poll_rate_buckets.expires_at,
        excluded.expires_at
      )
    returning request_count into current_count;

    if current_count > p_network_limit then
      raise exception 'COURSE_POLL_RATE_LIMITED';
    end if;
  end if;

  -- Unavailable previews and invalid cross-poll UUIDs consume the same atomic
  -- rate buckets. Returning a sentinel (instead of raising) commits the
  -- counters while still preventing any vote write; a post-counter exception
  -- would roll the increments back.
  if not public.course_path_poll_launch_records_ready(target_poll_id) then
    return jsonb_build_object('errorCode', 'not_available');
  end if;

  if not exists (
    select 1
    from public.course_path_poll_options as option_record
    where option_record.poll_id = target_poll_id
      and option_record.id = p_option_id
  ) then
    return jsonb_build_object('errorCode', 'option_mismatch');
  end if;

  insert into public.course_path_poll_votes (
    poll_id,
    option_id,
    voter_hash
  )
  values (
    target_poll_id,
    p_option_id,
    p_voter_hash
  )
  on conflict (poll_id, voter_hash)
  do update set
    option_id = excluded.option_id,
    updated_at = clock_timestamp();

  return public.course_path_poll_public_view(p_poll_slug, p_voter_hash);
end;
$$;

create or replace function public.course_path_poll_close(
  p_poll_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  maximum_votes integer;
  leaders integer;
  leader_option_id uuid;
  result_kind text;
begin
  if p_actor_id is null or not exists (
    select 1
    from public.users as actor
    where actor.id = p_actor_id and actor.role = 'admin'
  ) then
    raise exception 'COURSE_POLL_ADMIN_REQUIRED';
  end if;

  perform 1
  from public.course_path_polls as poll
  where poll.id = p_poll_id and poll.status = 'open'
  for update;

  if not found then
    raise exception 'COURSE_POLL_NOT_OPEN';
  end if;

  with option_counts as (
    select
      option_record.id,
      count(vote.option_id)::integer as vote_count
    from public.course_path_poll_options as option_record
    left join public.course_path_poll_votes as vote
      on vote.poll_id = option_record.poll_id
      and vote.option_id = option_record.id
    where option_record.poll_id = p_poll_id
    group by option_record.id
  ),
  maximum as (
    select max(vote_count) as vote_count
    from option_counts
  )
  select
    maximum.vote_count,
    count(*) filter (where option_counts.vote_count = maximum.vote_count),
    (
      min(option_counts.id::text)
        filter (where option_counts.vote_count = maximum.vote_count)
    )::uuid
  into maximum_votes, leaders, leader_option_id
  from option_counts
  cross join maximum
  group by maximum.vote_count;

  if coalesce(maximum_votes, 0) = 0 then
    result_kind := 'no_votes';
    leader_option_id := null;
  elsif leaders > 1 then
    result_kind := 'tie';
    leader_option_id := null;
  else
    result_kind := 'leader';
  end if;

  update public.course_path_polls
  set
    status = 'closed',
    closed_at = clock_timestamp(),
    closed_by = p_actor_id,
    audience_result_kind = result_kind,
    audience_leader_option_id = leader_option_id,
    updated_at = clock_timestamp()
  where id = p_poll_id;

  delete from public.course_path_poll_rate_buckets
  where poll_id = p_poll_id;
end;
$$;

create or replace function public.course_path_poll_record_editorial_decision(
  p_poll_id uuid,
  p_option_id uuid,
  p_note text,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not exists (
    select 1
    from public.users as actor
    where actor.id = p_actor_id and actor.role = 'admin'
  ) then
    raise exception 'COURSE_POLL_ADMIN_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.course_path_polls as poll
    where poll.id = p_poll_id
      and poll.status in ('closed', 'archived')
  ) then
    raise exception 'COURSE_POLL_MUST_BE_CLOSED';
  end if;

  if not exists (
    select 1
    from public.course_path_poll_options as option_record
    where option_record.poll_id = p_poll_id
      and option_record.id = p_option_id
  ) then
    raise exception 'COURSE_POLL_OPTION_MISMATCH';
  end if;

  update public.course_path_polls
  set
    editorial_selection_option_id = p_option_id,
    editorial_decision_note = nullif(btrim(coalesce(p_note, '')), ''),
    editorial_decided_by = p_actor_id,
    editorial_decided_at = clock_timestamp(),
    updated_at = clock_timestamp()
  where id = p_poll_id;
end;
$$;

create or replace function public.course_path_poll_archive(
  p_poll_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not exists (
    select 1
    from public.users as actor
    where actor.id = p_actor_id and actor.role = 'admin'
  ) then
    raise exception 'COURSE_POLL_ADMIN_REQUIRED';
  end if;

  update public.course_path_polls
  set
    status = 'archived',
    archived_at = clock_timestamp(),
    archived_by = p_actor_id,
    updated_at = clock_timestamp()
  where id = p_poll_id
    and status = 'closed';

  if not found then
    raise exception 'COURSE_POLL_NOT_CLOSED';
  end if;
end;
$$;

revoke all on function public.course_path_poll_create_draft(text, text, uuid[], uuid)
  from public, anon, authenticated;
revoke all on function public.course_path_poll_launch_records_ready(uuid)
  from public, anon, authenticated;
revoke all on function public.course_path_poll_open(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.course_path_poll_public_view(text, text)
  from public, anon, authenticated;
revoke all on function public.course_path_poll_admin_vote_counts()
  from public, anon, authenticated;
revoke all on function public.course_path_poll_cast_vote(text, uuid, text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.course_path_poll_close(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.course_path_poll_record_editorial_decision(uuid, uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.course_path_poll_archive(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.course_path_poll_create_draft(text, text, uuid[], uuid)
  to service_role;
grant execute on function public.course_path_poll_launch_records_ready(uuid)
  to service_role;
grant execute on function public.course_path_poll_open(uuid, uuid)
  to service_role;
grant execute on function public.course_path_poll_public_view(text, text)
  to service_role;
grant execute on function public.course_path_poll_admin_vote_counts()
  to service_role;
grant execute on function public.course_path_poll_cast_vote(text, uuid, text, text, integer, integer)
  to service_role;
grant execute on function public.course_path_poll_close(uuid, uuid)
  to service_role;
grant execute on function public.course_path_poll_record_editorial_decision(uuid, uuid, text, uuid)
  to service_role;
grant execute on function public.course_path_poll_archive(uuid, uuid)
  to service_role;

comment on table public.course_path_polls is
  'Advisory course-path ballots. Closing records audience results only and never changes course release state.';
comment on table public.course_path_poll_votes is
  'One mutable vote per poll-specific HMAC voter identifier. Contains no account, email, raw IP, user agent, or cookie token.';
comment on table public.course_path_poll_rate_buckets is
  'Short-lived atomic rate counters keyed only by poll-specific HMAC voter or network identifiers.';
