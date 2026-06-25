---
title: "The Working — Technical Design"
type: design
status: in-progress
audience: developer
description: Architecture for the intent-driven, graph-grounded ritual generator and practitioner lab-notebook. Engine built (Phases 1–3 + 2.5); persistence/UI/sharing pending.
---

# The Working — Technical Design

**Last Updated:** June 2026
**Status:** Engine complete (assembly + semantic resolution + synthesis). Persistence, UI, and community sharing not yet built.

> [!NOTE]
> Sections are marked **(built)** or **(to build)**. Full phase log and decisions of record: `docs/planning/THE_WORKING_PLAN.md`. Fresh-context handoff: `docs/planning/THE_WORKING_HANDOFF.md`.

---

## What it is

An intent-driven ritual generator that:

1. Takes a practitioner's stated intention (a slug or free-text).
2. Resolves it to canonical intentions (deterministic, with a semantic LLM fallback).
3. Queries the correspondence graph for aligned components and assembles a balanced palette.
4. Synthesizes a ritual from those components with an LLM, grounded entirely in the curated narratives.
5. **(to build)** Persists the ritual as an **experiment** with a hypothesis, auto-stamped casting conditions, and a longitudinal follow-up log.
6. **(to build)** Optionally publishes completed workings to the community.

Distinct from the static `/ritual-machine` catalog. The Working *generates*; the Ritual Library *retrieves*.

---

## Data foundation (built)

Production Supabase project: **`ukguqtghfglirszsqqdj`** (digital-grimoire-library).

| Table | Role |
|---|---|
| `correspondences` | ~1,980 entities; `description` = approved narrative (1,972 approved, migration 039). The narratives are the grounding context for synthesis — central, not decoration. |
| `intentions` | ~243 canonical intentions, with `aliases[]` (synonym clusters). The curatable picker vocabulary. |
| `entity_intentions` | Junction: `entity_id` → `intention_id`, with `raw_value`. ~11k links across 609 entities. |
| `knowledge_claims` | Source field/value claims (intentions originally lived here as comma-blobs in `issues_intentions_powers`). |
| `correspondence_relationships` | Typed, weighted edges; one-hop traversal reaches patron deities/planets. |

### Intentions normalization (built — migrations 040, 041)

The original `issues_intentions_powers` claims were single comma-separated blobs. `040` normalized them into `intentions` (canonical) + `entity_intentions` (junction). `041` fixed a parenthetical-split bug (`"energy (general, receptive)"` was splitting on the inner comma) and curated 11 synonym clusters into `aliases[]` (money ← wealth/prosperity/abundance, etc.). Both idempotent; the backfill re-derives from `knowledge_claims`.

### Claim recovery (built — `scripts/recover-claims-from-bundle.ts`)

A prior dedup process merged duplicate entities but never migrated their `knowledge_claims`, orphaning 4,248 of them. The 31 `app/*-merge-plan.json` files hold exact `variant.id → canonical.id` mappings; the script remapped 4,070 claims (deleting 176 redundant), taking entities-with-intentions from **218 → 609** and filling ~398 previously-bare entities. A pre-change JSON backup is in `graph-bundles/` (gitignored). 2 unmapped orphans remain (harmless).

---

## Assembly (built — `src/lib/working/assemble.ts`)

`assemblePalette(supabase, input)` → resolves via `resolveIntention()` (deterministic) → `assemblePaletteForSlugs(supabase, slugs, intention)`.

`assemblePaletteForSlugs` is the reusable slug-set core:
1. Resolve `intentions` rows for the union of slugs (canonical + aliases, or the semantic set).
2. Find entities via `entity_intentions` (chunked `.in()`, ≤100 ids/request — header-limit safe).
3. One-hop traversal via `correspondence_relationships` → patron beings (deity/planet categories).
4. Group by display bucket — **Timing / Materials / Symbols / Energetics / Patrons & Beings / Other** — rank (narrative-first, then match count, then name), cap 8/group.
5. Attach each entity's approved `description` as grounding.

`POST /api/working/assemble` returns the palette only.

---

