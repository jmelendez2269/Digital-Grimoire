# Handoff: Lean Membership Phase L3 complete; L4-01 ready

## Session Metadata

- Created: 2026-08-11 19:45:52 America/New_York
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `agent/lean-membership-l2`
- Starting HEAD: `a93c6b7` (`Complete Lean Membership Phase L2`)
- Milestone interval: continued multi-session Lean Membership work through August 11, 2026; exact duration not recorded

### Recent Commits (for context)

- `a93c6b7` Complete Lean Membership Phase L2
- `5191f12` Record lean membership plans and verification
- `30e129f` Persist PRE learner progress and Journal work
- `850049d` Contain commercial actions and restore server authority
- `0b80730` Refresh Prismarium repository guidance

## Handoff Chain

- **Continues from**: [2026-08-11-161619-lean-membership-l2-06-live-gate-blocked.md](./2026-08-11-161619-lean-membership-l2-06-live-gate-blocked.md)
- **Supersedes**: that handoff's L2-blocked and L3-not-started status. Keep both linked L2 handoffs as historical context; L2-06 was subsequently accepted from the local contract plus a real Stripe test-mode lifecycle.

## Current State Summary

Prismarium Lean Membership Phases L0, L1, L2, and L3 are complete at 14/14, 15/15, 22/22, and 21/21 verified points. The tracker is at **72/114 (63.2%)**. L3 now has a forced-RLS credit schema, deterministic Reader/paid monthly grants, atomic reserve/commit/release/stale recovery, a current-user-only safe wallet projection/API, and a passing phase gate. The final gate independently proved the active-grant plus adjustments minus commits and pending-holds formula, complete cache/ledger agreement, denial of all customer table/function authority, a real twenty-session 10/10 reserve/insufficient split, exact release of all ten holds, no negative state, no unexplained pending row, and zero residue. `LEAN-L4-01` is `ready`; no generative route is metered or connected to L3, the wallet has no UI caller, and every paid/production activation gate remains closed.

## Codebase Understanding

## Architecture Overview

- `billing_memberships` is the L2 service-owned Stripe projection. L3 grant synchronization reads only that locked projection; no client chooses a plan, allowance, source key, or expiry.
- `credit_accounts` is a cached balance, while `credit_transactions` is the append-only accounting authority. Every mutation increments the per-user account version and writes the exact post-event snapshot.
- Exactly one active monthly grant is permitted per user. Reader grants are keyed by UTC month; paid grants are keyed by verified Stripe subscription period. No packs, rollover, debt, or multi-grant allocation machinery exists.
- Reservations use a user-scoped request ID plus request fingerprint, action code, and server quote. Reserve, commit, release, and stale recovery share the same per-user advisory lock used by L2.
- `GET /api/membership/wallet` authenticates with `auth.getUser()`, passes only `user.id` to a server-only loader, and reconstructs a strict allowlisted response. The service-only database projection may synchronize the monthly grant and recover stale holds before reading.
- L4 must provide one shared adapter for auth → entitlement → server quote → reserve → provider → durable persistence → commit/release. L4-01 owns the fixed quote catalog, telemetry, abuse controls, Reader cost breaker, kill switches, and off/shadow/enforce modes. Do not connect an existing AI route before that foundation passes.

## Critical Files

| File | Purpose | Relevance |
|---|---|---|
| `docs/planning/prismarium-membership-implementation-tracker.md` | Immediate status and scoring source of truth | Records 72/114, Phase L3 complete, L4-01 ready |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Controlling lean scope and gates | Keeps production, billing, paid, and metering activation closed |
| `supabase/migrations/20260812000000_lean_l3_01_credit_core_schema.sql` | Five-table credit and usage schema | Forced RLS, exact service privileges, constraints, append-only ledger |
| `supabase/migrations/20260812010000_lean_l3_02_monthly_grants.sql` | Monthly grant synchronizer | Projection-backed 10/30/100/300 grants, reset, no rollover |
| `supabase/migrations/20260812020000_lean_l3_03_atomic_reservations.sql` | Reservation lifecycle | Atomic reserve, commit, release, and stale recovery |
| `supabase/migrations/20260812030000_lean_l3_04_safe_wallet.sql` | Customer-safe wallet projection | Service-only lifecycle-aware allowlisted JSON |
| `app/src/lib/membership/membership-wallet.server.ts` | Strict server wallet adapter | Fixed limit and runtime field validation prevent leakage |
| `app/src/app/api/membership/wallet/route.ts` | Authenticated wallet GET | Current-user-only, no-store API; no UI caller yet |
| `app/scripts/run-lean-l3-05-phase-gate.ps1` | Phase-closing local runner | Reapplies chain, runs RLS/invariants, 20 sessions, settlement, cleanup |
| `docs/audits/lean-l3-05-credit-core-phase-gate-local-2026-08-11.md` | Final L3 evidence | Primary proof for closing Phase L3 |

