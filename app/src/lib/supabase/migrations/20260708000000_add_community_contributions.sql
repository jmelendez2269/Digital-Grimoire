-- Community contributions: course capstone/synthesis sharing.
-- Backs the "Contribute to Community" flow in courses/[slug]/learn/page.tsx.

-- Defensive: these journal_pages columns are already used in
-- app/src/app/api/journal/route.ts but were never added by a tracked
-- migration (schema drift, added out-of-band). Add if missing.
alter table public.journal_pages add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.journal_pages add column if not exists week_number integer;
alter table public.journal_pages add column if not exists entry_type text;
alter table public.journal_pages add column if not exists artifact_name text;
alter table public.journal_pages add column if not exists tags jsonb;
alter table public.journal_pages add column if not exists is_pinned boolean not null default false;

create table if not exists public.community_contributions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  journal_page_id  uuid not null references public.journal_pages(id) on delete cascade,
  course_id        uuid not null references public.courses(id) on delete cascade,
  week_number      integer not null,
  content_preview  text not null,
  created_at       timestamptz not null default now(),
  unique (user_id, course_id, week_number)
);

comment on table public.community_contributions is 'Anonymized preview snapshots shared to the per-course community synthesis pool. Visibility is gated: a user must have their own contribution for a course+week before they can see others'' contributions for that same pair (anti-anchoring-bias).';

create index if not exists community_contributions_course_week_idx
  on public.community_contributions(course_id, week_number, created_at desc);

alter table public.community_contributions enable row level security;

create policy "community_contributions: owner insert"
  on public.community_contributions for insert
  with check (auth.uid() = user_id);

create policy "community_contributions: owner select own"
  on public.community_contributions for select
  using (auth.uid() = user_id);

-- Anti-anchoring-bias gate: you can see others' contributions for a
-- course+week only once you have your own contribution for that pair.
create policy "community_contributions: select gated by own contribution"
  on public.community_contributions for select
  using (
    exists (
      select 1 from public.community_contributions cc
      where cc.user_id = auth.uid()
        and cc.course_id = community_contributions.course_id
        and cc.week_number = community_contributions.week_number
    )
  );
