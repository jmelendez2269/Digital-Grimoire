# Handoff: LEAN-L5-04 complete; LEAN-L5-05 awaiting separate authorization

## Session Metadata

- Created: 2026-08-12 19:09:54 America/New_York
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `agent/lean-membership-l2`
- HEAD: `6b6efc9` (`Finalize Lean Membership Phase L4 handoff`); upstream divergence `0/0`
- Session duration: approximately 2 hours
- Working state: intentionally dirty; 26 modified tracked files, 38 untracked files, 0 staged files at handoff creation
- External state: no commit, push, PR, deployment, environment-file edit, remote migration, Stripe mutation, paid sale, course release, production credit action, or production metered-route action

## Recent Commits (context only)

- `6b6efc9` Finalize Lean Membership Phase L4 handoff
- `511f694` Complete Lean Membership Phase L4
- `1344eb1` Complete Lean Membership Phase L3
- `a93c6b7` Complete Lean Membership Phase L2
- `5191f12` Record lean membership plans and verification

## Handoff Chain

- **Continues from:** [2026-08-12-173535-lean-l5-03-complete-l5-04-ready.md](./2026-08-12-173535-lean-l5-03-complete-l5-04-ready.md)
- **Supersedes:** that handoff's L5-04 readiness, seven-day duration, current-state, blocker, and immediate-next-step sections. Read it only for the completed L5-01 through L5-03 implementation details and the pre-existing dirty-worktree inventory.

## Current State Summary

`LEAN-L5-04` is complete under an owner-approved replacement for the original seven-calendar-day rule. Jen explicitly approved a denser gate of 30 successful localhost shadow actions across three independent execution batches and three marker-owned Reader accounts, while retaining all action, maximum-size, resilience, economics, and safety requirements. The accepted matrix is 30/30: Working 8, expansion 7, standard 8, and long 7; 52 credits were quoted, zero were charged, zero Checkout requests occurred, and accepted provider cost totaled $0.064280. Separate metering/resilience coverage passed 32/32. Conservative base and 5x stress economics pass for Reader, Student, Scholar, and Adept, which therefore record economics `enable` decisions. Exact local fixture cleanup finished with zero residue. Mission control is now 107/114 (93.9%), Phase L5 is 14/21, and `LEAN-L5-05` remains `not_started` pending separate explicit authorization. Every production, sales, Checkout, course-release, billing-operation, deployment/migration, production-credit, and production-metered-route gate remains closed.

## Codebase Understanding

## Architecture Overview

The L5-04 runner is an append-only, localhost-only integration harness. `lean-l5-04-shadow-study.ts` defines the predeclared three-batch schedule and economics helpers. The CLI runner discovers the local Supabase port from the repository config, reads local Supabase credentials and configured provider credentials without editing environment files, refuses non-loopback application/database targets, starts Next on `127.0.0.1:3017`, and injects process-only configuration with paid sales and Checkout closed and metering set to `shadow`.

The browser authenticates three exact marker-owned Reader fixtures, verifies that the active client bundle references loopback Supabase and excludes the hosted project identifier, rotates fixture passwords for every batch, uses fresh request UUIDs, and submits synthetic Working, standard, long, and expansion requests. An accepted batch requires its exact predeclared success count, matching privacy-safe metering/usage rows, zero new credit artifacts, zero charged credits, and zero Checkout requests. Evidence omits prompts, responses, raw user IDs, provider request IDs, and credentials.

The original date-keyed Day 1 packet is immutable and is treated as Batch 1. Batch 2 has 13 runs and covers exact 16,000-byte standard synthesis plus maximum-derived-parent expansion. Batch 3 has 12 runs and covers exact 16,000-byte long synthesis with the maximum response class. The combined schedule reaches 30 successes and at least seven per action.