## Key Patterns Discovered

- Every local runner accepts only the literal `local` target, discovers exactly one `supabase_db_*` container, and never accepts a database URL.
- L3 dependency runners apply L2-05 only when its verified-event column is missing, so they do not overwrite the newer L2-06 projector wrapper.
- Database functions are `security definer` with fixed search paths and explicit `revoke all` followed by `service_role`-only execution grants.
- Customer responses are reconstructed from allowlisted keys. Internal user/grant/reservation/request/event/source IDs, hashes, reason codes, Stripe/provider fields, prompts, responses, and arbitrary metadata never leave the server.
- Verification fixtures either run inside a rollback transaction or use exact IDs with guaranteed cleanup in a PowerShell `finally` block.
- Historical dated evidence remains unchanged even when later work supersedes an earlier blocked status; current truth lives at the top of the tracker and in the newest session rows.

## Work Completed

## Tasks Finished

- [x] `LEAN-L3-01`: additive credit account, grant, reservation, transaction, and privacy-safe usage schema; 18/18 boundaries and zero residue.
- [x] `LEAN-L3-02`: idempotent Reader UTC-month and paid subscription-period grants; 18/18 lifecycle boundaries and zero residue.
- [x] `LEAN-L3-03`: atomic reserve/commit/release/stale recovery; 17/17 lifecycle boundaries plus a real twenty-session overspend test.
- [x] `LEAN-L3-04`: authenticated current-user-only safe wallet API and strict parser; 17/17 SQL boundaries, 4/4 application tests, targeted lint, TypeScript, and a 139-page production build.
- [x] `LEAN-L3-05`: verification-only authoritative formula, adversarial RLS/ACL, concurrency, exact settlement, and zero-residue phase gate; 20/20 combined boundaries.
- [x] Updated the tracker and controlling launch plan to 72/114, Phase L3 21/21, and L4-01 ready.
- [x] Re-ran the Digital-Grimoire-targeted Mission Control audit; no broken relative links or mirror drift were introduced.

## Files Modified

| File group | Changes | Rationale |
|---|---|---|
| `supabase/migrations/20260812000000_*` through `20260812030000_*` | Added the complete inert L3 database chain | Establish safe monthly credits without enabling a caller |
| `app/scripts/run-lean-l3-01-*.ps1` through `run-lean-l3-05-*.ps1` | Added guarded local dependency and verification runners | Make every acceptance story reproducible and local-only |
| `app/tests/sql/lean-l3-01-*` through `lean-l3-05-*` | Added rollback, concurrency, settlement, and cleanup suites | Prove RLS, lifecycle, accounting, concurrency, and residue boundaries |
| `app/src/lib/membership/membership-wallet.server.ts` | Added strict wallet projection parser/loader | Prevent unexpected privileged data from reaching customers |
| `app/src/app/api/membership/wallet/route.ts` | Added authenticated current-user GET | Satisfy L3-04 without enabling a UI or metered action |
| `app/tests/membership-wallet.test.ts` | Added scope, stripping, malformed-state, and source tests | Prove application-side current-user and privacy boundaries |
| `app/package.json`, `app/tests/sql/README.md` | Added L3-04/L3-05 commands and operating guidance | Make local verification discoverable |
| `docs/audits/lean-l3-01-*` through `lean-l3-05-*` | Added dated packet evidence | Preserve exact checks, results, safety, and rollback facts |
| Membership tracker and lean launch plan | Closed Phase L3 and made L4-01 ready | Keep sources of truth aligned with verified evidence |
| This handoff and its two immediate predecessor files | Added the continuation chain | Allow a fresh session to resume without reconstructing L2/L3 history |

