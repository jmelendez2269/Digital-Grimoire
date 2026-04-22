# Handoff: Correspondence Claims Backfill

## Session Metadata
- Created: 2026-04-21 18:24:09
- Project: C:\Projects\Digital-Grimoire
- Branch: develop
- Session duration: roughly 3-4 hours across graph import, parser fixes, and live verification

### Recent Commits (for context)
  - ff6e5cf Add graph tooling, auth flow, and dev workflow updates
  - bb1bfcd Fix TypeScript compatibility and lint issues
  - 03e9a9a Fix TypeScript type compatibility for QueryableClient
  - 7774ceb Build and verify production deployment
  - 2125439 Merge all changes to develop branch

## Handoff Chain

- **Continues from**: None (fresh start)
- **Supersedes**: None

> This is the first handoff for this task.

## Current State Summary

The correspondence graph import pipeline is partially successful: chapters 1, 2, and 3 of *Llewellyn's Complete Book of Correspondences* are already imported into live Supabase as entities plus relationships, and the interactive graph/connection views work. The newly discovered flaw is that the rich entity detail cards are powered by `knowledge_claims`, but the importer currently only writes `correspondences` and `correspondence_relationships`. That means the "connections" card is healthy while the "all correspondences for this entity" card is under-populated. The correct next step is to pause additional chapter imports, extend the bundle/import format to emit claims from parsed fields, then backfill chapters 1-3 from the parsed artifacts already generated.

## Codebase Understanding

### Architecture Overview

There are two parallel data surfaces for correspondence entities:
- Graph/network data comes from `correspondences`, `correspondence_entity_types`, `correspondence_relationship_types`, and `correspondence_relationships`.
- Detail/property data comes from `knowledge_claims` queried by entity id and rendered as `field_key` / `field_value` groups.

The book ingestion flow currently looks like this:
1. Raw chapter text is staged under `graph-bundles/books/llewellyns-complete-book-of-correspondences/`.
2. A builder script converts that raw text into a parsed JSON artifact and a graph bundle JSON.
3. `preview-graph-import.ts` diffs the bundle against live Supabase.
4. `import-graph.ts` calls `importGraphBundle()` in `app/scripts/graph-bundle.ts`.
5. `importGraphBundle()` upserts only graph entities/types/relationships, not claims.

For book sections:
- Chapter 1 uses a section-style builder.
- Chapters 2 and 3 use `build-book-reference-bundle.js`, which parses source entries with structured fields and subsections.

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| [app/scripts/build-book-reference-bundle.js](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/build-book-reference-bundle.js) | Builds parsed JSON + graph bundle for chapter 2/3 style sections | Main place to add claim emission from parsed fields |
| [app/scripts/graph-bundle.ts](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/graph-bundle.ts) | Bundle schema, export, diff, and import logic | Must be extended to persist claims alongside entities/edges |
| [app/scripts/import-graph.ts](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/import-graph.ts) | CLI entrypoint for live import | Uses `importGraphBundle()` unchanged |
| [app/scripts/preview-graph-import.ts](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/preview-graph-import.ts) | Live preview/diff tool | Helpful for validating bundle changes before reimport |
| [app/src/components/graph/EntityDetails.tsx](/abs/path/C:/Projects/Digital-Grimoire/app/src/components/graph/EntityDetails.tsx) | Public graph-side entity detail card | Confirms UI reads `/api/knowledge/claims` |
| [app/src/components/admin/EntityDetailModal.tsx](/abs/path/C:/Projects/Digital-Grimoire/app/src/components/admin/EntityDetailModal.tsx) | Admin detail modal | Also confirms card data depends on claims |
| [app/src/app/api/graph/entities/route.ts](/abs/path/C:/Projects/Digital-Grimoire/app/src/app/api/graph/entities/route.ts) | Graph entity fetch endpoint | Returns entity metadata only, not claims |
| [graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-02-plants-parsed.json](/abs/path/C:/Projects/Digital-Grimoire/graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-02-plants-parsed.json) | Canonical parsed chapter 2 artifact | Best source for claims backfill |
| [graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-03-gemstones-metals-sea-parsed.json](/abs/path/C:/Projects/Digital-Grimoire/graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-03-gemstones-metals-sea-parsed.json) | Canonical parsed chapter 3 artifact | Best source for claims backfill |
| [app/scripts/cleanup-bad-correspondence-entities.ts](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/cleanup-bad-correspondence-entities.ts) | Cleanup for old sentence-like bad entities | Already executed successfully; useful as precedent for safe maintenance scripts |

