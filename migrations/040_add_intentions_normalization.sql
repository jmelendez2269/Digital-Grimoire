-- Migration 040: Normalize intentions for The Working
--
-- Splits the comma-separated `issues_intentions_powers` blobs in knowledge_claims
-- into a queryable, deduplicated structure:
--   intentions         = canonical, curatable list (powers the picker, holds synonyms)
--   entity_intentions  = junction (correspondence <-> intention), preserves raw token
--
-- Canonicalization strips parenthetical qualifiers so "balance (emotional)",
-- "balance (mental)", and "balance" all collapse to the intention "balance",
-- while the original token is preserved in entity_intentions.raw_value.
--
-- Idempotent: re-running is safe (ON CONFLICT DO NOTHING throughout).
-- Design of record: docs/planning/THE_WORKING_PLAN.md

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Canonical intention list (curatable)
create table if not exists public.intentions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  aliases text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_intentions_slug on public.intentions(slug);

-- Entity <-> intention junction
create table if not exists public.entity_intentions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.correspondences(id) on delete cascade,
  intention_id uuid not null references public.intentions(id) on delete cascade,
  raw_value text,                 -- original token, e.g. "balance (emotional)"
  source_claim_id uuid references public.knowledge_claims(id) on delete set null,
  created_at timestamptz default now()
);

create unique index if not exists idx_entity_intentions_unique
  on public.entity_intentions(entity_id, intention_id);
create index if not exists idx_entity_intentions_intention
  on public.entity_intentions(intention_id);
create index if not exists idx_entity_intentions_entity
  on public.entity_intentions(entity_id);

-- ============================================================================
-- BACKFILL
-- ============================================================================

-- 1) Seed canonical intentions from the distinct normalized tokens.
--    Only claims whose entity still exists in correspondences are considered;
--    ~401 claims were orphaned when "bad correspondence entities" were purged
--    without cascading (see graph-bundles/cleanup-bad-correspondence-entities-*).
with raw_tokens as (
  select
    trim(both from tok) as raw_value
  from public.knowledge_claims kc
  cross join lateral regexp_split_to_table(kc.field_value, ',') as tok
  where kc.field_key in ('issues_intentions_powers', 'issue_intention_power')
    and kc.field_value is not null
    and exists (select 1 from public.correspondences c where c.id = kc.entity_id)
),
normalized as (
  select
    nullif(
      trim(
        regexp_replace(
          lower(regexp_replace(raw_value, '\(.*?\)', '', 'g')),  -- drop parentheticals
          '\s+', ' ', 'g'                                        -- collapse whitespace
        )
      ),
      ''
    ) as canonical
  from raw_tokens
  where raw_value is not null and raw_value <> ''
)
insert into public.intentions (slug, label)
select distinct
  trim(both '-' from regexp_replace(canonical, '[^a-z0-9]+', '-', 'g')) as slug,
  canonical as label
from normalized
where canonical is not null
  and trim(both '-' from regexp_replace(canonical, '[^a-z0-9]+', '-', 'g')) <> ''
on conflict (slug) do nothing;

-- 2) Populate the junction, preserving the original token in raw_value.
with raw_tokens as (
  select
    kc.id as claim_id,
    kc.entity_id,
    trim(both from tok) as raw_value
  from public.knowledge_claims kc
  cross join lateral regexp_split_to_table(kc.field_value, ',') as tok
  where kc.field_key in ('issues_intentions_powers', 'issue_intention_power')
    and kc.field_value is not null
    and exists (select 1 from public.correspondences c where c.id = kc.entity_id)
),
normalized as (
  select
    claim_id,
    entity_id,
    raw_value,
    nullif(
      trim(
        regexp_replace(
          lower(regexp_replace(raw_value, '\(.*?\)', '', 'g')),
          '\s+', ' ', 'g'
        )
      ),
      ''
    ) as canonical
  from raw_tokens
  where raw_value is not null and raw_value <> ''
)
insert into public.entity_intentions (entity_id, intention_id, raw_value, source_claim_id)
select distinct on (n.entity_id, i.id)
  n.entity_id,
  i.id,
  n.raw_value,
  n.claim_id
from normalized n
join public.intentions i
  on i.slug = trim(both '-' from regexp_replace(n.canonical, '[^a-z0-9]+', '-', 'g'))
where n.canonical is not null
on conflict (entity_id, intention_id) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY  (graph data is public-read, admin-write)
-- ============================================================================

alter table public.intentions enable row level security;
alter table public.entity_intentions enable row level security;

-- intentions
drop policy if exists "Public read access for intentions" on public.intentions;
create policy "Public read access for intentions"
on public.intentions for select using (true);

drop policy if exists "Admins can write intentions" on public.intentions;
create policy "Admins can write intentions"
on public.intentions for all
to authenticated
using (
  exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
)
with check (
  exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
);

-- entity_intentions
drop policy if exists "Public read access for entity_intentions" on public.entity_intentions;
create policy "Public read access for entity_intentions"
on public.entity_intentions for select using (true);

drop policy if exists "Admins can write entity_intentions" on public.entity_intentions;
create policy "Admins can write entity_intentions"
on public.entity_intentions for all
to authenticated
using (
  exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
)
with check (
  exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
select
  (select count(*) from public.intentions) as canonical_intentions,
  (select count(*) from public.entity_intentions) as entity_links;
