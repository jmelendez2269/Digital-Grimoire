# Handoff: Lean Membership L4-01 complete; L4-02 ready

## Session Metadata
- Created: 2026-08-11 20:24:11
- Project: C:\Projects\Digital-Grimoire
- Branch: agent/lean-membership-l2
- Session duration: approximately 45 minutes

### Recent Commits (for context)
  - 1344eb1 Complete Lean Membership Phase L3
  - a93c6b7 Complete Lean Membership Phase L2
  - 5191f12 Record lean membership plans and verification
  - 30e129f Persist PRE learner progress and Journal work
  - 850049d Contain commercial actions and restore server authority

## Handoff Chain

- **Continues from**: [2026-08-11-194552-lean-membership-l3-complete-l4-01-ready.md](./2026-08-11-194552-lean-membership-l3-complete-l4-01-ready.md)
  - Previous title: Lean Membership Phase L3 complete; L4-01 ready
- **Supersedes**: the previous handoff's L4-01-ready status. Keep that file as the Phase L3 completion record.

> Review the previous handoff for full context before filling this one.

## Current State Summary

`LEAN-L4-01` is complete locally and the tracker is at **77/114 (67.5%)**. The repository now has an inert server-only metering catalog, database store, and shared adapter for auth → verified email → entitlement → fixed quote → atomic controls → optional L3 reserve → provider → durable persistence → commit/release → privacy-safe settlement. The local forced-RLS/Reader-breaker migration passed its idempotency rerun, 21/21 rollback boundaries, a real two-session budget-edge race, and zero-residue cleanup; 8/8 adapter tests, 27/27 membership regressions, lint, TypeScript, and a 139-page build passed. Every action still defaults `off`, no existing route imports the adapter, and `LEAN-L4-02` is ready to integrate only The Working at one credit.

## Codebase Understanding

## Architecture Overview

- `metering-catalog.server.ts` is the only quote/control catalog. It fixes the 1/1/2/3 credit weights, conservative $0.05-per-credit in-flight estimates, request-size limits, concurrency, velocity, and hold duration. Missing or malformed configuration closes the action.
- `metering-adapter.server.ts` is the only permitted application lifecycle. It authenticates from the server session, requires `email_confirmed_at`, resolves the L2 entitlement, hashes canonical input, starts the L4 control row, uses the L3 reservation functions only in `enforce`, and requires a durable result reference before commit.
- `metering-store.server.ts` is the privileged Supabase implementation. Route packets inject only provider and persistence callbacks; clients never supply price, plan, mode, limit, cost threshold, or fingerprint.
- `ai_metering_requests` is the privacy-safe lifecycle and Reader-cost authority. Reader budget evaluation is globally serialized and sums in-flight estimates plus completed estimated provider cost for the exact UTC month. Paid plans do not enter the Reader breaker.
- `reader_cost_breaker_overrides` is append-only and service-only. An override records actor, reason, additive amount, effective range, expiry, and creation time.
- Shadow mode performs real provider/persistence work and telemetry but never reserves credits. Enforce mode attaches the exact L3 reservation, and database completion rejects a success without committed credit or a failure without released/expired credit.
- One adapter provider execution currently produces one aggregate usage event. This is exact for one provider/model and can aggregate The Working's optional semantic-resolution plus synthesis units because both currently use the same Anthropic Haiku model; mixed-model fallback telemetry may need an additive attempt interface in a later packet.

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `docs/planning/prismarium-membership-implementation-tracker.md` | Immediate status source | Records 77/114, L4-01 done, and L4-02 ready |
| `docs/audits/lean-l4-01-metering-foundation-local-2026-08-11.md` | Acceptance evidence and route inventory | Primary proof and exact L4-02 boundary |
| `app/src/lib/membership/metering-catalog.server.ts` | Fixed quotes, modes, controls, kills, Reader budget | Server-owned policy; all actions default off |
| `app/src/lib/membership/metering-store.server.ts` | Strict service-role RPC/table adapter | Connects the application lifecycle to L3/L4 database authority |
| `app/src/lib/membership/metering-adapter.server.ts` | Shared generic execution lifecycle | L4-02 must use this rather than recreating route-local metering |
| `supabase/migrations/20260812040000_lean_l4_01_metering_foundation.sql` | L4 lifecycle, Reader breaker, override audit, usage linkage | Forced RLS and atomic control authority; not deployed remotely |
| `app/tests/membership-metering.test.ts` | Application/control/failure/inertness tests | 8/8 passing |
| `app/scripts/run-lean-l4-01-metering-foundation.ps1` | Guarded local database runner | Applies dependencies, reruns migration, runs rollback and real concurrency stories |
| `app/src/app/api/working/generate/route.ts` | Current The Working generation route | L4-02 integration target; currently no adapter import |
| `app/src/app/api/working/save/route.ts` | Current separate durable `workings` insert | L4-02 must fold this persistence boundary into generation before commit |