The scoped membership publish must exclude the unrelated dirty files `app/src/lib/parsers/course-markdown-parser.ts`, `app/tests/course-parser-v2.test.ts`, and `supabase/config.toml`.

## Decisions Made

| Decision | Options Considered | Rationale |
|---|---|---|
| Keep the L3 model lean | Packs/rollover/debt/multi-grant allocation vs one expiring monthly grant | The lean launch contract explicitly excludes expansion machinery |
| Make all lifecycle operations service-only | Direct authenticated RPC/RLS policies vs server mediation | Customers must not forge balances, history, quotes, or settlement |
| Use lazy deterministic grant sync | Background-only issuance vs synchronize on reserve/wallet | Ensures current balances without client authority or an operational scheduler dependency |
| Reconstruct the wallet response | Forward database JSON vs strict runtime allowlist | Extra privileged fields must fail closed rather than leak |
| Make L3-05 verification-only | Add another runtime audit function vs independent test computation | L3-04 already fails closed on cache/ledger mismatch; the phase gate needed proof, not more surface area |
| Settle all concurrency winners before cleanup | Delete pending fixtures immediately vs release each once | Proves the no-unexplained-pending exit criterion and compensation path |
| Start L4 in a fresh chat | Continue the long L3 context vs validated handoff | L4-01 is large and benefits from a fresh context window |

## Pending Work

## Immediate Next Steps

1. In the new chat, read this handoff and run the session-handoff staleness/resume checks. Confirm the branch, worktree, tracker at 72/114, and whether the scoped L3 commit/draft PR was published after this document was created.
2. Inspect every existing generative route and persistence boundary needed by L4-01, but do not edit route integrations yet. Build an exact action/quote/provider/result map for The Working, Seven Lenses, expansion, Deep Search, image, and generic AI bypasses.
3. Design L4-01's shared server-only adapter, fixed versioned quote catalog, privacy-safe usage telemetry, verified-email/size/concurrency/velocity controls, global/per-action kill switches, Reader UTC-month cost breaker, audited overrides, and off/shadow/enforce behavior.
4. Implement L4-01 locally with every action default `off`. Add focused application/database/concurrency/failure tests before changing any existing AI route.
5. Only after L4-01 is `done`, start L4-02 route integration for The Working at one credit.

## Blockers/Open Questions

- [ ] Define the exact initial action-code catalog and cost-estimate versions from existing routes before implementation; do not infer action prices beyond the tracker contract.
- [ ] Determine the durable persistence boundary and provider metadata available in each existing AI route; L4-01 should expose interfaces, while L4-02/L4-03 own concrete route wiring.
- [ ] Choose environment-variable names and safe default thresholds for Reader cost breaker and velocity controls. Defaults must fail closed for Reader generation only at the configured threshold and must not block paid tiers or non-generative free features.
- [ ] Production deployment of all L2/L3 migrations, named Portal configuration, eligible non-admin canary, and live paid activation remains independently gated under `LEAN-L5-05`.

## Deferred Items

- L4-02 through L4-06 route metering and full-story provider/browser gates are deferred until L4-01 passes.
- Wallet UI and customer surfaces are L5 work; the L3 wallet API intentionally has no UI caller.
- Production migrations, Vercel configuration, Stripe live resources, real customer grants/reservations, paid sales, course release, and activation require separate explicit approvals.
- Packs, purchased credits, rollover, debt, annual plans, gifts, transfers, plan switching, and other expansion-blueprint features remain outside lean launch scope.

## Context for Resuming Agent

## Important Context

