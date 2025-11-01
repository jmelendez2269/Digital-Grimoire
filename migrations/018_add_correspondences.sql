-- Phase 3A: Correspondence graph core tables
-- Requires pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- Entities
create table if not exists public.correspondences (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in (
    'planet','element','deity','tarot','sephirah','path','metal','herb','color','sign','house','angel','demon','stone','note','other'
  )),
  aliases text[] default '{}',
  description text,
  lenses text[] default '{}',
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_correspondences_category on public.correspondences(category);
create index if not exists idx_correspondences_aliases on public.correspondences using gin (aliases);
create unique index if not exists idx_correspondences_slug on public.correspondences(slug);

-- Relationships
create table if not exists public.correspondence_relationships (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.correspondences(id) on delete cascade,
  target_id uuid not null references public.correspondences(id) on delete cascade,
  type text not null check (type in (
    'corresponds_to','associated_with','governs','opposes','harmonizes_with','derives_from'
  )),
  weight numeric not null default 0.5 check (weight >= 0 and weight <= 1),
  confidence text not null default 'tradition' check (confidence in ('established','interpretive','speculative','tradition')),
  source_citation text,
  notes text,
  created_by uuid,
  created_at timestamptz default now()
);

create unique index if not exists idx_corr_unique_edge on public.correspondence_relationships(source_id, target_id, type);
create index if not exists idx_corr_type on public.correspondence_relationships(type);
create index if not exists idx_corr_weight on public.correspondence_relationships(weight);

-- Optional: updated_at trigger (if you have a shared function, reuse; otherwise skip)
-- Uncomment and adjust if a generic set_updated_at() function exists
-- create trigger set_correspondences_updated_at
--   before update on public.correspondences
--   for each row execute procedure public.set_updated_at();