### Key Patterns Discovered

- The graph UI intentionally tolerates partial entity metadata, but the property/detail UI does not; it assumes claims exist.
- Parsed chapter artifacts already preserve field groupings well enough to generate claims faithfully without revisiting raw OCR/text extraction.
- `build-book-reference-bundle.js` treats subsection variants as `refines` relationships under a main entity, which is the right shape for graph edges and likely also right for claims if claims are written per source entity.
- The builder has already been hardened against sentence-like spillover, wrapped field lines, `Energy`, lowercase standalone headings like `chrysocolla`, `See separate entry for ...` instructions, and `(CONTINUED)` / `CONTINTUED`.
- Live preview/import commands often need escalation because `npx.cmd tsx ...` inside the sandbox can fail with `spawn EPERM`.

## Work Completed

### Tasks Finished

- [x] Imported chapter 1 correspondence bundle to live Supabase
- [x] Added sentence-like entity guardrails in the correspondence pipeline
- [x] Added and executed stale bad-entity cleanup for legacy sentence-like archetype rows
- [x] Built chapter 2 parser/bundle/import flow for plant-style reference sections
- [x] Imported chapter 2 successfully after preview validation
- [x] Built chapter 3 parser/bundle/import flow for gemstones/metals/sea sections
- [x] Fixed chapter 3 parsing bugs around subsection handling and stray heading promotion
- [x] Previewed and imported chapter 3 successfully
- [x] Diagnosed the missing-detail-card flaw as a claims persistence gap, not a graph relationship problem
- [x] Started chapter 4 builder category mapping only; did not stage, build, preview, or import chapter 4

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| app/scripts/build-book-reference-bundle.js | Added robust book-reference parsing, subsection handling, chapter 3 fixes, and partial chapter 4 category mappings | Core builder for chapter 2/3 imports and future claims emission |
| app/scripts/graph-bundle.ts | Existing importer/exporter used for all live imports; no claim support yet | This is the key file to extend next |
| app/scripts/import-graph.ts | Used for live imports | Stable CLI entrypoint |
| app/scripts/preview-graph-import.ts | Used to diff bundles against live graph | Stable validation step before import |
| app/scripts/cleanup-bad-correspondence-entities.ts | Added cleanup utility and executed it | Removed 32 stale sentence-like archetype rows |
| app/src/components/graph/EntityDetails.tsx | Inspected only | Confirms properties card loads `knowledge_claims` |
| app/src/components/admin/EntityDetailModal.tsx | Inspected only | Confirms admin detail modal also loads claims |
| app/src/app/api/graph/entities/route.ts | Inspected only | Confirms graph entity fetch is not the missing piece |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Keep graph relationship import model | Rebuild graph data model vs preserve current edges | Current graph/network behavior is already correct and validated |
| Use parsed JSON as source for future claims | Re-parse raw text vs generate claims from parsed artifacts | Parsed artifacts already preserve grouped fields and are safer to reuse |
| Pause chapter 4 import work | Continue importing chapters vs fix claims pipeline first | Prevents accumulating more graph-only imports without matching detail-card data |
| Keep variants as subsection/refinement nodes | Flatten variants into top-level entries vs nested refines | Matches current graph model and worked well for chapter 3 |

## Pending Work

### Immediate Next Steps