The final economics model uses the costliest observed successful provider cost per credit ($0.005273), a deliberately conservative per-credit Vercel estimate based on the maximum observed one-credit wall latency and 2 GB provisioned memory, and payment fees of `price x 3.6% + $0.30`. A separate 5x provider-and-infrastructure stress case remains below the 15% provider-cost ceiling and above the 70% contribution-margin floor for every paid tier.

## Critical Files

| File | Purpose | Relevance |
|---|---|---|
| `app/scripts/lean-l5-04-shadow-study.ts` | Setup, three-batch browser/provider runner, offline evidence status, diagnostic status, and exact local cleanup command | Primary executable boundary; hard-refuses non-local targets and prevents credit/Checkout mutation in accepted evidence |
| `app/src/lib/membership/lean-l5-04-shadow-study.ts` | Three-batch schedule, canonical serializer, exact-byte input builder, economics helper | Locks the 5 + 13 + 12 run matrix and all maximum-size coverage |
| `app/tests/lean-l5-04-shadow-study.test.ts` | Schedule, maximum-byte, and economics tests | Passed 4/4 and proves 30 total successes with 8/7/8/7 action distribution |
| `docs/audits/lean-l5-04-shadow-study/2026-08-12.json` | Original Day 1 evidence retained unchanged as Batch 1 | Historical immutability and first five accepted successes |
| `docs/audits/lean-l5-04-shadow-study/2026-08-12-batch-02.json` | Batch 2 machine evidence | Thirteen successes; standard maximum and maximum-derived expansion coverage |
| `docs/audits/lean-l5-04-shadow-study/2026-08-12-batch-03.json` | Batch 3 machine evidence | Twelve successes; long maximum coverage and excluded transient provider attempt |
| `docs/audits/lean-l5-04-shadow-cost-study-in-progress-2026-08-12.md` | Original and owner-amended protocol history | Now explicitly superseded by the complete report |
| `docs/audits/lean-l5-04-shadow-cost-study-complete-2026-08-12.md` | Canonical completion, economics, decision, resilience, and cleanup record | Source of truth for L5-04 completion and all four economics decisions |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Program status and dated decision/evidence register | Records 107/114, L5-04 `done`, L5-05 `not_started`, LD-17, and LD-18 |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Governing launch scope and acceptance model | Replaces calendar spacing with three independent batches while preserving all launch gates |

## Key Patterns Discovered

- Evidence quality is based on coverage, independent execution boundaries, and conservative modeling; elapsed calendar time is not useful for synthetic localhost traffic once the owner explicitly amends the policy.
- Historical evidence is append-only. The original `studyDay: 1` packet was not rewritten; the status reader accepts it as Batch 1 alongside later `studyBatch` packets.
- Shadow mode may create privacy-safe metering/usage rows but must never create reservations, debits, commits, or Checkout requests.
- Provider failures and harness failures never count toward the 30 successes. They remain excluded evidence unless intentionally executed in the separate resilience matrix.
- An economics `enable` result is not runtime activation authority. L5-05 still owns production deployment, live Portal/canary, public flags, sales, and activation.
- Cleanup must prove exact ownership before mutation and zero residue afterward. Hardened service-role permissions are not bypassed casually.

## Work Completed

## Tasks Finished

