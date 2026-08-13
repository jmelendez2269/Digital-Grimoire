# Handoff: Lean Membership L4-04 complete; L4-05 ready

## Session Metadata

- Created: 2026-08-12 11:15:31
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `agent/lean-membership-l2`
- Session duration: Approximately 1 hour 20 minutes

### Recent Commits (for context)

- `1344eb1` Complete Lean Membership Phase L3
- `a93c6b7` Complete Lean Membership Phase L2
- `5191f12` Record lean membership plans and verification
- `30e129f` Persist PRE learner progress and Journal work
- `850049d` Contain commercial actions and restore server authority

## Handoff Chain

- **Continues from:** [2026-08-12-095911-lean-membership-l4-03-complete-l4-04-ready.md](./2026-08-12-095911-lean-membership-l4-03-complete-l4-04-ready.md)
- **Supersedes:** That predecessor for current implementation status. Read it only for earlier L4-01 through L4-03 architecture and rationale.

## Current State Summary

`LEAN-L4-04` is complete locally on top of the intentionally uncommitted L4-01 through L4-03 packet. One-lens expansion now uses the shared server-only adapter at one credit, validates an authenticated user's durable parent before any hold, derives query/weights/length from that parent, requires the selected lens to have been active, creates and persists a distinct user-owned child result before settlement/content delivery, and replays the exact completed child without provider or charge. The client shows the cost, retains a UUID across ambiguous retries, aborts on teardown, and preserves the parent. The controlling tracker is at 88/114 points (77.2%), Phase L4 is 16/21, and `LEAN-L4-05` is ready: fail closed Deep Search, image generation, and generic generation bypasses without blocking ordinary search, Library, Graph, Journal, or saved-result reopen. All commercial and metering gates remain default closed; nothing was deployed or activated.

## Codebase Understanding

## Architecture Overview

The authoritative metering lifecycle remains `app/src/lib/membership/metering-adapter.server.ts`. The L4-04 operation is isolated in `app/src/lib/parallax/metered-lens-expansion.server.ts`. Before it calls the adapter, it loads the exact `convergence_responses` parent scoped to the authenticated user, validates the saved lens weights and response metadata, and rejects an inactive or invalid lens. The adapter then applies entitlement, quote, abuse controls, reserve/commit/release, replay, and privacy-safe usage settlement for `seven_lenses.expand`.

Expansion persistence uses a separate `convergence_lens_expansions` child table rather than mutating the already-settled parent JSON. Each result has its own UUID, owner, parent UUID, lens ID, response, sources, and timestamps. The result reference prefix is `seven-lenses-expansion:`, distinct from the parent synthesis prefix `seven-lenses:`. The migration forces RLS, grants authenticated users read-only access to their own children, and leaves writes service-only.

The route accepts only `parentResponseId` and a distinct expansion `requestId`; the dynamic route segment supplies the lens. Query, weights, response length, action, price, balance, plan, and metering mode are server-owned. `ExpandableLensCard` retains its logical-action UUID only for ambiguous outcomes, aborts on unmount, and is remounted by a `parentResponseId:lensId` key when the parent changes.

`LEAN-L4-05` should start from the existing default-closed commercial guard matrix in `app/tests/commercial-availability.test.ts`. The main generative seams already enumerated there include Deep Search, the three generic AI proxy routes, cover and tarot image generation, chapter-name generation, metadata extraction, and document/media processing. L4-05 must prove these cannot become fresh unmetered public generation paths while zero-credit non-generative product surfaces remain available.

## Critical Files

| File | Purpose | Relevance |
|---|---|---|
| `docs/planning/prismarium-membership-implementation-tracker.md` | Immediate implementation source of truth | L4-04 is done; L4-05 is ready; progress is 88/114 |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Controlling scope and launch gates | Prevents L4-05 from becoming production activation or broad feature work |
| `app/src/lib/membership/metering-adapter.server.ts` | Shared authoritative lifecycle | All enabled paid generation must use this path |
| `app/src/lib/membership/metering-catalog.server.ts` | Server-owned quotes and default-closed modes | Expansion quote is one credit; Deep Search remains provisional and closed |
| `app/src/lib/parallax/metered-lens-expansion.server.ts` | Owned-parent, provider, persistence, and replay operation | L4-04 core implementation and reference pattern |
| `app/src/app/api/parallax/lens/[lensId]/route.ts` | Customer-facing expansion endpoint | Accepts only parent/request UUIDs and returns only durable settled content |
| `app/src/components/parallax/ExpandableLensCard.tsx` | Expansion UI/retry lifecycle | Exact cost, stable UUID, abort, preserved parent, exact replay |
| `app/src/components/parallax/ResponseStream.tsx` | Threads the parent ID into expansion cards | Prevents query-based ownership inference |
| `app/src/app/seven-lenses/page.tsx` | Owns current durable parent response ID | Supplies that ID for both new and history-loaded analyses |
| `app/src/lib/parallax/lens-orchestrator.ts` | Single-lens provider execution | Now supports abort, fail-fast, and provider-attempt accounting |
| `supabase/migrations/20260812110000_lean_l4_04_lens_expansions.sql` | Durable expansion child schema | Forward migration; source-verified locally, not remotely applied in this packet |
| `app/tests/lens-expansion-metered.test.ts` | Controlled L4-04 fixtures and static contracts | Proves one-credit, replay, isolation, release, UI, route, and migration boundaries |
| `app/tests/commercial-availability.test.ts` | Default-closed route inventory | Primary starting point for L4-05 bypass audit |
| `docs/audits/lean-l4-04-lens-expansion-metering-local-2026-08-12.md` | Accepted local evidence | Exact verification results, limitations, rollback, and next packet |