## Key Patterns Discovered

- Every privileged membership module begins with `import "server-only"` and reconstructs/validates privileged results rather than forwarding raw rows.
- Local SQL runners accept only literal `local`, discover exactly one `supabase_db_*` container, never accept a database URL, rerun forward migrations, and prove exact cleanup.
- Database functions are `security definer` with fixed search paths, explicit `revoke all`, and `service_role`-only execute grants.
- The Reader breaker and per-user lifecycle acquire advisory locks in a consistent order. The real race uses distinct users so it proves the global Reader lock rather than only the L3 per-user lock.
- A provider success is not chargeable until user-owned persistence returns a bounded stable reference. After persistence, settlement errors do not compensate away committed work; they fail as `METERING_SETTLEMENT_FAILED` for reconciliation.
- New environment names are server-only (no `NEXT_PUBLIC_` prefix). No `.env` or Vercel values were added or changed.
- Historical audits/handoffs remain unchanged. Current truth lives in the tracker, launch plan immediate-next section, and newest evidence/handoff.

## Work Completed

## Tasks Finished

- [x] Resumed and verified the Phase L3 handoff, matching branch, published L3 commit, and three unrelated dirty files.
- [x] Inventoried The Working, Seven Lenses, lens expansion, Deep Search, images, generic AI proxies, and content/admin generation provider/persistence boundaries.
- [x] Added the fixed versioned quote/control catalog with exact fail-closed off/shadow/enforce configuration.
- [x] Added the shared server-only adapter and strict database store.
- [x] Added the forced-RLS metering lifecycle, atomic Reader breaker, audited overrides, and shadow-safe usage linkage.
- [x] Added rollback, ACL, lifecycle, settlement, UTC reset, and real two-session concurrency tests with zero residue.
- [x] Passed 8/8 adapter tests, 27/27 membership regressions, targeted lint, global TypeScript, and the 139/139-page production build.
- [x] Added dated evidence, updated the tracker to 77/114 and L4-02 ready, updated the controlling launch plan, and ran the Digital-Grimoire-targeted Mission Control audit with zero broken links or mirror drift.

## Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `app/src/lib/membership/metering-{catalog,store,adapter}.server.ts` | Added fixed policy, privileged persistence, and shared execution lifecycle | Establish L4-01 without route integration |
| `supabase/migrations/20260812040000_lean_l4_01_metering_foundation.sql` | Added L4 request lifecycle, Reader breaker, override audit, and usage linkage | Make concurrency, cost, privacy, and settlement database-enforced |
| `app/tests/membership-metering.test.ts` | Added eight focused adapter/catalog tests | Prove order, modes, failures, controls, privacy, and inertness |
| `app/tests/sql/lean-l4-01-*.sql` | Added rollback and two-session database stories | Prove service authority, atomic budget edge, settlement, reset, and zero residue |
| `app/scripts/run-lean-l4-01-metering-foundation.ps1` | Added guarded local-only runner | Make acceptance reproducible without any remote target |
| `app/package.json`, `app/tests/sql/README.md` | Added discoverable L4-01 commands and operating notes | Keep verification executable |
| `docs/audits/lean-l4-01-metering-foundation-local-2026-08-11.md` | Added route inventory and acceptance evidence | Preserve exact facts and next boundaries |
| Membership tracker and controlling launch plan | Recorded 77/114, L4-01 done, L4-02 ready | Keep current status aligned |
| This handoff | Added continuation state | Allow a fresh session to begin L4-02 directly |

