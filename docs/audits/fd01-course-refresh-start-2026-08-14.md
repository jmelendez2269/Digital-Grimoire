# FD01 Course Refresh Review

**Effective date:** August 14, 2026  
**Product:** Prismarium  
**Course:** FD01 — *Mythic Imagination: When Old Stories Find You*  
**Production slug:** `fd01-mythic-imagination-from-classical-pattern-to-personal-meaning`  
**Status:** Review-stage implementation verified locally; production and editorial gates remain

## Mission Control basis

The refresh uses the canonical packet under `C:\Projects\Parallax_mission_control\docs\courses`:

- `fd01-recreation-draft.md` is the six-week learner-facing review draft.
- `fd01-approval-record.md` authorizes the reconstruction and review title but withholds final course, reading-list, importer, database, and publication approval.
- `fd01-source-and-rights-register.md` leaves edition, translator, completeness, source, and rights reconciliation open.
- `fd01-exercise-verification.md` requires parser, learner-interface, and product-practice verification.
- `fd01-graph/manifest.v1.json` is the review-only Week 3 Pattern Test graph.

The stable production slug is preserved. The retired Hero's Journey Taster remains outside this refresh.

## Verification completed

### Parser and learner renderer

`npm.cmd run test:course-parser` passed **13/13 tests**. The draft parses without warnings, contains six weeks with reading counts `2, 3, 3, 3, 4, 0`, preserves companion cards and completion pathways C02/C08/C15, and survives parse → serialize → parse.

The local parser preview was then reviewed through all **24 learner states**:

- Weeks 1–4: Start, Readings, Companions, Practice, Finish.
- Weeks 5–6: Start, Readings/Returns, Practice, Finish.
- The expected Concept Search, Seven Lenses, Course Knowledge, and capstone practices appeared in their assigned weeks.
- Week 6 displayed all three return choices.
- No Next.js error overlay or browser console error remained.

This review found and fixed a V2 parser defect that changed internal em dashes in two week titles into joined hyphens. Exact-title regression assertions now cover both headings.

### Product-practice routes

- Concept Search: the signed-out public replay rendered its sourced result and correctly gated creation of a new search.
- Seven Lenses: the FD01 prompt rendered all seven current lens names and correctly gated analysis controls for signed-out visitors.
- Course Knowledge: with the preview flag off, the route failed closed. With a temporary process-only local flag, the exact Week 3 saved view rendered its six ordered records, reviewed non-edge, citations, and caveats without browser errors. The flag was not persisted.

### FD01 graph

`npm.cmd run test:course-graph` passed **19/19 tests**, covering the exact six-edge saved view, deterministic canonicalization, evidence requirements, learner sanitization, fallback behavior, and the fail-closed preview flag.

### Read-only import rehearsal

`npm.cmd run courses:rehearse-fd01-refresh` parsed the canonical Mission Control file and queried the configured Supabase project without writing. The configured current and production URLs resolve to the same project, so no separate staging database is presently available.

Rehearsal facts:

- Source SHA-256: `dc93bcaa29dcf32775b571a3bc60e949d9192813e0775c59f5bcb7120a8bd73c`.
- Candidate: 6 weeks, 15 reading assignments, 12 internal catalog matches, 3 intentionally external/citation-first readings.
- Existing row: `54124896-3e73-4000-829b-70a7bab44478`, published, updated July 31, 2026.
- The existing production content is already the six-week reconstruction. Its only exact content differences from the candidate are the two corrected em-dash headings.

This conflicts with the Mission Control approval record's statement that the live snapshot remains unchanged. The discrepancy must be reconciled before any production update or approval claim.

The shared catalog matcher now recognizes the three curated Perseus aliases used by the learner preview. The importer rehearsal consequently matches 12/15 assignments instead of 9/15. Remaining unmatched readings are the Met's *Dangerous Beauty* and the two APA readings, which are intended as external sources.

The existing-course update path was also corrected to preserve the course's current publication state. The publish checkbox now applies only to new courses; updating an existing published course cannot accidentally unpublish it, and updating a draft cannot silently publish it.

## Catalog and rights blockers

The matched catalog records still require metadata or edition review:

- *Thus Spake Zarathustra*: missing license and source URL.
- Jung's *Psychology of the Unconscious*: catalog metadata is populated, but the Mission Control candidate cites Gutenberg 65903/Hinkle while the production record points to Gutenberg 47942; confirm the exact edition and translation.
- Bulfinch's *The Age of Fable*: missing license and source URL.
- Hume's *The Natural History of Religion*: missing year and publisher.
- *The Masnavi*: missing publisher and license.
- *The Golden Bough*: missing license and source URL; edition/completeness ambiguity remains.

## Safety boundary observed

This review did not:

- write to Supabase or call the course import API;
- change the existing course record, publication state, enrollments, progress, or release configuration;
- acquire, upload, or relink source texts;
- change the Taster, redirects, or pathways;
- persist the FD01 graph preview flag;
- deploy Prismarium or modify Mission Control.

The temporary local servers were stopped after browser verification.

## Remaining gates

1. Reconcile the Mission Control live-state claim with the published six-week production row.
2. Resolve exact edition, translator, completeness, source, and rights evidence for the internal reading spine, including the Jung and *Golden Bough* discrepancies.
3. Obtain the required modern and tradition-connected review.
4. Record final editorial approval for the course and reading list.
5. Obtain separate, explicit authorization before applying the two heading corrections or any catalog-link changes to production.
6. Update both Mission Control roadmap mirrors to `[~]` when that repository is writable, without marking FD01 approved or published.