### Key Patterns Discovered

- Validate durable parent ownership and immutable action inputs before entering a billable hold.
- Keep parent synthesis and each expansion as separate logical actions with distinct request fingerprints, result UUIDs, and result-reference prefixes.
- Persist a child record instead of mutating an already-settled parent response; this makes replay and ownership unambiguous.
- A completed retry may reload the parent for authorization but must perform no retrieval, provider, child persistence, reservation, or charge.
- Clients submit stable UUIDs, never cost, action code, balance, entitlement, plan, prompt-derived ownership, or provider configuration.
- Retain a request UUID after in-progress, replay-failed, settlement-ambiguous, or disconnect outcomes. Clear it after definitive validation or released failures.
- Active metered routes record aggregate provider identifiers/units/cost only and never query text.
- Commercial availability and metering are independent gates. Both remain default closed.
- L4-05 is containment work: prove generative bypasses fail closed without making free, non-generative product surfaces depend on metering.

## Work Completed

### Tasks Finished

- [x] Traced the durable parent ID from Seven Lenses generation and history loading through `ResponseStream` into each expansion card.
- [x] Added the server-only one-credit expansion operation around `seven_lenses.expand`.
- [x] Added owned-parent and active-lens validation before any hold or provider call.
- [x] Added separate durable expansion children with forced RLS and service-only writes.
- [x] Removed query, weights, length, price, and query-bearing legacy telemetry from the active expansion route.
- [x] Added stable client UUID retry, abort, cost copy, callback restoration, and parent-preservation behavior.
- [x] Extended the single-lens orchestrator with abort, provider-attempt, fail-fast, and metered empty-result behavior while preserving the legacy non-metered fallback.
- [x] Added nine controlled expansion tests and integrated them into the shared metering command.
- [x] Updated membership/commercial integration expectations for the newly connected route.
- [x] Ran the React quality review and removed stale client props left by the legacy request body.
- [x] Verified the protected route and public home route at 375x812 without credentials or generation.
- [x] Wrote the evidence packet and updated mission control to L4-04 done/L4-05 ready.

## Files Modified

| File | Changes | Rationale |
|---|---|---|
| `app/src/lib/parallax/metered-lens-expansion.server.ts` | Added owned-parent load, provider deadline, privacy-safe usage, child persistence, and replay | Core authoritative L4-04 operation |
| `app/src/app/api/parallax/lens/[lensId]/route.ts` | Replaced legacy direct generation with strict metered UUID contract | Remove the expansion bypass and client-owned prompt inputs |
| `app/src/lib/parallax/lens-orchestrator.ts` | Added options for signal, fail-fast, and provider-attempt capture | Correct abort/release and usage accounting |
| `app/src/components/parallax/ExpandableLensCard.tsx` | Added one-credit UI, stable retry UUID, abort, settled-result validation, and callback | Safe customer-facing expansion lifecycle |
| `app/src/components/parallax/ResponseStream.tsx` | Added explicit parent ID and removed legacy query/length expansion props | Tie expansion to durable ownership rather than prompt text |
| `app/src/app/seven-lenses/page.tsx` | Passes the durable current/history response ID to the stream | Reopen and expand saved analyses safely |
| `supabase/migrations/20260812110000_lean_l4_04_lens_expansions.sql` | Added user-owned durable expansion child table and RLS | Preserve settled parent immutability and exact replay |
| `app/tests/lens-expansion-metered.test.ts` | Added nine controlled L4-04 stories | Prove lifecycle, isolation, failure, client, and schema contracts |
| `app/tests/membership-metering.test.ts` | Updated connected-route expectation | Include expansion in shared metering coverage |
| `app/tests/commercial-availability.test.ts` | Updated expansion marker to the metered operation | Preserve gate-before-work containment assertion |
| `app/package.json` | Added expansion suite to `test:membership-metering` | Keep regression command authoritative |
| `docs/audits/lean-l4-04-lens-expansion-metering-local-2026-08-12.md` | Added local evidence | Record acceptance, limits, rollback, and browser boundary |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Marked L4-04 done, L4-05 ready, 88/114 | Current mission-control truth |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Updated the immediate next move | Keep controlling plan aligned |

