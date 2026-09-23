# Inquiry-to-knowledge workflow

## Implemented scope

An admin can create a private inquiry, capture sources from the existing product, write a contextualized connection, review it, and publish it to the shared concept map. The inquiry preserves an ordered discovery trail for replay and Markdown export.

- `/journal?tab=research`: saved research in the existing Study Journal, grouped by starting question.
- `/journal/research/[id]`: notes, findings, entity selection, admin review/publication, replay and export.
- `/inquiries` and `/inquiries/[id]`: redirects to the corresponding Journal views; existing links and saved records are retained.
- `/graph?type=research`: public graph and accessible evidence list.
- `/admin/knowledge-graph`: redirects the previously dangling admin link to the authoring workspace.
- Existing correspondence and course views remain available from graph navigation. The older concepts table is not repopulated.

## Data and identity

`research_inquiries` holds owner-scoped questions and private notes. `research_entities` holds typed entries; a unique `correspondence_id` links an existing archive identity without modifying its symbolic associations. Qualified names distinguish different senses of a term. `research_findings` combines a sourced claim, typed relationship, endpoints, context, personal notes, and review state.

This additive authoring store follows the course graph's distinction between evidence and interpretation. It does not repurpose course-import rows or require an inquiry to pretend to be a course. Course package identities and inquiry identities are not automatically merged.

The publishable evidence classes are direct statement/image, documented history, tradition attestation, scholarly interpretation, and personal interpretation of a source. These are bases for a claim, not truth scores. An AI answer is a research lead, not publishable evidence.

## Access and publication

All three tables have RLS enabled and no `anon`/`authenticated` grants. API routes authenticate with `getUser` and check inquiry ownership before using the service client. Review and publication additionally require the server-side admin role. Members can maintain private inquiries and entries; their findings cannot enter the public map. Mutations check request origin against Host. Public map and suggestion endpoints are exact public routes; authoring endpoints remain protected.

Review and publication transitions lock the finding, verify owner/admin and expected revision, and enforce evidence requirements. Draft edits also use revision checks. Return to draft clears review and publication. Ordering is serialized per inquiry.

The public projection explicitly excludes personal notes, query/provenance, inquiry identity, and reviewer identity. Only entries referenced by a published finding enter autocomplete. Correspondences already in the public archive remain available as labeled suggestions independently of inquiry publication.

Library captures preserve text/chunk IDs; review verifies quotation content against the stored source. Concept Search now constructs displayed quotations and bibliographic identity from retrieved records, never from generated excerpt fields. A cache-version prefix prevents older generated excerpts from reappearing. Unknown page numbers remain null. External source observations are curator-attested and carry their URL and location; the app does not independently authenticate an external quotation.

## Installation

Apply these additive migrations in order before running the updated application:

1. `supabase/migrations/20260915120000_inquiry_knowledge.sql`
2. `supabase/migrations/20260915123000_inquiry_search_suggestions.sql`

The subsequent discovery and member-access migrations, credit rules, and local testing instructions are documented in [Question-led discovery](RESEARCH_DISCOVERY.md).

No model or paid provider is required for inquiry capture, curation, replay, or publication. Existing generation entitlements still apply to Concept Search and Seven Lenses generation.

## Verification

Run from `app`:

```text
pnpm exec tsx --test tests/inquiry-knowledge.test.ts tests/concept-search-recorded-demo.test.ts tests/course-graph-no-legacy.test.ts tests/public-browse-access.test.ts tests/public-discovery.test.ts
pnpm exec tsc --noEmit --incremental false
```

`app/tests/inquiry-knowledge.sql` exercises database ownership, grants, review/publication, stale revisions, AI evidence rejection and trail ordering inside a rolled-back transaction.

With local Supabase running and both migrations applied:

```text
pnpm exec tsx scripts/inquiry-dev.ts
pnpm exec tsx scripts/verify-inquiry-workflow.ts
```

The local launcher uses port 3027, `.next-inquiry`, and a distinct auth cookie. It reads local Supabase status and refuses hosted database URLs. The browser script creates temporary local fixtures, exercises the UI and API, captures screenshots under `.tmp/inquiry-verification`, and removes its fixtures. It invokes no paid generation.

## Local verification results — September 15, 2026

- TypeScript (`tsc --noEmit`) and ESLint on all new inquiry files pass.
- All 25 focused inquiry, search recording, course graph, and public-access tests pass. The expanded 32-test run has one existing course-copy failure: `CourseLearnerRenderer` uses “Curator's note” while the copy test expects “Why I chose this path”.
- Existing lint errors remain in `AnnotationPanel.tsx` (untyped values and quotation escaping) and `EntityDetails.tsx` (an untyped prop); the added integration code passes.
- Local SQL assertions pass, including grants, ownership, review transitions, stale revisions, and ordering.
- Both course graph renderer regression tests pass. The new concept map shows overview connections, and the shared renderer tolerates temporarily hidden containers during route transitions.
- The real-browser workflow passes: inquiry creation, correspondence reuse/capture, new work entry, source review, publication, public autocomplete, private-data exclusion, replay, Markdown export, desktop/mobile rendering, quotation verification, ordering, and unpublication. No browser runtime errors were observed. Temporary fixtures were removed.

## Boundaries

- This release adds a complete curator workflow; it does not enable community editing or automatically publish AI-discovered connections.
- Replay is private. Publishing a connection does not publish its inquiry or journal notes. Export includes private notes and is intended for the curator.
- The public map loads 200 findings at a time and supports explicit loading of more. Its text filter covers loaded findings. The inquiry editor loads up to 500 findings per inquiry.
- Course graph candidate imports keep their separate identity/review lifecycle. A future cross-course identity review can add explicit bridges without rewriting correspondence records.
- Migration/application deployment to hosted environments is separate from local verification.
