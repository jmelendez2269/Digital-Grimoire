# Handoff: Lean Membership L4-03 complete; L4-04 ready

## Session Metadata

- Created: 2026-08-12 09:59:11
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `agent/lean-membership-l2`
- Session duration: Multi-session continuation through August 12; exact duration not tracked

## Recent Commits (for context)

- `1344eb1` Complete Lean Membership Phase L3
- `a93c6b7` Complete Lean Membership Phase L2
- `5191f12` Record lean membership plans and verification
- `30e129f` Persist PRE learner progress and Journal work
- `850049d` Contain commercial actions and restore server authority

## Handoff Chain

- **Continues from:** [2026-08-11-202411-lean-membership-l4-01-complete-l4-02-ready.md](./2026-08-11-202411-lean-membership-l4-01-complete-l4-02-ready.md)
- **Supersedes:** That predecessor for current implementation status. Read it only for earlier L4-01 rationale and database details.

## Current State Summary

`LEAN-L4-02` and `LEAN-L4-03` are complete locally on top of the uncommitted `LEAN-L4-01` metering foundation. The Working is integrated with the shared server-only adapter at one credit. Seven Lenses short/medium is integrated at two credits and long at three, with a pre-provider result ID, user-owned persistence, settlement before content delivery, completed-request replay, timeout/disconnect cleanup, and privacy-safe provider usage. The production build and all focused/regression checks pass. The controlling tracker is at 85/114 points (74.6%), Phase L4 is 13/21, and `LEAN-L4-04` is ready: meter one-lens expansion at one credit without double-charging the parent synthesis or retrying the expansion as a new charge. All commercial and metering gates remain closed by default; nothing was deployed or activated.

## Codebase Understanding

## Architecture Overview

The server-only shared lifecycle lives in `app/src/lib/membership/metering-adapter.server.ts`. Routes provide authentication, an action code, a server-owned request UUID, provider execution, durable-result persistence, replay loading, and privacy-safe usage. The adapter applies the catalog policy, entitlement and verified-email gates, abuse controls, reserve/commit/release, replay handling, and settlement telemetry. Runtime policy comes from `metering-catalog.server.ts`; database calls are isolated in `metering-store.server.ts` and the L4-01 migration.

Seven Lenses generation now flows through `app/src/lib/parallax/metered-seven-lenses.server.ts`. The route emits only status before the adapter returns; the complete response is persisted and metering is settled before synthesis/content is emitted. A completed UUID loads the exact owned `convergence_responses` row without retrieval, provider, persistence, or another charge. Provider usage is aggregated by `provider-usage.ts`; request IDs, token units, and cost are recorded without query text.

The one-lens expansion is still the legacy direct route at `app/src/app/api/parallax/lens/[lensId]/route.ts`. It authenticates independently, accepts query/weights/length, calls retrieval and `generateLensResponse`, writes query-bearing legacy usage telemetry, and returns an undurable response. `ExpandableLensCard.tsx` calls this route without an idempotency UUID, parent result ID, visible credit cost, cancellation handling, or retry ownership. These are the principal L4-04 seams.

## Critical Files

| File | Purpose | Relevance |
|---|---|---|
| `docs/planning/prismarium-membership-implementation-tracker.md` | Immediate implementation source of truth | L4-04 row and acceptance criteria; currently 85/114 |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Controlling scope and launch gates | Do not broaden L4-04 into production activation |
| `app/src/lib/membership/metering-adapter.server.ts` | Shared authoritative metering lifecycle | L4-04 must reuse this adapter |
| `app/src/lib/membership/metering-catalog.server.ts` | Versioned quotes and default-closed runtime policy | Already contains the one-credit expansion action quote |
| `app/src/lib/membership/metering-store.server.ts` | Metering database boundary | Reuse; avoid route-specific credit writes |
| `app/src/app/api/parallax/lens/[lensId]/route.ts` | Current unmetered expansion endpoint | Main L4-04 route to replace/integrate |
| `app/src/components/parallax/ExpandableLensCard.tsx` | Expansion client action and state | Add one-credit copy, UUID retry, abort, and preserved result behavior |
| `app/src/components/parallax/ResponseStream.tsx` | Creates expansion cards | Likely must pass the durable parent response ID to each card |
| `app/src/app/seven-lenses/page.tsx` | Owns the durable parent result returned by L4-03 | Expose/pass parent ID without reusing the parent request ID |
| `app/src/lib/parallax/metered-seven-lenses.server.ts` | Durable-first L4-03 reference implementation | Copy the server-owned execution/replay/persistence shape where appropriate |
| `app/src/lib/parallax/provider-usage.ts` | Privacy-safe Parallax provider usage aggregation | Reuse for the single-lens call |
| `app/src/lib/parallax/lens-orchestrator.ts` | Lens generation and abort/provider-attempt hooks | Already supports signal, fail-fast provider errors, and usage callbacks |
| `app/tests/seven-lenses-metered.test.ts` | Controlled L4-03 contract fixtures | Extend or add an L4-04-specific suite for expansion boundaries |
| `docs/audits/lean-l4-03-seven-lenses-metering-local-2026-08-12.md` | Accepted local L4-03 evidence | Baseline for durable boundary and verification expectations |