## Semantic intent resolution (built — `src/lib/working/resolve-intent.ts`, Phase 2.5)

The deterministic resolver only knows the esoteric vocabulary, so modern phrasing ("a new job aligned with my highest timeline") missed. `resolveIntentSemantic()`:
1. Deterministic fast-path (free, instant) — exact slug / label / alias / token.
2. On a miss: hand Haiku the full `intentions` catalog + the user phrase; it returns 1–4 canonical slugs (validated against the catalog) + a one-line `interpretation`.
3. The returned slugs are unioned via `assemblePaletteForSlugs` — nuanced intents yield richer palettes.

No embeddings/pgvector — reuses `ANTHROPIC_API_KEY`. Model: `claude-haiku-4-5`.

Verified: "new job aligned with my highest timeline" → `{success, opportunities, purpose}`; "let go of an ex" → `{release, heartbreak, healing}`.

---

## Synthesis (built — `src/lib/working/synthesize.ts`)

`buildSynthesisPrompt(palette)` is **the canonical prompt and the real asset**, carrying seven layers learned via the bake-off: **structure · voice · holism · way-in · permission · petition · record**. `synthesizeRitual(palette)` calls the model and returns `{ text, model }`.

- **Production model:** `WORKING_SYNTHESIS_MODEL = "claude-haiku-4-5"` (direct Anthropic). Chosen via bake-off — best voice/speed/cost (~0.7¢/ritual, ~17–20s). Sonnet 4.6 kept as a future "deepen this" premium option.
- `temperature: 1` for variety; `max_tokens: 1400`.
- The bake-off (`scripts/working-model-bakeoff.ts`) imports `buildSynthesisPrompt` so the lab and production never drift. It compares Kimi/Qwen/DeepSeek (OpenRouter, `--models`) and Sonnet/Haiku (direct, prefix `anthropic:`). Full record: `docs/planning/working-model-bakeoff-success.md`.

**Key finding:** ritual quality (holism) is *promptable* — once the prompt carried it, the gap between models narrowed sharply, making model choice about voice/speed/cost rather than capability.

`POST /api/working/generate` (auth-gated, `maxDuration = 60`): `{intention}` → deterministic → semantic fallback → assemble → synthesize → `{ palette, ritual, interpretation? }`.

---

## Workings as experiments (to build — Phase 4)

**Decision of record: dedicated `workings` table** (not extending `journal_pages`). Structured experiment fields get real columns; free-form follow-up notes link to journal entries.

| Field | Purpose |
|---|---|
| `intent_text` | The hypothesis, in the practitioner's words (before casting) |
| `palette` | Assembled components (jsonb) |
| `ritual` | The synthesized ritual (text/jsonb) |
| `model_used` | Which model generated it |
| `cast_at` | Timestamp of the casting |
| `conditions` | Auto-stamped moon phase / planetary day-ruler / season at `cast_at` (jsonb) |
| `status` | `draft` \| `cast` \| `shared` |
| `shared_at` | When/if published |

RLS owner-private by default. Auto-stamp `conditions` from the same astronomical/correspondence data the graph uses for timing. Follow-up log = journal entries linked to the working (reuse `015`/`034` journal infra).

---

## Practitioner UI (to build — Phase 5)

Flow: intent → palette → synthesized ritual → cast (writes hypothesis + auto-stamped conditions) → follow-up log. Route placement open: `/extras/the-working` vs. top-level.

## Community sharing (to build — Phase 6)

Publish a completed working (intent + ritual + conditions + outcome notes); opt-in, private by default. Long-term: aggregate outcomes against correspondences — a practitioner-evidence loop.

---

## Status summary

| Phase | State |
|---|---|
| 1 — Intentions normalization (040, 041) | ✅ built |
| Recovery — orphaned claims (218 → 609 entities) | ✅ built |
| 2 — Assembly endpoint | ✅ built |
| 2.5 — Semantic intent resolution | ✅ built |
| 3 — Synthesis + model choice (Haiku 4.5) | ✅ built |
| 4 — Workings persistence | ⏭ to build |
| 5 — Practitioner UI | ⏭ to build |
| 6 — Community sharing | ⏭ to build |
