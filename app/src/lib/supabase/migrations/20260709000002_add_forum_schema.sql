-- Forum: categories, topics, and flat (non-nested) replies.
-- All writes go through member/admin API routes using the service-role
-- client, with ownership/admin checks done in-route -- see blog_posts for
-- the same convention. RLS here is select-only: a broad "owner update"
-- policy would let an owner flip is_pinned/is_locked/category_id on their
-- own row too, since RLS is row-level, not column-level.

create table if not exists public.forum_categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

comment on table public.forum_categories is 'Forum categories. Migration-seeded; no admin CRUD route in v1.';

create table if not exists public.forum_topics (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid not null references public.forum_categories(id),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null check (char_length(title) between 3 and 200),
  body           text not null check (char_length(body) between 1 and 20000),
  is_pinned      boolean not null default false,
  is_locked      boolean not null default false,
  is_deleted     boolean not null default false,
  reply_count    integer not null default 0,
  last_reply_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.forum_topics is 'Forum topics (first post). is_pinned/is_locked are admin-only, editable only via the service-role client in API routes -- never exposed to a client-writable RLS policy.';

create index if not exists forum_topics_category_id_idx
  on public.forum_topics(category_id, is_pinned desc, last_reply_at desc nulls last, created_at desc)
  where is_deleted = false;
create index if not exists forum_topics_user_id_idx on public.forum_topics(user_id);

create table if not exists public.forum_replies (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.forum_topics(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 10000),
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.forum_replies is 'Flat (non-nested) replies to a forum topic.';

create index if not exists forum_replies_topic_id_idx
  on public.forum_replies(topic_id, created_at) where is_deleted = false;

-- Keep forum_topics.reply_count / last_reply_at in sync. Recomputed from
-- scratch (not incremented/decremented) -- cheap at this volume, no drift risk.
create or replace function public.forum_sync_topic_reply_stats()
returns trigger language plpgsql as $$
declare
  target_topic_id uuid := coalesce(new.topic_id, old.topic_id);
begin
  update public.forum_topics
  set
    reply_count = (
      select count(*) from public.forum_replies
      where topic_id = target_topic_id and is_deleted = false
    ),
    last_reply_at = (
      select max(created_at) from public.forum_replies
      where topic_id = target_topic_id and is_deleted = false
    )
  where id = target_topic_id;

  return coalesce(new, old);
end;
$$;

create trigger forum_replies_sync_topic_stats
  after insert or update on public.forum_replies
  for each row execute function public.forum_sync_topic_reply_stats();

create or replace function public.set_forum_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger forum_topics_set_updated_at
  before update on public.forum_topics
  for each row execute function public.set_forum_updated_at();

create trigger forum_replies_set_updated_at
  before update on public.forum_replies
  for each row execute function public.set_forum_updated_at();

alter table public.forum_categories enable row level security;
alter table public.forum_topics enable row level security;
alter table public.forum_replies enable row level security;

create policy "forum_categories: authenticated select"
  on public.forum_categories for select
  to authenticated
  using (true);

create policy "forum_topics: authenticated select non-deleted"
  on public.forum_topics for select
  to authenticated
  using (is_deleted = false);

create policy "forum_replies: authenticated select non-deleted"
  on public.forum_replies for select
  to authenticated
  using (is_deleted = false);

-- No insert/update/delete policy for authenticated/anon on any of the three
-- tables. All writes (create topic/reply, edit, soft-delete, pin, lock) go
-- through API routes using the service-role client.