## Key Patterns Discovered

- Credit cost and action selection are server-owned; clients send a UUID but never cost, balance, entitlement, mode, or plan.
- Create an addressable result ID before provider work, persist the complete user-owned result, then settle metering, then expose content.
- Keep the same request UUID after ambiguous disconnect, in-progress, or settlement-failed outcomes so retry can reopen the exact result. Clear it after definitive validation/provider failures or user input changes.
- Provider errors, timeouts, aborts, moderation, empty results, and persistence errors must release once. Settlement ambiguity is handled as settlement failure, not a fresh request.
- Parallel provider work must be actively aborted and awaited with `Promise.allSettled` before releasing a hold; otherwise sibling calls can outlive the metered operation.
- Active metered routes must not send query text to usage telemetry. Aggregate provider request IDs, input/output units, and cost or the fixed quote.
- UI shows exact cost before the action and preserves the user's query/content on recoverable errors.
- Commercial availability and metering are independent gates. Both remain default closed.

## Work Completed

## Tasks Finished

- [x] Completed `LEAN-L4-02`: The Working uses the shared adapter at one credit with durable draft persistence and exact replay.
- [x] Completed `LEAN-L4-03`: Seven Lenses uses server-owned two/three-credit quotes and a durable-first response boundary.
- [x] Added request abort and deadline propagation through the Parallax orchestration stack.
- [x] Added provider request ID, token-unit, and cost aggregation without query-bearing metering telemetry.
- [x] Added client UUID retry semantics, visible costs, input preservation, and local-history alignment.
- [x] Added controlled success, replay, timeout, abort, provider, empty, persistence, and settlement tests.
- [x] Updated the controlling tracker and launch plan; L4-04 is `ready`.
- [x] Verified the protected Seven Lenses route at 375x812; unauthenticated access redirects cleanly to sign-in without an overlay.

## Files Modified or Added

| File | Changes | Rationale |
|---|---|---|
| `app/src/lib/membership/metering-adapter.server.ts` | Added provider execution context and shared lifecycle behavior | Authoritative reusable L4 metering |
| `app/src/lib/membership/metering-catalog.server.ts` | Versioned fixed quotes and controls | Server-owned pricing and default-closed modes |
| `app/src/lib/membership/metering-store.server.ts` | Database adapter for replay, controls, usage, and credit operations | Centralize privileged persistence |
| `app/src/lib/parallax/metered-seven-lenses.server.ts` | Added durable/replayable Seven Lenses operation | L4-03 core implementation |
| `app/src/lib/parallax/provider-usage.ts` | Added privacy-safe attempt aggregation | Accurate units/cost without prompt content |
| `app/src/app/api/parallax/query/route.ts` | Replaced legacy streaming path with shared metering | Enforce durable-before-delivery boundary |
| Obsolete legacy Parallax streaming module | Deleted its implementation | Prevent bypass of the new boundary |
| `app/src/lib/parallax/lens-orchestrator.ts` | Added signal, provider-attempt hooks, fail-fast behavior, and sibling cancellation | Correct release and cost boundaries |
| `app/src/lib/ai/ai-orchestrator.ts` | Propagated abort signals and captured provider IDs/cost | Provider lifecycle accounting |
| `app/src/lib/ai/types.ts` | Extended completion and response metadata | Type the new execution contract |
| `app/src/app/seven-lenses/page.tsx` | Added UUID retry, abort, cost copy, durable history ID, and input preservation | Safe customer-facing metered action |
| `app/src/components/parallax/ResponseLengthSlider.tsx` | Shows two/three-credit costs and improves control accessibility | Cost clarity before action |
| `app/tests/seven-lenses-metered.test.ts` | Added L4-03 controlled fixtures and static contracts | Prove lifecycle and client behavior |
| `app/tests/membership-metering.test.ts` | Updated shared integration expectations | Cover both connected actions |
| `app/tests/commercial-availability.test.ts` | Updated contained-route markers | Preserve launch containment |
| `docs/audits/lean-l4-03-seven-lenses-metering-local-2026-08-12.md` | Added local evidence packet | Record acceptance and limitations |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Marked L4-03 done and L4-04 ready | Current mission-control status |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Updated immediate next move | Keep controlling plan aligned |