1. Extend the bundle format in `app/scripts/graph-bundle.ts` to support correspondence claims payloads for entities.
2. Update `app/scripts/build-book-reference-bundle.js` so each parsed section emits claim records from its `fields`, likely one claim per field label per entity/subsection source node.
3. Update `importGraphBundle()` to upsert those claims into `knowledge_claims` using the resolved correspondence entity ids.
4. Build a safe backfill for chapters 1-3 from existing parsed/bundle artifacts, preview/check it, then run it against live.
5. Only after claims are flowing correctly, resume chapter 4 staging and import.

## Immediate Next Steps

1. Extend `app/scripts/graph-bundle.ts` so bundles can carry correspondence claim payloads.
2. Teach `app/scripts/build-book-reference-bundle.js` to emit claims from parsed field blocks for both main entries and subsection entities.
3. Update `importGraphBundle()` to upsert those claims into `knowledge_claims` keyed to resolved correspondence entity ids.
4. Backfill chapters 1-3 from existing parsed artifacts and validate before touching chapter 4.

### Blockers/Open Questions

- [ ] Exact `knowledge_claims` table shape was not re-opened in this session; verify required columns and uniqueness strategy before implementing claim import.
- [ ] Need to decide whether claim rows should be written for subsection entities only, main entities only, or both. Current recommendation: both, keyed to the actual source entity that owns the parsed field block.
- [ ] Need to decide whether `Issues, Intentions & Powers` should be stored as one comma-joined `field_value` or as multiple claims. Current UI expects comma-separated multi-values to be parsed client-side, so one claim per field is probably best.

### Deferred Items

- Chapter 4 staging and import were intentionally deferred until claims support is added.
- Any UI redesign was deferred because the issue is currently a data persistence gap, not a component problem.
- Delegating work to sub-agents was discussed but intentionally skipped because the next change is still one coherent pipeline change.

## Context for Resuming Agent

### Important Context

This is the key insight to preserve: the app has two different "truth surfaces" for correspondences. The graph/network uses `correspondences` plus `correspondence_relationships`, and that part is working. The detail cards use `knowledge_claims`, and our book import path never writes those. So the right fix is not "improve graph edges" and not "patch the UI to derive fields from edges." The right fix is to make the book import pipeline emit and import claims in addition to edges. The parsed chapter artifacts are already rich enough to do this cleanly, so do not go back to OCR or raw-text inference unless you absolutely have to.

Already imported live:
- Chapter 1 imported
- Chapter 2 imported
- Chapter 3 imported
- Legacy bad sentence-like archetype cleanup executed successfully

Chapter 2 import stats:
- 209 new entities
- 7118 new relationships

Chapter 3 import stats:
- Parsed: 126 entries, 201 sections, 0 warnings
- Preview: 197 new entities, 5487 new relationships
- Import: 201 correspondence entities, 5487 correspondence relationships

The chapter 3 parser is in a good state now. Do not regress these fixes:
- `Energy` is parsed correctly
- `Issue, Intention/Power` is recognized
- lowercase standalone headings like `chrysocolla` are promoted correctly
- title-case variants like `Banded Agate` become subsections
- `See separate entry for ...` lines are skipped
- `(CONTINUED)` and `(CONTINTUED)` are normalized

Partial chapter 4 work already landed in `build-book-reference-bundle.js`:
- added `ANIMALS`
- added `BIRDS`
- added `MARINE LIFE`
- added `REPTILES`
- added `INSECTS AND MISCELLANEOUS`
- added `MYTHICAL CREATURES`
- expanded `Time of Day` to support `Times of Day`

That category mapping is fine to keep, but no chapter 4 raw text file or import flow should be assumed complete.

## Important Context

The graph side and the detail-card side are reading from different persistence layers. Graph/network behavior comes from `correspondences` plus `correspondence_relationships`, and that layer is already importing correctly for chapters 1-3. The detail/properties cards in `EntityDetails.tsx` and `EntityDetailModal.tsx` load `knowledge_claims`, but the current bundle/import path never writes those claims. That is the core flaw. The next agent should fix the import pipeline to emit and persist claims from parsed field blocks, backfill chapters 1-3 using the parsed JSON artifacts already on disk, and only then continue chapter 4 ingestion.

