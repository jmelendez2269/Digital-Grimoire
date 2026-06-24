# The Working — Implementation Plan

**Status:** Planning → ready to start Phase 1
**Created:** June 2026
**Owner:** solo dev
**Wiki:** [user guide](../../app/src/content/wiki/user/the-working.md) · [technical design](../../app/src/content/wiki/technical/the-working.md)

> Living plan. Check items off as they ship. Decisions of record are at the top so we don't relitigate them.

---

## What we're building

An intent-driven ritual generator and practitioner lab-notebook. A practitioner states an intention; the correspondence graph assembles a palette of aligned components (each with its curated narrative); an LLM synthesizes a step-by-step ritual from that palette; the result is saved as an **experiment** with a hypothesis, auto-stamped casting conditions, and a longitudinal follow-up log. Completed workings can be shared to the community.

Distinct from `/ritual-machine` (static catalog on mock data). The Working *generates*; the Ritual Library *retrieves*. They're complementary — a Working can be saved as a ritual.

---

## Decisions of record

### Decision 1 — Intention normalization: **two tables**
- `intentions` (canonical, curated): `slug`, `label`, `aliases[]`, optional grouping. Powers the picker and resolves synonyms (money → wealth → prosperity).
- `entity_intentions` (junction): `entity_id` → `intention_id`, plus `raw_value` to preserve original tokens like `balance (emotional)`.
- **Why:** the blob data is full of near-synonyms; a junction alone matches strings, but the canonical table lets us match *intent*. A materialized view can't hold curation.

### Decision 2 — Workings storage: **dedicated `workings` table + journal link**
- Structured experiment fields get real columns. Free-form follow-up notes reuse journal entries, linked back to the working.
- **Why:** the feature's identity is "structured experiment." Don't bury queryable meaning in a jsonb blob — same principle as Decision 1.

### Decision 3 — Foundation first
- Lay clean data foundation before the model test harness. No prototyping against the messy `ILIKE` blob.

### Still open
- Route placement: `/extras/the-working` vs. top-level. **Defer to UI phase.**
- Which model wins the test harness. **Defer to Phase 3.**
- Exact `intentions` grouping/synonym taxonomy — seed raw first, curate iteratively.

---

## Data foundation (existing — do not rebuild)

- `correspondences` (~1,980 entities) with approved `description` narratives (1,972 approved via migration 039). **The narratives are the grounding context for synthesis — central, not decorative.**
- `knowledge_claims` — intentions live where `field_key = 'issues_intentions_powers'` (~610 claims), as comma-separated blobs.
- `correspondence_relationships` — typed, weighted edges for one-hop traversal to reach sparse categories (planets, deities).
- Project: `digital-grimoire-library` (Supabase ref `ukguqtghfglirszsqqdj`).

---

## Phases

### Phase 1 — Normalize intentions (foundation) ✅ DONE (June 2026)
- [x] Migration `040_add_intentions_normalization.sql`: `intentions` + `entity_intentions` (+ indexes, RLS). Applied to production.
- [x] Backfill: split `issues_intentions_powers` blobs → `entity_intentions`; seed distinct tokens → `intentions`.
- [x] Preserve `raw_value`; lowercase + strip parentheticals for the canonical key.
- [x] Verified: 246 canonical intentions, 1,745 links, 218 entities. "money" assembly preview returns stones/timing/numbers/element as expected.
- [x] Migration `041_fix_intentions_and_aliases.sql` (June 2026): fixed a split bug + curated aliases. Applied to production.
  - **Split bug fixed:** `"energy (general, receptive)"` was being split on its inner comma into junk tokens (`energy (general`, `receptive)`, `moon)`, `magic (black`…). Corrected to strip parentheticals *before* splitting; added a length/keyword sanity filter for a few malformed Ogham/Rune source rows. Rebuilt from `knowledge_claims` (source untouched).
  - **Result:** 214 clean canonical intentions (was 246), 1,718 links, 218 entities, **0 junk slugs**.
  - **Aliases curated:** 11 synonym clusters (money←wealth/prosperity/abundance, love←romance/affection, protection←defense/defensive/guardian, healing←well-being, peace←calm, psychic-ability←clairvoyance/clairaudience/prophecy/visions, the-mind←clarity/concentration-focus/intelligence, courage←confidence/determination/assertiveness, wisdom←knowledge/insight/enlightenment, happiness←optimism, transformation←change-s/rebirth-renewal). Alias rows kept (not deleted); union happens at query time. Picker = 186 canonical intentions.
  - **Assembly contract for Phase 2:** given a chosen intention, union entities across its slug + `aliases[]`. Verified: "money" union spans 12 categories (14 stones + timing + numbers + herbs…).