The dirty worktree also contains the preceding L4-01 through L4-03 implementation and evidence. Do not delete or reset it.

## Decisions Made

| Decision | Options Considered | Rationale |
|---|---|---|
| Store expansions in a separate child table | Mutate parent JSON; insert another parent-shaped row; dedicated child | Keeps the settled parent immutable and gives each expansion an addressable owner/parent/lens identity |
| Load and validate the parent before the adapter hold | Reserve first then load; accept client prompt inputs; prevalidate owned parent | Invalid/unowned parents must not reserve credits or invoke providers |
| Derive query, weights, and length from the saved parent | Trust client fields; infer from query/history; load durable parent | Prevents client invention and binds generation to an exact owned result |
| Use a distinct expansion request UUID and result prefix | Reuse parent request; use a random ID every retry; distinct stable identity | Prevents parent/child collision and duplicate charging while supporting exact replay |
| Persist before settlement and content response | Return provider content first; durable-first | No valuable content is delivered without an addressable child and settled lifecycle |
| Retain UUID only for ambiguous outcomes | Always retain; always clear; outcome-specific retention | Avoids double charges after disconnect while allowing a new attempt after a definitive release |
| Keep L4-04 local and default closed | Apply migration/deploy/activate; controlled local packet | Production and authenticated real-provider proof belong to later explicit gates |

## Pending Work

## Immediate Next Steps

1. Start `LEAN-L4-05` by reconciling every generative route and UI entry point against `app/tests/commercial-availability.test.ts`, `app/src/lib/commercial-availability.ts`, the membership action catalog, and the L0-04 evidence. Produce an explicit inventory of fresh-generation paths versus free read/search/reopen paths before editing.
2. Strengthen or add controlled tests proving Deep Search, image generation, the generic AI proxies, and any document/media generation seam fail closed before authentication, prompt parsing, storage, retrieval, provider construction, or provider calls when not explicitly offered. Preserve ordinary search, Library, Graph, Journal, course access, and saved-result reopen at zero credits.
3. Remove or contain any uncovered client/server bypass without enabling Deep Search or image metering. Keep exact server guard tokens, opaque no-store unavailable responses, and independent metering/commercial gates.
4. Run focused containment tests, the full 84-test membership/commercial regression set, lint, TypeScript, `git diff --check`, production build, and safe browser checks of free surfaces plus closed generation surfaces.
5. Write L4-05 evidence, update the tracker/launch plan, and leave L4-06 as the real authenticated provider/database/credit gate.

### Blockers/Open Questions

- No blocker for the local L4-05 containment packet.
- Determine whether all currently guarded document/media routes actually perform fresh AI generation or only processing. Classify by implementation and side effects; do not over-block zero-cost non-generative operations merely because they share a broad route category.
- No approved authenticated test credential is available. L4-06 still owns real provider, database, balance, concurrency, and kill-switch stories.

### Deferred Items

- Applying the L4-04 migration to any remote environment is deferred to an explicitly authorized deployment gate.
- Real provider, customer, database, and credit stories are deferred to L4-06.
- Production migrations/deployments, environment changes, Stripe/customer operations, canary activation, and public paid release remain deferred to L5-05.
- Deep Search metering/cache and image offering remain deferred product decisions; L4-05 only contains their fresh-generation bypasses.

## Context for Resuming Agent

## Important Context

- The tracker is authoritative: L4-04 is done, L4-05 is ready, launch progress is 88/114, and Phase L4 is 16/21.
- The workspace is intentionally dirty and uncommitted across L4-01 through L4-04. Preserve the accumulated packet work.
- Three unrelated pre-existing user edits must remain untouched: `app/src/lib/parsers/course-markdown-parser.ts`, `app/tests/course-parser-v2.test.ts`, and `supabase/config.toml`.
- Do not commit, push, open a PR, deploy, apply remote migrations, alter environment variables, run real providers/Stripe/customer actions, or activate metering without explicit user authorization.
- The new L4-04 migration exists in the worktree but was not applied remotely and was validated by controlled/static contracts, not a live database story.
- L4-05 must not wire provisional Deep Search or image actions into metering. Its job is fail-closed bypass containment while preserving free non-generative functionality.
- The current commercial guard is the first safety layer. Metered tools also require their independent action mode/kill switches; default closure must remain intact.
- Historical L0-04 evidence already established the initial route containment baseline. L4-05 should refresh it against current routes and clients rather than assume the 2026-08-06 inventory is still complete.
- Latest verification: L4-04 focused 9/9; shared metering 31/31; total membership/commercial 84/84; focused ESLint passed; standalone TypeScript passed; `git diff --check` passed with line-ending warnings; mission-control audit found zero broken links/drift; production build generated 139/139 pages.
- Browser verification at 375x812 proved `/seven-lenses` redirects unauthenticated users to sign-in with no overlay and the public home page renders. No authenticated expansion was exercised.