- [x] Verified the predecessor handoff, branch/HEAD, and dirty worktree before starting L5-04.
- [x] Verified current Anthropic, OpenRouter, Stripe Payments, Stripe Billing, and Vercel pricing inputs from primary sources.
- [x] Built and tested the localhost-only append-only shadow-study harness.
- [x] Accepted the original Day 1 packet with five successes and exact Working maximum coverage.
- [x] Recorded Jen's explicit replacement of the seven-day rule with 30 successes across three independent batches.
- [x] Updated the schedule, tests, harness, protocol, launch plan, tracker, and decision register coherently.
- [x] Ran Batch 2 at 13/13 successes with standard maximum and maximum-derived expansion coverage.
- [x] Ran Batch 3 at 12/12 successes with long maximum coverage after one excluded transient provider-error attempt.
- [x] Confirmed the final matrix at 30 successes, 52 quoted credits, zero charged credits, zero Checkout, and $0.064280 provider cost.
- [x] Ran the separate controlled resilience suite at 32/32 for provider, timeout, abort, disconnect, empty, persistence, release, and exact replay paths.
- [x] Modeled base and 5x stress economics and recorded `enable` for Reader, Student, Scholar, and Adept while preserving the Reader $50 UTC-month breaker.
- [x] Removed only the exact marker-owned local fixtures and verified zero residue.
- [x] Stopped the local Next server and Supabase stack while preserving the local Docker volume.
- [x] Updated mission control to 107/114 (93.9%) with L5-04 done and L5-05 not started.
- [x] Passed focused ESLint, global TypeScript, `git diff --check`, evidence/gate/privacy aggregation, and mission-control link/drift audit.

## Files Modified

| File/group | Changes | Rationale |
|---|---|---|
| `app/package.json` | Adds L5-04 test and study commands | Repeatable narrow verification and study control |
| `app/scripts/lean-l5-04-shadow-study.ts` | Local guards, fixtures, browser/provider batches, evidence, diagnostics, status, cleanup | Integrated shadow evidence without production or credit mutation |
| `app/src/lib/membership/lean-l5-04-shadow-study.ts` | Three-batch matrix, canonical byte inputs, economics | Owner-amended acceptance contract expressed as testable code |
| `app/tests/lean-l5-04-shadow-study.test.ts` | Four focused schedule/size/economics tests | Prevents accidental weakening of the amended gate |
| Three JSON evidence packets | 30 privacy-safe accepted successes plus excluded attempts | Machine-readable cost and boundary evidence |
| Protocol and complete audit | Owner amendment, observations, stress model, decisions, cleanup | Dated source of truth without rewriting original evidence |
| Tracker and launch plan | L5-04 done, LD-17/LD-18, 107/114, L5-05 closed | Mission-control consistency |

Many other modified/untracked files predate L5-04 and belong to earlier L5 packets, course work, local Supabase configuration, and the post-lean roadmap. Preserve them exactly. Do not infer that the complete dirty tree belongs to this packet.

## Decisions Made

| Decision | Options Considered | Rationale |
|---|---|---|
| Replace seven days with three independent batches | Wait six more calendar days; reduce evidence; preserve evidence density across batches | Jen judged calendar duration disproportionate for synthetic localhost work; 30 successes, coverage, resilience, and thresholds remain intact |
| Keep original Day 1 immutable | Rewrite it as Batch 1; delete it; compatibility-read it | Append-only audit history is more trustworthy than retroactive normalization |
| Use 5 + 13 + 12 schedule | Seven daily groups; one 30-run process; three restart-separated batches | Reuses accepted evidence and adds two independent restart/credential/request-ID boundaries |
| Use worst observed cost/credit plus 5x stress | Average cost only; provider quote fallbacks; worst successful observation | Conservative without treating failed requests as successful customer COGS |
| Record Adept `enable` | Default hold; revise allowance; enable | Seven successful long actions, exact maximum-input/response coverage, and 5x stress economics exceed the amended evidence gate |
| Preserve Reader $50 breaker | Raise/remove breaker; hold Reader generation | Full-use cost has wide headroom, while the breaker remains a prudent global cap |
| Mark L5-04 done but leave L5-05 not started | Begin canary automatically; mark L5-05 ready/in progress | Economics evidence never grants production or sales authority; user requested a fresh, separately authorized boundary |

## Pending Work

## Immediate Next Steps