> [!DATA NOTE] **Coverage gap:** deities and planets have zero valid intention claims. Phase 2's one-hop relationship traversal is how the palette will reach them.

---

## Orphaned knowledge_claims — RECOVERY IS FEASIBLE & PRECISE (via merge plans)

**Audited June 2026. Verdict: 95.8% precisely recoverable via saved dedup merge plans. Do not delete until recovered.**

### Confirmed recovery path (merge plans, NOT the bundle)

The bundle approach is a dead end: re-importing claims by `entity_slug` only re-inserts claims that already exist (the 556 surviving entities) and helps 0 bare entities, because orphaned claims belong to entity slugs that were *removed* during dedup.

The correct mechanism: `apply-dedup-plan.ts` merged variant entities into canonicals and redirected **relationships**, but never migrated **knowledge_claims** — so variant claims orphaned when variants were deleted. The **31 `app/*-merge-plan.json` files** record exact `variant.id → canonical.id` mappings (1,451 variants → 680 canonicals). Remap orphan claims along those mappings.

**Dry-run against production (`recover-claims-from-bundle.ts --prod --via-merge-plans`):**
- Orphan claims: 4,248 across 428 entities
- **Remappable to a live canonical: 4,070 (95.8%)** — incl. **401 intention claims**
- Redundant (canonical already has field+source): 176 → delete
- Canonical entities gaining claims: 427, of which **398 are currently bare**
- Orphan entities with no usable mapping: **1** (negligible)

**Impact:** fills 398 bare entities; ~triples intention coverage (218 → ~600 entities); gives deities/planets their intention claims (closes the Phase 2 gap).

### Execute — DONE (June 2026, production)
Ran `recover-claims-from-bundle.ts --prod --via-merge-plans --execute`:
1. ✅ Backup of all 4,248 orphan rows → `graph-bundles/orphan-claims-backup-2026-06-24T18-09-58-716Z.json` (full reversibility).
2. ✅ Remapped 4,070 claims to canonicals (skipping duplicates of existing field+source).
3. ✅ Deleted 176 redundant. **2 unmapped claims (1 entity) left in place for review** — not deleted.
4. ✅ Re-ran 041 backfill.

**Outcome (verified):**
| Metric | Before | After |
|---|---|---|
| Entities with intentions | 218 | **609** |
| entity_intentions links | 1,718 | **11,002** |
| Live entities with any claims | 562 | **960** |
| Orphaned claims | 4,248 | **2** |
| Planets (planetary_body) with intentions | 0 | **10** |

Note: deities still carry 0 *direct* intention claims (they connect via relationships, not the `issues_intentions_powers` field) — Phase 2's one-hop traversal remains the way to reach them.

**Tiny follow-up (low priority):** 2 remaining orphan claims (1 entity with no merge-plan mapping). Review or delete later; harmless.

### Superseded notes (kept for history)
The earlier "not feasible" verdict (no shared join key) and the bundle re-import idea are both wrong/dead — see above.

- **Scale:** of 9,846 `knowledge_claims`, **5,598 valid / 4,248 orphaned** (43%) — all `entity_type = 'correspondence'`, pointing to `entity_id`s absent from `correspondences`. Spans 428 distinct dead entities. 1,418 of 1,980 live entities currently have **zero** claims.
- **Cause:** the 2026-05-10 19:27 import loaded claims; later dedup scripts (`plan-dedup-merges.ts`, `apply-dedup-plan.ts`, `dedupe-correspondences.ts`) merged/removed duplicate entity rows (new UUIDs), stranding their claims. **Not** the 2026-04-21 bad-entity purge (only 3 `archetype` rows).
- **The source of truth exists in the repo:** `graph-bundles/staging-to-live-graph-2026-05-10.json` holds **3,434 entities + 9,594 claims**, and **claims are keyed by `entity_slug`** (not UUID). Verified the slug join: sample bundle slugs match live `correspondences.slug`. (Earlier "not feasible" verdict was wrong — it checked the wrong JSON key, `.nodes` instead of `.entities`/`.claims`.)
- **Recovery path — targeted claims-only script (NOT the full importer):**
  - `importGraphBundle` (`app/scripts/graph-bundle.ts:635-700`) already resolves `entity_slug` → live `entity_id`, skips slugs absent from live (respects dedup), and does idempotent delete-then-insert per entity+source.
  - **BUT** a full `import-graph.ts` run also upserts all 3,434 bundle entities (`:554-569`), which would **resurrect the ~1,454 deduped entities** — do not do this.
  - Write a focused `recover-claims-from-bundle.ts` that runs ONLY the claims block: re-attach by slug to existing live entities, dry-run + report first, then execute.
  - After re-attach, delete remaining orphans (now redundant — data re-homed on live entities by slug).