The worktree also contains the preceding uncommitted L4-01/L4-02 implementation, tests, migration, scripts, and evidence. Do not delete or reset them.

## Decisions Made

| Decision | Options Considered | Rationale |
|---|---|---|
| Persist and settle before emitting synthesis | Token-stream content first; durable-first response | Prevent receiving valuable content without an addressable result and settled usage |
| Use one client UUID per logical action | Server-generated retry IDs; random ID every retry | Exact replay and no duplicate provider/credit work |
| Aggregate provider metadata, omit queries | Legacy query-bearing usage; privacy-safe settlement | Metering needs units/cost, not customer content |
| Use reported OpenRouter cost only when every attempt reports it | Partial sum; fixed quote fallback | Avoid undercounting multi-call operations |
| Abort and await sibling lens calls on failure | Let remaining promises run | Do not release the credit hold while provider work continues |
| Keep local completion separate from activation | Enable routes during implementation; default closed | Production activation belongs to L5-05 |

## Pending Work

## Immediate Next Steps

1. Start `LEAN-L4-04` by tracing the parent durable response ID from `app/src/app/seven-lenses/page.tsx` through `app/src/components/parallax/ResponseStream.tsx` to `app/src/components/parallax/ExpandableLensCard.tsx`, and define the expansion result/replay ownership key before editing the route.
2. Add a server-only metered expansion operation around `seven_lenses.expansion` at one credit. Require a valid owned parent response and lens ID, use a distinct expansion request UUID, persist the expansion durably before commit/response, and remove query-bearing legacy usage from the active route.
3. Update `ExpandableLensCard.tsx` to display "1 Prism Credit" before loading, retain its UUID across ambiguous retries, abort on unmount/input change, preserve the parent response, and reopen the exact durable expansion without another charge.
4. Add controlled tests proving success commits once; replay invokes no provider/charge; parent request IDs cannot be reused as expansion IDs; different lenses cannot collide; provider/timeout/abort/empty/persistence failures release once; and the client cannot invent price, balance, parent ownership, or lens identity.
5. Run focused metering tests, the full membership/commercial regression set, lint, TypeScript, `git diff --check`, production build, and a safe browser check. Then write L4-04 evidence and update mission control.

## Blockers/Open Questions

- No blocker for local controlled-fixture L4-04 implementation.
- Decide the durable expansion schema after inspecting existing `convergence_responses.response` JSON and migrations. Prefer a user-owned addressable record or a deterministic child embedded in the owned parent; do not mutate the already-settled parent in a way that makes replay ambiguous.
- An approved authenticated test credential is unavailable. This limits browser verification to the protected-route redirect; the authenticated real-provider story remains assigned to L4-06.

## Deferred Items

- Real provider, customer, and credit stories are deferred to L4-06.
- Production migrations/deployments, environment changes, Stripe/customer operations, canary activation, and live paid release remain deferred to L5-05.
- Deep Search, image generation, and generic bypass containment belong to L4-05.

## Context for Resuming Agent

## Important Context