1. In the new chat, read this handoff completely, verify `git status --short`, branch `agent/lean-membership-l2`, HEAD `6b6efc9`, tracker status 107/114, and that ports 3017/58021 remain stopped. Preserve all dirty work.
2. Do **not** start `LEAN-L5-05` unless Jen explicitly authorizes that exact packet. A resume request alone is not production/canary authorization.
3. If Jen explicitly authorizes L5-05, read its full tracker acceptance criteria and the L5-04 complete report, then prepare a narrow, gated plan. Begin with read-only/local verification and identify every production mutation or external authority boundary before requesting it.

## Blockers/Open Questions

- [ ] Authorization blocker: `LEAN-L5-05` is intentionally `not_started` and requires Jen's separate explicit authorization.
- [ ] Production decisions: L5-05 requires exact production deployment/migration scope, named live Portal configuration, eligible non-admin canary scope, public-flag approval, live smoke, and rollback authority. Do not infer these from L5-04.
- [ ] No L5-04 technical blocker remains.

## Deferred Items

- `LEAN-L5-05`: production canary and public launch gate; explicitly not started.
- `LEAN-L5-06`: first 72-hour monitoring and stabilization after a separately authorized public enablement.
- Production billing deployment/migrations, named live Portal configuration, eligible production canary, paid/public activation, and course release.
- All post-lean roadmap items, including Deep Search, image generation, packs, rollover, annual plans, and broader course lifecycle work.

## Context for Resuming Agent

## Important Context

- The canonical completion record is [lean-l5-04-shadow-cost-study-complete-2026-08-12.md](../../docs/audits/lean-l5-04-shadow-cost-study-complete-2026-08-12.md). The tracker is 107/114 (93.9%), Phase L5 is 14/21, L5-04 is `done`, and L5-05 is `not_started`.
- Preserve every unrelated dirty change. At handoff creation there were 26 modified tracked files and 38 untracked files, with zero staged. Do not reset, stash, checkout-overwrite, broadly format, clean, commit, push, or open a PR unless explicitly requested.
- All production and commercial gates are still closed: paid sales, Checkout, Portal operations, billing operations, course release, production credits, production metered routes, deployments, migrations, live canary, and public flags.
- The three accepted evidence packets contain 30 runs, 52 quoted credits, zero charged credits, zero gate/privacy failures, and $0.064280 provider cost. Distribution is Working 8, expansion 7, standard 8, long 7; all maximum profiles are present.
- Economics `enable` means cost viability only. It does not prove willingness to pay, activate offers, or authorize L5-05.
- Local cleanup permanently removed the exact study fixture rows: 32 metering requests, 32 usage events, three credit transactions/grants/accounts, three auth/profile account pairs, and the tagged source/link/intention. Privacy-safe audit files remain.
- The Next study server on 3017 and local Supabase API on 58021 were stopped and verified not listening. The Supabase Docker volume is preserved.
- No production/customer data was connected, read, changed, or deleted during L5-04.

## Assumptions Made

- Jen's explicit "ok lets do it" approved the replacement of the seven-calendar-day criterion and completion of L5-04 only, not L5-05.
- Three independently restarted localhost batches are sufficient for this synthetic cost study because sample/action/size/resilience/economics requirements remain stronger than elapsed-time repetition.
- The current 10/30/100/300 allowances, 1/1/2/3 initial action weights, and $0/$15/$39/$69 prices remain the launch targets after the economics pass.
- The Reader $50 UTC-month breaker remains the correct protective default.

## Potential Gotchas