Pre-existing unrelated dirty files were not edited for this packet and must remain excluded: `app/src/lib/parsers/course-markdown-parser.ts`, `app/tests/course-parser-v2.test.ts`, and `supabase/config.toml`.

## Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Keep L4-01 inert | Wire The Working immediately vs build/verify foundation first | The tracker assigns route integration to L4-02 and requires every action default off first |
| Use one fixed server quote catalog | Route-local costs vs shared versioned quotes | Prevents browser/route price drift and enforces the frozen 1/1/2/3 launch contract |
| Use $0.05 per credit for in-flight estimates | Live provider-price inference vs economic guardrail | It is the plan's conservative Reader ceiling and avoids an unstable provider-price claim; completed callbacks record observed estimated cost |
| Give shadow its own L4 lifecycle without L3 credit holds | Reserve/release credits during shadow vs no credit mutation | Shadow must observe real cost without reducing availability or blocking on insufficient credits |
| Serialize one global Reader breaker | Per-user caps vs global UTC-month budget | The plan specifies a global Reader subsidy budget; distinct-user concurrency must not exceed it |
| Make overrides additive, temporary, append-only, and actor-attributed | Mutable threshold row vs audited records | Preserves who/why/amount/effective period/expiry and avoids silent budget changes |
| Settle credit before declaring L4 completion | L4 completion before L3 settlement vs settlement validation | Database completion now rejects success unless credit committed and failure unless credit released/expired |
| Keep route-specific persistence in later packets | Generic adapter writing product tables vs injected persistence callbacks | The Working, streaming synthesis, cache, and images have materially different durable boundaries |

## Pending Work

## Immediate Next Steps

1. Verify the current branch/worktree and whether Jen wants the scoped L4-01 commit/push before adding L4-02 changes. Do not include the three unrelated dirty files.
2. Start `LEAN-L4-02`: refactor The Working so deterministic palette assembly and any semantic-resolution/synthesis provider work execute inside `executeMeteredAction`, while the `workings` insert becomes the required persistence callback and returns a stable `working:<id>` reference.
3. Extend `synthesizeRitual` and semantic resolution just enough to return privacy-safe Anthropic request/usage data. Aggregate both Haiku calls when semantic fallback occurs; do not store intention, palette, ritual, or interpretation in L4 telemetry.
4. Update the The Working UI to show the one-credit quote before action, submit a UUID request ID, preserve input on every error, and avoid a second separate `/api/working/save` write after the integrated durable generation succeeds.
5. Add provider/moderation/timeout/abort/empty/persistence/replay tests, then a real local API/database/provider or controlled provider-fixture full story proportional to L4-02.

## Blockers/Open Questions

- [ ] Decide the exact L4-02 response/replay contract after generation now persists in the same lifecycle. Recommended: return the persisted working ID and data; a duplicate request must load that exact working rather than call Anthropic twice.
- [ ] Confirm whether The Working semantic fallback plus synthesis should remain one aggregate `ai_usage_events` row while both use the same model, or whether L4-02 should add a multi-attempt reporter now. Do not lose either call's units/cost.
- [ ] The current `/api/working/save` accepts client-supplied palette/ritual. L4-02 must ensure the metered generation path never trusts that separate route as proof of durable provider success.

## Deferred Items

- L4-03 through L4-06: Seven Lenses streaming, expansion, Deep Search/image/generic bypass closure, and enabled-generation full story remain packet-gated.
- Wallet UI/customer copy is L5 work.
- Production migrations, Vercel configuration, Stripe live resources, real customer credits/actions, paid sales, course release, and activation remain gated by L5-05 and explicit approvals.
- Packs, rollover, debt, annual plans, gifts, transfers, and other expansion-blueprint machinery remain out of lean scope.

## Context for Resuming Agent

## Important Context

