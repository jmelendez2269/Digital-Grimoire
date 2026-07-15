-- Blog posts: admin-authored essays/updates rendered on the public /blog pages.

create table if not exists public.blog_posts (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  excerpt           text,
  content           text not null,        -- markdown
  cover_image_url   text,
  tags              jsonb not null default '[]'::jsonb,
  author_name       text not null default 'Prismarium',
  is_published      boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.blog_posts is 'Blog posts authored in the admin blog editor (src/app/admin/blog) and rendered as markdown on the public /blog pages. All writes go through admin API routes using the service-role client.';

create index if not exists idx_blog_posts_published
  on public.blog_posts(published_at desc) where is_published = true;
create index if not exists idx_blog_posts_tags on public.blog_posts using gin(tags);

alter table public.blog_posts enable row level security;

create policy "blog_posts: public select published"
  on public.blog_posts for select
  using (is_published = true);

-- No insert/update/delete policy for anon/authenticated users.
-- All writes go through admin API routes using the service-role client.
