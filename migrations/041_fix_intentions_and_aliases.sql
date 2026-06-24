-- Migration 041: Fix intention normalization + curate synonym aliases
--
-- Two corrections to migration 040:
--   1) Split bug: values like "energy (general, receptive)" contain a comma
--      INSIDE the parenthetical, so splitting on comma first produced junk
--      tokens ("energy (general", "receptive)", "moon)", "magic (black"...).
--      Fix: strip parentheticals (including inner commas) BEFORE splitting.
--   2) A few malformed source rows leaked Ogham/Rune metadata into the
--      intention field ("... symbol: letter: l"). A length + keyword sanity
--      filter drops these.
--
-- Also seeds intentions.aliases[] for the obvious synonym clusters so the
-- picker resolves intent (money <- wealth/prosperity/abundance) not strings.
--
-- intentions + entity_intentions hold only DERIVED data, so we rebuild them
-- from knowledge_claims (source of truth, untouched). Idempotent.
-- Design of record: docs/planning/THE_WORKING_PLAN.md

-- Rebuild derived tables from scratch (child first for the FK).
truncate table public.entity_intentions;
truncate table public.intentions cascade;

-- ----------------------------------------------------------------------------
-- Backfill 1: canonical intentions (corrected split + sanity filter)
-- ----------------------------------------------------------------------------
with raw_tokens as (
  select trim(both from tok) as raw_value
  from public.knowledge_claims kc
  cross join lateral regexp_split_to_table(
    regexp_replace(kc.field_value, '\([^)]*\)', '', 'g'),   -- strip parens incl inner commas
    ','
  ) as tok
  where kc.field_key in ('issues_intentions_powers', 'issue_intention_power')
    and kc.field_value is not null
    and exists (select 1 from public.correspondences c where c.id = kc.entity_id)
),
normalized as (
  select nullif(trim(regexp_replace(lower(raw_value), '\s+', ' ', 'g')), '') as canonical
  from raw_tokens
)
insert into public.intentions (slug, label)
select distinct
  trim(both '-' from regexp_replace(canonical, '[^a-z0-9]+', '-', 'g')) as slug,
  canonical as label
from normalized
where canonical is not null
  and char_length(canonical) <= 40
  and canonical !~ '(symbol:|letter|/laguz|eamhancholl|ngetal|éabhadh)'
  and trim(both '-' from regexp_replace(canonical, '[^a-z0-9]+', '-', 'g')) <> ''
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- Backfill 2: junction (corrected split + sanity filter)
-- ----------------------------------------------------------------------------
with raw_tokens as (
  select kc.id as claim_id, kc.entity_id, trim(both from tok) as raw_value
  from public.knowledge_claims kc
  cross join lateral regexp_split_to_table(
    regexp_replace(kc.field_value, '\([^)]*\)', '', 'g'),
    ','
  ) as tok
  where kc.field_key in ('issues_intentions_powers', 'issue_intention_power')
    and kc.field_value is not null
    and exists (select 1 from public.correspondences c where c.id = kc.entity_id)
),
normalized as (
  select claim_id, entity_id, raw_value,
    nullif(trim(regexp_replace(lower(raw_value), '\s+', ' ', 'g')), '') as canonical
  from raw_tokens
)
insert into public.entity_intentions (entity_id, intention_id, raw_value, source_claim_id)
select distinct on (n.entity_id, i.id)
  n.entity_id, i.id, n.raw_value, n.claim_id
from normalized n
join public.intentions i
  on i.slug = trim(both '-' from regexp_replace(n.canonical, '[^a-z0-9]+', '-', 'g'))
where n.canonical is not null
  and char_length(n.canonical) <= 40
on conflict (entity_id, intention_id) do nothing;

-- ----------------------------------------------------------------------------
-- Alias curation: group near-synonyms onto a primary intention.
-- Aliases are resolution hints; alias rows remain queryable so assembly can
-- union entities across a primary + its aliases. Nothing is deleted.
-- ----------------------------------------------------------------------------
update public.intentions set aliases = '{wealth,prosperity,abundance}'        where slug = 'money';
update public.intentions set aliases = '{romance,affection}'                  where slug = 'love';
update public.intentions set aliases = '{defense,defensive,guardian}'         where slug = 'protection';
update public.intentions set aliases = '{well-being,wellbeing}'               where slug = 'healing';
update public.intentions set aliases = '{calm}'                               where slug = 'peace';
update public.intentions set aliases = '{clairvoyance,clairaudience,prophecy,visions}' where slug = 'psychic-ability';
update public.intentions set aliases = '{clarity,concentration-focus,concentrate-focus,intelligence}' where slug = 'the-mind';
update public.intentions set aliases = '{confidence,determination,assertiveness}' where slug = 'courage';
update public.intentions set aliases = '{knowledge,insight,enlightenment}'    where slug = 'wisdom';
update public.intentions set aliases = '{optimism}'                           where slug = 'happiness';
update public.intentions set aliases = '{change-s,rebirth-renewal}'           where slug = 'transformation';

-- Verification
select
  (select count(*) from public.intentions) as canonical_intentions,
  (select count(*) from public.entity_intentions) as entity_links,
  (select count(*) from public.intentions where array_length(aliases,1) > 0) as intentions_with_aliases;
