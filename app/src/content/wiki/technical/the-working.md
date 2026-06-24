---
title: "The Working — Technical Design"
type: design
status: proposed
audience: developer
description: Architecture for the intent-driven, graph-grounded ritual generator and practitioner lab-notebook. Design of record prior to implementation.
---

# The Working — Technical Design

**Last Updated:** June 2026
**Status:** Proposed — design of record, not yet implemented

> [!NOTE]
> This document captures the design before implementation so the intent is preserved. Anything marked **(existing)** is already in the database; anything marked **(to build)** does not exist yet.

---

## What it is

An intent-driven ritual generator that:

1. Takes a practitioner's stated intention.
2. Queries the correspondence graph for aligned components.
3. Synthesizes a step-by-step ritual from those components using an LLM, grounded entirely in the curated narratives.
4. Persists the ritual as an **experiment** with a hypothesis, auto-stamped casting conditions, and a longitudinal follow-up log.
5. Optionally publishes completed workings to the community.

This is distinct from the existing `/ritual-machine` route, which is a static catalog browser running on hardcoded mock data. The Working generates; the Ritual Library retrieves.

---

## Data foundation (existing)

The graph data needed for assembly already exists in the `digital-grimoire-library` Supabase project.

| Table | Role |
|---|---|
| `correspondences` | ~1,980 entities (stones, herbs, runes, tarot, colors, deities, timing, etc.) |
| `knowledge_claims` | Field/value claims per entity, including `issues_intentions_powers` |
| `correspondence_relationships` | Typed, weighted edges between entities |

### Narrative summaries (existing — and central)

`correspondences` carries the narrative workflow added in migration `039_add_correspondence_narrative_fields.sql`:

- `description` — the approved, user-facing narrative
- `narrative_draft` / `narrative_status` (`missing` | `draft` | `approved`) / `narrative_source` (`corpus` | `structured`)

**Status:** 1,972 of 1,980 entities are `approved`. These narratives are not optional decoration — they are the grounding context handed to the model. Without them the model gets a bare word list and falls back on training data; with them it composes from *our* curated, sourced knowledge. They are the reason the output is trustworthy.

### Intention matching (existing data, awkward shape)

Intentions live in `knowledge_claims` where `field_key = 'issues_intentions_powers'` (~610 claims; plus 9 legacy `issue_intention_power`). The problem: each claim's `field_value` is a single comma-separated blob, e.g.:

```
"abundance, anger, balance, beginnings, calm, change/s, clairvoyance, comfort, ..."
```

Matching currently requires `ILIKE '%prosperity%'` against that blob. This works for a prototype but blocks a clean, deduplicated intention picker and is slow at scale.

Categories that carry intention data today: stone (65), rune (23), tarot (20), ogham (18), celebration (15), herb_garden (14), number_symbol (13), tree (9), color (7), chakra (7), plus a long tail. **Planets and deities are sparse** — they would be reached through `correspondence_relationships` traversal rather than direct intention claims.

---

## Fixing the awkward structure (to build)

Normalize the CSV blobs into a junction table so intentions are first-class.

```sql
-- Proposed: entity_intentions
create table if not exists public.entity_intentions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.correspondences(id) on delete cascade,
  intention text not null,          -- normalized, lowercased, trimmed
  raw_value text,                   -- original token, preserves "balance (emotional)"
  source_claim_id uuid references public.knowledge_claims(id) on delete set null,
  created_at timestamptz default now()
);

create unique index if not exists idx_entity_intentions_unique
  on public.entity_intentions(entity_id, intention);
create index if not exists idx_entity_intentions_intention
  on public.entity_intentions(intention);
```