- Authoritative status is **77/114 (67.5%)**, L4-01 `done`, L4-02 `ready`. The evidence file and tracker agree.
- No existing generative route imports `metering-adapter.server.ts`. This is intentional and is proven by the test suite. Do not enable another route while starting L4-02.
- All L4 action modes default `off`. No new environment value was added locally or remotely. The new variable names have no `NEXT_PUBLIC_` prefix and remain server-only.
- The local L4 migration is applied to the running disposable/local stack for verification, but it is not deployed or authorized for production.
- The Reader breaker default is $50 per UTC month. It counts completed estimated provider cost plus in-flight fixed estimates and uses a global lock across users. Paid actions and non-generative product features are unaffected.
- The L4 tables/functions are forced-RLS/service-only. Customer sessions cannot read/write them or execute control functions.
- The real race seeded $49.94, ran two distinct-user $0.05 requests, admitted exactly one, paused one, left $49.99 counted, changed no shadow credit, and cleaned every fixture.
- The Working currently generates and saves in separate endpoints. L4-02 must make persistence part of the metered lifecycle; a successful provider response alone is not the commit boundary.
- Existing Seven Lenses legacy usage logging includes query excerpts, and stream history persistence suppresses errors. Do not reuse those patterns in the L4 adapter; L4-03 must replace them.
- Preserve and exclude unrelated course-parser work and local Supabase port changes. Do not reset, restore, clean, or commit them with membership work.

## Assumptions Made

- Local passing application/database/concurrency/build evidence is sufficient to mark L4-01 complete in the implementation tracker, but does not authorize deployment or activation.
- The plan's $0.05 Reader cost-per-credit ceiling is the correct conservative in-flight estimate until shadow evidence records a dated revision; it is not live provider pricing.
- L4-02 may modify The Working's response/persistence shape as needed to make replay safe, provided customer input is preserved and no other route is activated.

## Potential Gotchas

- `complete_ai_metering_request_v1` now verifies the linked L3 reservation state. In enforce mode, call credit commit/release first, then complete the L4 request.
- After durable persistence, never auto-release credits because a later telemetry write failed. The adapter reports `METERING_SETTLEMENT_FAILED`; the persisted result and committed/breaker state must remain reconcilable.
- Shadow still spends provider money and therefore enters the Reader breaker even though it charges zero credits.
- A Reader override is additive and temporary; it is not a mutable replacement threshold and cannot be customer-authored.
- `ai_usage_events` supports a nullable L3 reservation only when an L4 metering request link exists. Legacy L3-linked rows remain valid.
- The initial usage adapter records one aggregate provider attempt. Do not silently discard cost from an optional semantic resolver or fallback.
- Existing `usage-tracker.ts` permits query-bearing metadata and is not the L4 privacy-safe telemetry path.
- The first production build attempt hit a 120-second tool timeout without an application error; the rerun with a 300-second allowance passed in about 171 seconds.
- The Mission Control audit reports one pre-existing zero-byte root file, `radix_usage.txt`; do not delete it as part of membership work.

## Environment State

## Tools/Services Used

- Local Supabase/PostgreSQL in Docker: migrations, rollback story, forced-RLS/ACL checks, and real two-session Reader race.
- PowerShell local-only runner: exact container discovery and guaranteed concurrency cleanup.
- Node/TypeScript test runner: adapter plus membership regression tests.
- ESLint, TypeScript compiler, and Next.js 16 webpack production build.
- Session-handoff and Digital-Grimoire-targeted Mission Control audit scripts.

## Active Processes

- The local Supabase/Docker stack remains running, as it was at session start.
- No Next.js build, Node test, PowerShell job, or handoff-validation process should remain running.

## Environment Variables

- `PRISMARIUM_METERING_MODE`
- `PRISMARIUM_METERING_ACTION_MODES`
- `PRISMARIUM_METERING_GLOBAL_KILL_SWITCH`
- `PRISMARIUM_METERING_ACTION_KILL_SWITCHES`
- `PRISMARIUM_READER_MONTHLY_PROVIDER_BUDGET_USD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- Existing membership/billing/Stripe variable names from the predecessor handoff remain relevant; no values changed.

## Related Resources

- [L4-01 local evidence](../../docs/audits/lean-l4-01-metering-foundation-local-2026-08-11.md)
- [Membership implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Controlling lean launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [Shared adapter](../../app/src/lib/membership/metering-adapter.server.ts)
- [Fixed quote catalog](../../app/src/lib/membership/metering-catalog.server.ts)
- [L4 migration](../../supabase/migrations/20260812040000_lean_l4_01_metering_foundation.sql)
- [Previous handoff](./2026-08-11-194552-lean-membership-l3-complete-l4-01-ready.md)

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