- The authoritative current status is **72/114 (63.2%)**, with Phases L0-L3 complete and `LEAN-L4-01` ready. The predecessor handoff's L2 blocker is historical and was later superseded by accepted Stripe test-mode lifecycle evidence.
- No production deployment or migration occurred. No real customer grant, reservation, metered action, provider call, or paid activation was performed during L3.
- The L3 migrations are present locally but are not authorized for production merely because the phase gate passed.
- No existing AI route calls `reserve_credits_v1`, `commit_credit_reservation_v1`, or `release_credit_reservation_v1`. Preserve that until L4-01 establishes the shared adapter and defaults.
- The wallet GET is compiled and tested but has no UI caller. It obtains identity only from `auth.getUser()` and never accepts a user ID from query/body input.
- The final 20-session gate ended with ten releases, available `10`, reserved `0`, version `21`, zero pending rows, and zero fixture residue.
- The current branch is `agent/lean-membership-l2`, tracking `origin/agent/lean-membership-l2`. Jen explicitly requested a scoped handoff/commit/push after L3 completion. Verify the final Git state before resuming.
- Preserve unrelated course-parser work and local Supabase port changes. Do not reset, restore, clean, or include them in the membership commit.

## Assumptions Made

- A local passing phase gate is sufficient to mark L3 complete in the implementation tracker, but it does not authorize deployment or activation.
- L4-01 can be developed locally while production L5 gates remain closed, provided every mode/action defaults off and no route is integrated prematurely.
- The existing `ai_usage_events` table is the foundation for privacy-safe attempt/cost telemetry, but L4-01 may require additive constraints or service functions after the existing route inventory is complete.

## Potential Gotchas

- `credit_accounts` is a cache, not the sole accounting authority. Always verify ledger deltas/version and the active-grant/adjustment/commit/pending formula.
- Monthly grant synchronization rejects ambiguous billing state and refuses to replace a grant while a pending reservation exists. Recover stale holds before grant rollover.
- `release_credit_reservation_v1` accepts only its narrow reason-code allowlist. Do not expose reason selection to clients.
- A successful provider response is not the commit boundary. Commit only after durable user-owned persistence; release on persistence failure.
- Do not store prompt/response text, email, raw Stripe IDs, or arbitrary customer metadata in telemetry.
- The local Supabase ports in `supabase/config.toml` are an unrelated pre-existing dirty change and were intentionally excluded from the membership publish scope.
- Repository-wide lint has a broad unrelated baseline; use focused lint for changed TypeScript plus TypeScript/build checks proportional to the packet.
- The local Docker/Supabase stack was left running to avoid disrupting other work. Verify rather than assuming exactly one container remains.

## Environment State

## Tools/Services Used

- Local Supabase/PostgreSQL in Docker for migrations, rollback stories, and concurrent sessions.
- PowerShell runners with an explicit `local` target and exact container discovery.
- Node/TypeScript test runner, targeted ESLint, TypeScript compiler, and Next.js production build.
- GitHub CLI for the requested scoped publish workflow; authentication was healthy when checked outside the network sandbox.
- Mission Control and session-handoff audit/validation scripts.

## Active Processes

- The local Supabase stack was intentionally left running after verification.
- No Next.js build, test, handoff-validation, or GitHub process should remain running.

## Environment Variables

Relevant names only; no values were recorded or changed:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PRISMARIUM_BILLING_OPERATIONS_ENABLED`
- `PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID`
- `PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY`
- `PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY`
- `PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY`
- `PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY`

## Related Resources

- [Membership implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Lean Membership launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [L3-01 schema evidence](../../docs/audits/lean-l3-01-credit-core-schema-local-2026-08-11.md)
- [L3-02 monthly-grant evidence](../../docs/audits/lean-l3-02-monthly-grants-local-2026-08-11.md)
- [L3-03 atomic-reservation evidence](../../docs/audits/lean-l3-03-atomic-reservations-local-2026-08-11.md)
- [L3-04 safe-wallet evidence](../../docs/audits/lean-l3-04-safe-wallet-local-2026-08-11.md)
- [L3-05 phase-gate evidence](../../docs/audits/lean-l3-05-credit-core-phase-gate-local-2026-08-11.md)
- [Previous handoff](./2026-08-11-161619-lean-membership-l2-06-live-gate-blocked.md)

---

**Security Reminder**: This handoff must pass the session-handoff validator before use.