A backfill splits each `issues_intentions_powers` blob with `string_to_array(field_value, ',')`, trims, lowercases for the `intention` key, and keeps the original token in `raw_value` (so parenthetical qualifiers like `balance (emotional)` aren't lost). This gives:

- A clean `SELECT DISTINCT intention` for the picker UI.
- Indexed exact-match lookups for assembly.
- Per-intention entity counts for ranking.

> [!NOTE]
> Decision pending: junction table (recommended) vs. materialized view over `string_to_array(...)` vs. inline `unnest` at query time. Given repeated reads and the picker requirement, the junction table is the right call.

---

## Assembly (to build)

`POST /api/working/assemble` — given an intention (or free text resolved to one):

1. Look up matching entities via `entity_intentions`.
2. For each, traverse `correspondence_relationships` one hop to reach related timing/deity nodes not directly tagged.
3. Group results by category; select a balanced palette (e.g. 1–2 per category) weighted by relationship `weight`/`confidence`.
4. Attach each entity's approved `description` as grounding.

Output is a structured palette: components grouped by category, each with name, narrative, tradition, and confidence.

---

## Synthesis & the model test harness (to build first)

Ritual writing is voice-sensitive — model personality matters as much as correctness. Before wiring a production model, build a **test face** to compare candidates.

- **Provider:** OpenRouter via the AI SDK provider, so multiple models run behind one interface.
- **Candidates to compare:** Kimi, Qwen, DeepSeek (and others) — explicitly *not* assuming a Claude frontier model.
- **Test page:** a bare dev/admin route that takes an intention, shows the assembled palette, then runs the *same* palette prompt through each model in parallel and renders the outputs side-by-side for comparison.

The comparison is itself a future feature: practitioners could see multiple takes and pick the one that resonates, or rate them.

```
intention → /api/working/assemble → palette
         → for each model: synthesize(palette, model) [parallel]
         → render outputs side-by-side
```

Keep the synthesis prompt model-agnostic; the only variable in the test is the model id. Store nothing from the test face — it exists to choose a voice.

> [!NOTE]
> Requires an `OPENROUTER_API_KEY` env var. The test route should be admin-gated and excluded from production navigation until a model is chosen.

---

## Workings as experiments (to build)

A working is a specialized journal entry. It overlaps the existing journal/workbook tables (`015_add_journal_pages_SAFE.sql`, `034_enhance_journal_pages_for_workbooks.sql`).

**Decision pending:** extend `journal_pages` with a `working` page type and structured metadata, vs. a dedicated `workings` table that references the journal. Leaning toward a dedicated table that links into the journal so the long-form notes reuse journal infrastructure while the structured experiment fields stay clean.

Structured fields a working needs:

| Field | Purpose |
|---|---|
| `intent_text` | The hypothesis, in the practitioner's words (written before casting) |
| `palette` | The assembled components (jsonb) — what the graph supplied |
| `ritual` | The synthesized ritual (jsonb: steps, materials, timing) |
| `model_used` | Which model generated it |
| `cast_at` | Timestamp of the casting |
| `conditions` | Auto-stamped moon phase / day ruler / season at `cast_at` (jsonb) |
| `status` | `draft` \| `cast` \| `shared` |
| `shared_at` | When/if published to community |

### Auto-stamped conditions

When a working is marked cast, derive moon phase, planetary day-ruler, and season from `cast_at` — the same astronomical/correspondence data the graph already uses for timing. These are the experimental controls; capture them automatically rather than asking the practitioner.

### Follow-up log

Timestamped entries appended over days/weeks (`day 3 — nothing; day 9 — callback`). Reuse journal entry infrastructure linked to the working so the longitudinal trail is searchable alongside the rest of the practitioner's record.

---

## Community sharing (to build, later)

A published working exposes intent + ritual + conditions + outcome notes. The longer-term payoff: aggregate outcomes against the curated correspondences — a practitioner-evidence feedback loop layered over the tradition data. Sharing is opt-in per working; private by default.

---

## Build order

1. **Normalize intentions** → `entity_intentions` table + backfill.
2. **Assembly endpoint** → `/api/working/assemble`.
3. **Model test harness** → OpenRouter side-by-side comparison (admin-gated). Choose a voice.
4. **Workings persistence** → table + conditions auto-stamping + follow-up log.
5. **Practitioner UI** → intent → palette → ritual → cast → follow-up.
6. **Community sharing** → publish + browse.

---

## Open questions

- Junction table vs. materialized view for intention normalization (leaning junction).
- Dedicated `workings` table vs. extending `journal_pages` (leaning dedicated + journal link).
- Which model wins the test harness — deferred to the comparison.
- Route placement: `/extras/the-working` (under the Extras hub) vs. top-level feature.