### Assumptions Made

- `knowledge_claims` remains the canonical source for the entity property/detail cards.
- A claim model of one row per field label per entity with comma-separated `field_value` is compatible with the existing UI because `parsePropertyValue()` already splits comma-separated values.
- Existing imported chapter 1-3 entities and relationships can remain in place while claims are backfilled; no rollback is currently needed.
- Preview/import scripts should continue to be used before any live backfill.

### Potential Gotchas

- `npx.cmd tsx ...` may fail in sandbox with `spawn EPERM`; rerun with escalation rather than assuming the script itself is broken.
- The working tree is dirty in many places unrelated to this task. Do not revert unrelated changes.
- There are warnings about access to `C:\Users\Jen_a/.config/git/ignore`; they did not block work.
- `build-book-reference-bundle.js` now contains partial chapter 4 category/type additions. That change is intentional and not evidence that chapter 4 is ready.
- If you extend the bundle schema, remember to update both `exportGraphBundle()` and `diffGraphBundles()` only if needed. For this task the main need is `importGraphBundle()` plus the producer side. Avoid unnecessary exporter churn.

## Environment State

### Tools/Services Used

- Node scripts under `app/scripts/`
- Supabase live project via service role in `app/.env.local`
- Preview/import CLI flow:
  - `npx.cmd tsx scripts/preview-graph-import.ts --input <bundle>`
  - `npx.cmd tsx scripts/import-graph.ts --input <bundle>`
- Cleanup script:
  - `npx.cmd tsx scripts/cleanup-bad-correspondence-entities.ts ...`

### Active Processes

- No known long-running local dev server or watcher was started by this session.
- The previous turn was interrupted once while beginning chapter 4 work, but no long-running process is known to still matter.

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Related Resources

- [app/scripts/build-book-reference-bundle.js](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/build-book-reference-bundle.js)
- [app/scripts/graph-bundle.ts](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/graph-bundle.ts)
- [app/scripts/import-graph.ts](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/import-graph.ts)
- [app/scripts/preview-graph-import.ts](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/preview-graph-import.ts)
- [app/scripts/cleanup-bad-correspondence-entities.ts](/abs/path/C:/Projects/Digital-Grimoire/app/scripts/cleanup-bad-correspondence-entities.ts)
- [app/src/components/graph/EntityDetails.tsx](/abs/path/C:/Projects/Digital-Grimoire/app/src/components/graph/EntityDetails.tsx)
- [app/src/components/admin/EntityDetailModal.tsx](/abs/path/C:/Projects/Digital-Grimoire/app/src/components/admin/EntityDetailModal.tsx)
- [graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-02-plants-parsed.json](/abs/path/C:/Projects/Digital-Grimoire/graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-02-plants-parsed.json)
- [graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-02-plants-bundle.json](/abs/path/C:/Projects/Digital-Grimoire/graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-02-plants-bundle.json)
- [graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-03-gemstones-metals-sea-parsed.json](/abs/path/C:/Projects/Digital-Grimoire/graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-03-gemstones-metals-sea-parsed.json)
- [graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-03-gemstones-metals-sea-bundle.json](/abs/path/C:/Projects/Digital-Grimoire/graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-03-gemstones-metals-sea-bundle.json)
- [graph-bundles/cleanup-bad-correspondence-entities-dry-run.json](/abs/path/C:/Projects/Digital-Grimoire/graph-bundles/cleanup-bad-correspondence-entities-dry-run.json)
- [graph-bundles/cleanup-bad-correspondence-entities-executed.json](/abs/path/C:/Projects/Digital-Grimoire/graph-bundles/cleanup-bad-correspondence-entities-executed.json)
- [graph-bundles/cleanup-bad-correspondence-entities-postcheck.json](/abs/path/C:/Projects/Digital-Grimoire/graph-bundles/cleanup-bad-correspondence-entities-postcheck.json)

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
