-- Phase 3A: Correspondence graph core tables
create extension if not exists pgcrypto;

-- Entities
create table if not exists public.correspondences (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
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
  type text not null,
  weight numeric not null default 0.5 check (weight >= 0 and weight <= 1),
  confidence text not null default 'tradition',
  source_citation text,
  notes text,
  created_by uuid,
  created_at timestamptz default now()
);

create unique index if not exists idx_corr_unique_edge on public.correspondence_relationships(source_id, target_id, type);
create index if not exists idx_corr_type on public.correspondence_relationships(type);
create index if not exists idx_corr_weight on public.correspondence_relationships(weight);

-- Table-level constraints (avoids column-scope resolution issues in some editors)
alter table public.correspondences
  add constraint if not exists correspondences_category_allowed
  check (category in ('planet','element','deity','tarot','sephirah','path','metal','herb','color','sign','house','angel','demon','stone','note','other'));

alter table public.correspondence_relationships
  add constraint if not exists correspondence_relationships_type_allowed
  check (type in ('corresponds_to','associated_with','governs','opposes','harmonizes_with','derives_from')),
  add constraint if not exists correspondence_relationships_confidence_allowed
  check (confidence in ('established','interpretive','speculative','tradition'));