- **Benefit:** populates the 1,418 bare live entities with rich properties (material, musical_note, planets, deities…), directly enriching The Working's palettes and giving deities/planets their intention claims.
- **Do NOT** run a blind `DELETE` or a full bundle import. Recover first via the targeted script, then clean orphans. After recovery, re-run migration 041's backfill so `entity_intentions` picks up the newly-attached intention claims.

### Phase 2 — Assembly endpoint
- [ ] `POST /api/working/assemble` — intention (or free text → resolved intention) → palette.
- [ ] Match via `entity_intentions`; one-hop traversal via `correspondence_relationships` for timing/deity.
- [ ] Group by category; balanced selection (1–2 per category) weighted by `weight`/`confidence`.
- [ ] Attach each entity's approved `description` as grounding.
- [ ] Output: structured palette (category → {name, narrative, tradition, confidence}).

### Phase 3 — Model test harness (the comparison)
- [ ] OpenRouter provider via AI SDK; `OPENROUTER_API_KEY` env var.
- [ ] Admin-gated dev route: intention → palette → run same prompt through Kimi / Qwen / DeepSeek in parallel → side-by-side output.
- [ ] Keep synthesis prompt model-agnostic (only the model id varies).
- [ ] Store nothing — this exists to choose a voice.
- [ ] **Outcome:** pick the production model.

### Phase 4 — Workings persistence
- [ ] Migration: `workings` table — `intent_text`, `palette` (jsonb), `ritual` (jsonb), `model_used`, `cast_at`, `conditions` (jsonb), `status` (draft|cast|shared), `shared_at`, RLS (owner-private by default).
- [ ] Auto-stamp `conditions` (moon phase / day ruler / season) from `cast_at`.
- [ ] Follow-up log: journal entries linked to a working; timestamped, searchable.

### Phase 5 — Practitioner UI
- [ ] Flow: intent → palette → synthesized ritual → cast → follow-up.
- [ ] Hypothesis captured before casting.
- [ ] Decide route placement (resolve open question).

### Phase 6 — Community sharing
- [ ] Publish a completed working (intent + ritual + conditions + outcome notes); opt-in.
- [ ] Browse shared workings.
- [ ] (Later) aggregate outcomes against correspondences — practitioner-evidence loop.

---

## Proposed schema (Phase 1 + Phase 4)

```sql
-- Phase 1: canonical intentions
create table if not exists public.intentions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  aliases text[] default '{}',
  created_at timestamptz default now()
);

-- Phase 1: entity ↔ intention junction
create table if not exists public.entity_intentions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.correspondences(id) on delete cascade,
  intention_id uuid not null references public.intentions(id) on delete cascade,
  raw_value text,
  source_claim_id uuid references public.knowledge_claims(id) on delete set null,
  created_at timestamptz default now()
);
create unique index if not exists idx_entity_intentions_unique
  on public.entity_intentions(entity_id, intention_id);
create index if not exists idx_entity_intentions_intention
  on public.entity_intentions(intention_id);

-- Phase 4: workings
create table if not exists public.workings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  intent_text text not null,
  palette jsonb,
  ritual jsonb,
  model_used text,
  status text not null default 'draft' check (status in ('draft','cast','shared')),
  cast_at timestamptz,
  conditions jsonb,
  shared_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## Next action

Start **Phase 1**: write the migration for `intentions` + `entity_intentions`, then the backfill. Nothing downstream is solid until intentions are queryable.