- Do not resurrect the seven-day blocker: LD-17 and the amended plan explicitly replace it with three independent batches. Historical Day 1/7 text in the dated changelog is labeled historical.
- Do not rerun the success matrix. Offline `npm run study:lean-l5-04 -- status` reports `successMatrixComplete: true`; `run-batch` refuses a fourth batch.
- `status` intentionally works without local Supabase. Commands such as `setup`, `cleanup`, and `run-batch` require the local stack and provider configuration.
- The original evidence uses `studyDay`; later evidence uses `studyBatch`. Compatibility logic is deliberate.
- The first Batch 3 attempt stopped on a transient standard-provider error and is retained as excluded evidence. It is not one of the 30 successes or one of the deliberate 32 resilience tests.
- Running metering tests with raw `tsx --test` triggers the intentional `server-only` import guard. Use `npm run test:membership-metering`, which supplies `--conditions=react-server`.
- This ESLint configuration does not support `--file`; use `npx eslint <paths>`. There is no `typecheck` npm alias; use `npx tsc --noEmit`.
- The initial application-level cleanup was denied on `ai_usage_events` by hardened permissions. Exact cleanup was then performed through one asserted local-database-owner transaction after a read-only ownership inventory. Residue is already zero; do not improvise another cleanup.
- Supabase CLI may need approval to write its telemetry file outside the workspace. Never redirect it toward production or bypass the local config.
- The mission-control audit reports the pre-existing zero-byte `radix_usage.txt` as suspicious. Do not delete it automatically.

## Environment State

## Tools/Services Used

- Repository-configured local Supabase Docker stack at loopback ports 58021/58022 during the study; stopped with volume preserved.
- Next.js development server at `127.0.0.1:3017` during each batch; stopped after each run.
- Installed headless Chrome through Playwright for authenticated browser execution.
- Configured Anthropic and OpenRouter providers for synthetic fixture prompts only.
- Local database-owner `psql` for the final exact marker-scoped cleanup after the hardened API denied direct usage-event deletion.

## Active Processes

- No L5-04 Next server, browser, or study process is running.
- Port 3017: no listener.
- Port 58021: no listener; the local Supabase stack is stopped.

## Environment Variables

Names used by the process-local harness; no values belong in documentation:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `PARALLAX_LENS_MODEL`
- `PARALLAX_SYNTHESIS_MODEL`
- `NEXT_PUBLIC_SITE_URL`
- `PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED`
- `PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS`
- `PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS`
- `PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG`
- `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS`
- `PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS`
- `PRISMARIUM_ENABLED_METERED_ACTIONS`
- `PRISMARIUM_METERING_MODE`
- `PRISMARIUM_METERING_ACTION_MODES`
- `PRISMARIUM_METERING_GLOBAL_KILL_SWITCH`
- `PRISMARIUM_METERING_ACTION_KILL_SWITCHES`

No environment file was edited.

## Verification Snapshot

- L5-04 schedule/economics tests: 4/4 passed.
- Metering/resilience tests: 32/32 passed.
- Evidence aggregation: 3 packets, 30 successes/runs, 52 quoted credits, 0 charged credits, $0.064280 cost, 0 gate failures, 0 privacy failures.
- Focused ESLint: passed.
- Global TypeScript `npx tsc --noEmit`: passed.
- `git diff --check`: passed; only pre-existing line-ending warnings were printed.
- Mission-control audit: zero missing/unindexed published files, broken relative links, mirror drift, or stale/unparseable review metadata.
- Staged files: zero.
- Ports 3017 and 58021: stopped.

## Related Resources

- [L5-04 completed report](../../docs/audits/lean-l5-04-shadow-cost-study-complete-2026-08-12.md)
- [Owner-amended protocol history](../../docs/audits/lean-l5-04-shadow-cost-study-in-progress-2026-08-12.md)
- [Batch 1 evidence](../../docs/audits/lean-l5-04-shadow-study/2026-08-12.json)
- [Batch 2 evidence](../../docs/audits/lean-l5-04-shadow-study/2026-08-12-batch-02.json)
- [Batch 3 evidence](../../docs/audits/lean-l5-04-shadow-study/2026-08-12-batch-03.json)
- [Membership implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Lean membership launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [Predecessor handoff](./2026-08-12-173535-lean-l5-03-complete-l5-04-ready.md)

---

**Security note:** This handoff contains environment-variable names and synthetic aggregate labels only. It contains no password, API key, JWT, service credential, provider request identifier, raw user ID, customer identifier, production value, prompt, or response.