## Assumptions Made

- Local implementation and controlled fixtures satisfy L4-04; L4-06 owns authenticated real-provider/database proof.
- The dedicated expansion child table is additive and will be deployed only through a later authorized forward-migration workflow.
- Default-closed commercial and metering gates must remain independent and unchanged.
- The current branch remains `agent/lean-membership-l2` until the user directs otherwise.
- Existing untracked L4 files are intentional work product, not disposable artifacts.

## Potential Gotchas

- The parent synthesis request UUID and durable parent response UUID are different identities. Neither may be reused as the expansion request UUID. The runtime result-reference prefix also prevents a completed parent request from replaying as an expansion.
- Completed expansion replay still loads the parent first for authorization, but it must not retrieve context, invoke a provider, persist, reserve, or charge.
- `generateLensResponse` remains used by legacy non-metered orchestration too. Its empty fallback is preserved unless `throwOnProviderError` is true; the metered expansion deliberately treats whitespace content as empty and releases.
- `ExpandableLensCard` keys include the parent ID, so a parent change remounts the card and aborts the old request. Do not remove that key behavior casually.
- Rejecting extra expansion body fields is intentional. Do not reintroduce query, weights, length, price, balance, or action fields for convenience.
- The commercial containment test is marker-based. An updated marker must still identify the first meaningful side effect and prove the guard precedes it; do not weaken it merely to make a refactor pass.
- Some L4-05 routes may perform both non-AI processing and optional AI work. Preserve safe free behavior and guard the AI branch at the earliest meaningful boundary.
- Known non-fatal build warnings remain: baseline-browser-mapping freshness, middleware convention deprecation, Sentry client naming, and expected dynamic-cookie messages.
- Git may warn that the user-profile global ignore file is unreadable in the sandbox; this is not a repository failure.

## Environment State

### Tools/Services Used

- Local PowerShell and Node/npm tooling.
- Next.js 16 production build using webpack.
- Controlled Node test fixtures; no real provider or credit mutation.
- `agent-browser` at 375x812 on isolated port 3101 for protected-route redirect and public-home checks.
- Mission-control audit script; zero broken links, index issues, or mirror drift. One pre-existing zero-byte `radix_usage.txt` remains unrelated.

### Active Processes

- No L4 server or browser session is running. The isolated port-3101 production server was stopped and the browser session was closed.
- An unrelated pre-existing development process, if still present, was not inspected or changed.

### Environment Variables

Names only; do not record or change values:

- `PRISMARIUM_METERING_MODE`
- `PRISMARIUM_METERING_ACTION_MODES`
- `PRISMARIUM_METERING_GLOBAL_KILL_SWITCH`
- `PRISMARIUM_METERING_ACTION_KILL_SWITCHES`
- `PRISMARIUM_READER_MONTHLY_PROVIDER_BUDGET_USD`
- `PRISMARIUM_COMMERCIAL_ACTIONS`
- `PARALLAX_LENS_MODEL`
- `PARALLAX_SYNTHESIS_MODEL`
- Existing Supabase and AI provider credential variables referenced by `.env.local`

## Related Resources

- [Lean membership implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Lean membership launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [L4-04 evidence](../../docs/audits/lean-l4-04-lens-expansion-metering-local-2026-08-12.md)
- [L4-03 evidence](../../docs/audits/lean-l4-03-seven-lenses-metering-local-2026-08-12.md)
- [L0-04 containment evidence](../../docs/audits/lean-l0-04-stale-sales-unmetered-closure-2026-08-06.md)
- [L4-04 migration](../../supabase/migrations/20260812110000_lean_l4_04_lens_expansions.sql)
- [Expansion controlled tests](../../app/tests/lens-expansion-metered.test.ts)
- [Commercial containment tests](../../app/tests/commercial-availability.test.ts)

---

Suggested next-session prompt: **"Resume from the latest Lean Membership handoff and begin LEAN-L4-05."**