- The authoritative current status is the tracker, not the older handoff: L4-03 is done; L4-04 is ready; progress is 85/114.
- The workspace is intentionally dirty and uncommitted across L4-01 through L4-03. Preserve all accumulated packet work.
- Three unrelated pre-existing user edits must remain untouched: `app/src/lib/parsers/course-markdown-parser.ts`, `app/tests/course-parser-v2.test.ts`, and `supabase/config.toml`.
- Do not commit, push, open a PR, deploy, alter remote environment variables, run real provider/Stripe/customer actions, or activate metering without explicit user authorization.
- `app/src/app/api/parallax/lens/[lensId]/route.ts` is the active L4-04 bypass seam. It currently accepts no request UUID/parent ID and logs a truncated query. Replace this behavior through the shared adapter.
- Parent synthesis and one-lens expansion are separate logical billable actions. Never reuse the parent's request UUID for expansion. Tie expansion authorization to the owned durable parent response and lens, then make retries of that same expansion idempotent.
- The adapter already understands `seven_lenses.expansion` as a one-credit action. Do not accept credit cost or action code from the client.
- The latest build passes despite known non-fatal repository warnings about baseline-browser-mapping freshness, the Next middleware convention, Sentry client naming, and expected dynamic-cookie messages.

## Assumptions Made

- Local implementation and controlled fixtures are sufficient for the L4-04 packet; L4-06 owns authenticated real-provider/database proof.
- The existing default-closed commercial and metering gates must remain independent and unchanged.
- The current branch remains `agent/lean-membership-l2` until the user directs otherwise.
- Existing untracked L4 files are intentional work product, not disposable artifacts.

## Potential Gotchas

- `ResponseStream` currently knows response content but its response type does not include the durable parent result ID. The ID must be threaded explicitly; do not infer it from query text.
- `ExpandableLensCard` declares `onExpand` but does not currently destructure/call it. Preserve intended callback semantics while adding metering.
- A fresh UUID on every retry would double-charge. A UUID shared with the parent could collide or make the parent replay masquerade as an expansion. Keep distinct stable IDs per logical expansion attempt.
- The legacy expansion route calls `logApiUsage` with query content. That must not remain on the active metered route.
- Google provider abort is implemented by racing the SDK promise; it releases the request path but may not cancel upstream execution. Fixed-quote fallback protects accounting when complete reported cost is unavailable.
- Do not emit expansion content before persistence and settlement. Status-only progress before the durable boundary is safe.
- `git status` may warn that the global Git ignore file under the user profile is unreadable in the sandbox; this does not indicate a repository failure.

## Environment State

## Tools/Services Used

- Local PowerShell and Node/npm tooling.
- Next.js production build using webpack.
- Controlled Node test fixtures; no real provider or credit mutation.
- `agent-browser` at 375x812 for the protected Seven Lenses route; browser session was closed.
- Mission-control audit script; no broken links or tracker drift. One pre-existing zero-byte `radix_usage.txt` remains unrelated.

## Active Processes

- No L4 dev or production server is intentionally running. The isolated port-3101 production server was stopped after browser verification.
- An unrelated pre-existing development process was left untouched.

## Verification Snapshot

- `npm run test:membership-metering`: 22/22 passed.
- Membership regressions: 48/48 passed.
- Commercial availability: 9/9 passed.
- Focused ESLint: passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed; line-ending conversion warnings are non-fatal.
- `npm run build`: passed; 139/139 static pages generated.

## Environment Variables

Names only; do not record or change values:

- `PRISMARIUM_METERING_MODE`
- `PRISMARIUM_METERING_ACTION_MODES`
- `PRISMARIUM_METERING_GLOBAL_KILL_SWITCH`
- `PRISMARIUM_METERING_ACTION_KILL_SWITCHES`
- `PRISMARIUM_READER_MONTHLY_PROVIDER_BUDGET_USD`
- `PARALLAX_LENS_MODEL`
- `PARALLAX_SYNTHESIS_MODEL`
- Existing Supabase and AI provider credential variables referenced by `.env.local`

## Related Resources

- [Lean membership implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Lean membership launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [L4-01 evidence](../../docs/audits/lean-l4-01-metering-foundation-local-2026-08-11.md)
- [L4-02 evidence](../../docs/audits/lean-l4-02-working-metering-local-2026-08-11.md)
- [L4-03 evidence](../../docs/audits/lean-l4-03-seven-lenses-metering-local-2026-08-12.md)
- [L4-01 migration](../../supabase/migrations/20260812040000_lean_l4_01_metering_foundation.sql)

---

Suggested next-session prompt: **"Resume from the latest Lean Membership handoff and begin LEAN-L4-04."**
