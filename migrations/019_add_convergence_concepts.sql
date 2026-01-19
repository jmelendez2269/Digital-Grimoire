-- Phase 3B: Convergence concepts tables
create extension if not exists pgcrypto;

create table if not exists public.convergence_concepts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tradition text not null,
  tradition_id uuid, -- Optional FK to convergence_traditions (added by migration 031)
  era text,
  short_definition text,
  primary_sources text[] default '{}',
  tags text[] default '{}',
  created_by uuid,
  created_at timestamptz default now()
);

create index if not exists idx_concepts_tradition on public.convergence_concepts(tradition);
create index if not exists idx_concepts_tags on public.convergence_concepts using gin(tags);

create table if not exists public.convergence_relationships (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.convergence_concepts(id) on delete cascade,
  target_id uuid not null references public.convergence_concepts(id) on delete cascade,
  similarity numeric not null default 0.5 check (similarity >= 0 and similarity <= 1),
  source_citation text,
  notes text,
  created_by uuid,
  created_at timestamptz default now()
);

create unique index if not exists idx_conv_unique_edge on public.convergence_relationships(source_id, target_id);

