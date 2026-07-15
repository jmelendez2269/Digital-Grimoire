-- Videos: library synced from YouTube, searchable and tag-filterable.

create table if not exists public.videos (
  id                uuid primary key default gen_random_uuid(),
  youtube_video_id  text not null unique,
  title             text not null,
  description       text,
  thumbnail_url     text,
  tags              jsonb not null default '[]'::jsonb,
  is_published      boolean not null default true,
  published_at      timestamptz,       -- YouTube's own publish date
  synced_at         timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

comment on table public.videos is 'Videos synced from the channel via YouTube Data API. Tags are seeded from YouTube snippet tags on first sync; admin edits to tags/is_published are preserved on re-sync.';

create index if not exists idx_videos_tags on public.videos using gin(tags);
create index if not exists idx_videos_published_at
  on public.videos(published_at desc) where is_published = true;

alter table public.videos enable row level security;

create policy "videos: public select published"
  on public.videos for select
  using (is_published = true);

-- No insert/update/delete policy for regular users or anon.
-- All writes go through admin API routes using the service-role client.
