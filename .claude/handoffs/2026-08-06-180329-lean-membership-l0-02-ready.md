# Handoff: Lean membership L0-02 ready

> **Superseded on August 6, 2026:** `LEAN-L0-02` is accepted and complete at 5/114 total launch points. Continue from [the L0-04 handoff](./2026-08-06-190612-lean-membership-l0-04-ready.md). Do not follow the production or staging probe instructions below; that test path is permanently retired.

## Session Metadata

- Created: 2026-08-06 18:03:29
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `develop`
- Session duration: Approximately one focused implementation/audit session

### Recent Commits (for context)

- `e73061e` Make course preview source assertions formatting-agnostic
- `08d6be2` Restore the previous member dashboard and spotlight the current course
- `a81f931` Ship Course Format V2 rollout: release presentation, course-polls, public graph/library views
- `64631fc` Graph: retire legacy Concepts surface
- `c7617a4` DB: make course graph migrations atomic

## Handoff Chain

- **Continues from:** [2026-08-06-155729-lean-membership-launch-ready.md](./2026-08-06-155729-lean-membership-launch-ready.md)
- **Supersedes:** That handoff's immediate execution state. The product decisions and deferred-scope guidance in the earlier handoff remain controlling.

## Current State Summary

`LEAN-L0-01` is finished and Jen explicitly accepted its dated read-only evidence on August 6, 2026. The live tracker now records 3/114 verified points (2.6%), marks `LEAN-L0-01` `done`, and sets both `LEAN-L0-02` and `LEAN-L0-04` to `ready`. No packet is currently in progress. The next chat should start **only `LEAN-L0-02`**, the non-repair adversarial authorization baseline. `LEAN-L0-04` remains ready as a separate code-change packet. No production database, Stripe object, Vercel configuration, deployment, pricing UI, or application code was mutated in L0-01.

## Codebase Understanding

## Architecture Overview

- Next.js 16/React 19 is deployed on Vercel; Supabase provides auth/data and Stripe provides billing.
- The production Vercel deployment is `READY`, built from main revision `68d7f0b1211331f6228d58a9b4d9425adb816ffc`. The high-risk Stripe, generation, course, and limiter files inspected locally have no diff from that deployed revision.
- `supabase/migrations` is the CLI-canonical migration tree, but it materially diverges from the deployed ledger and from the two legacy/manual trees.
- Customer requests normally use the session-bound Supabase client. Service-owned mutations use `createServiceClient()`, but the current Stripe webhook incorrectly uses the request/session client.
- Middleware requires authentication for most API routes, but authentication alone does not provide plan authorization, metering, ownership, or server authority.
- Course route payloads sanitize public curriculum. Production has 29 published previews, but release environment variables are absent; PRE is the only course currently open for full access after sign-in/enrollment.
- L0-02 must capture the existing authorization failures without repairing them. L0-03 owns the forward permission fix; L0-04 owns stale-sales and unmetered-route closure.

## Critical Files

| File | Purpose | Relevance |
|---|---|---|
| `docs/audits/lean-l0-01-read-only-preflight-2026-08-06.md` | Accepted production evidence report | Exact hypotheses and boundaries L0-02 must convert into adversarial tests |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Live execution source of truth | Shows L0-01 done, L0-02/L0-04 ready, points, risks, and session rules |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Controlling product/safety scope | Prevents L0-02 from becoming a repair or expansion packet |
| `supabase/migrations/20260219210102_remote_schema.sql` | Repository baseline for deployed RLS/grants | Useful reference, but deployed catalogs are authoritative because of drift |
| `supabase/migrations/20260501000000_protect_course_curriculum.sql` | Course column-grant boundary | Explains why preview metadata is selectable while curriculum content is not |
| `app/test-permissions.ts` | Existing permission-test entry point | Inspect before creating a new harness; do not assume it is production-safe |
| `app/tests/sql/` | Existing SQL test area | Candidate home for transaction/rollback authorization probes |
| `app/src/lib/supabase/server.ts` | Session client | Shows customer request authority |
| `app/src/lib/supabase/service.ts` | Service-role client | Must not be used to impersonate a successful customer test |
| `app/src/app/api/stripe/webhook/route.ts` | Current billing projection handler | Known request-authority and ignored-error failure; repair is not L0-02 |
| `app/src/app/api/stripe/create-checkout-session/route.ts` | Current Checkout route | Accepts browser Price/mode; L0-04 owns closure |
| `app/src/lib/parallax/rate-limit.ts` | Legacy query counter | Non-atomic and fail-open; L0-04/L4 own closure/replacement |
| `app/src/lib/routing/public-access.ts` | Middleware public-route map | Necessary for distinguishing anonymous, middleware-authenticated, and route-authorized paths |

### Key Patterns Discovered

- Treat live Postgres catalogs and the deployed migration ledger as production truth; do not infer deployed state from repository migrations.
- Test both table grants and RLS. Broad grants are harmless only when RLS and column boundaries are correct; seven exposed tables have no RLS protection at all.
- Use a real customer-authority client/JWT for adversarial API tests. A service client or management query cannot prove that customer writes are denied.
- Keep tests privacy-safe: use a disposable fixture, record booleans/status codes and synthetic values, and never print emails, UUIDs, Stripe IDs, tokens, prompts, or secrets.
- Prefer explicit transaction rollback for database probes. Do not rely on cleanup after a partially successful production mutation.
- Unknown/ambiguous authority must fail closed. A database or test-harness error is not evidence that a customer write was denied.

## Work Completed

### Tasks Finished

- [x] Marked `LEAN-L0-01` in progress with a read-only boundary.
- [x] Inventoried all three migration trees and compared the canonical tree to the deployed ledger.
- [x] Queried deployed tables, columns, RLS policies, grants, functions, advisors, and privacy-safe aggregates.
- [x] Verified the exact live Stripe mode, complete product/Price catalog, subscription count, and webhook configuration without persisting secrets.
- [x] Inventoried unsafe Checkout, webhook, generation, diagnostic, cache, enrollment, usage, and user-row boundaries.
- [x] Compared all 29 database-published courses with effective preview/full-access behavior.
- [x] Verified backup and rollback prerequisites and documented the absence of a restorable database backup.
- [x] Wrote and privacy-validated the dated report.
- [x] Received Jen's acceptance, marked L0-01 done for 3 points, and unlocked L0-02/L0-04.

## Files Modified

| File | Changes | Rationale |
|---|---|---|
| `docs/audits/lean-l0-01-read-only-preflight-2026-08-06.md` | Added the accepted dated evidence report | Satisfies L0-01 without production or Stripe mutation |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Advanced L0-01 from ready -> in progress -> verifying -> done; updated risks, points, session log, and dependencies | Keeps execution status synchronized with accepted evidence |
| `.claude/handoffs/2026-08-06-180329-lean-membership-l0-02-ready.md` | Added this continuation handoff | Lets the next chat start directly at L0-02 |

## Decisions Made

| Decision | Options Considered | Rationale |
|---|---|---|
| Accept L0-01 for 3 verified points | Leave verifying; accept; begin repair immediately | Jen explicitly accepted; the report meets the packet boundary and external state was not mutated |
| Start L0-02 next and keep L0-04 separate | Start L0-04 first; combine both; start L0-02 | The tracker requires one in-progress packet and L0-02 captures evidence before any repair/closure changes behavior |
| Keep L0-03 behind a backup gate | Write migration now; rely on Vercel rollback; require restore-tested backup | Vercel rollback cannot restore database state and Supabase reported no usable backup timestamp/PITR window |
| Never test against a real customer | Reuse one of three accounts; create a disposable fixture; static inspection only | Real customer probing is unacceptable; static inspection alone does not satisfy adversarial evidence |

## Pending Work

## Immediate Next Steps

1. Read the accepted report and live tracker, confirm L0-01 is `done`, then mark **only `LEAN-L0-02`** `in_progress`. State that the boundary is baseline evidence only - no permission fixes, Stripe changes, route closures, or production schema mutation.
2. Inspect `app/test-permissions.ts`, `app/tests/sql/`, package scripts, Supabase test helpers, and the staging/local environment files without printing secrets. Establish a disposable non-admin fixture and a safe target. Prefer transaction/rollback or a disposable staging/local project.
3. Add/run adversarial tests for: own protected `users` fields; another account; enrollment/access/progress; `search_cache`; `api_usage`/provider usage; all seven RLS-disabled tables; protected course curriculum columns; relevant SECURITY DEFINER RPCs; and any pre-credit fields/tables that exist.
4. Capture the **current failures** with privacy-safe status/result evidence. Do not repair policies or routes in the same packet.
5. Update the report/tracker with test target, fixture lifecycle, exact failures/denials, limitations, and cleanup proof. Mark L0-02 `verifying` or `done` only when every acceptance category has explicit evidence.

### Blockers/Open Questions

- [ ] A safe disposable authorization-test target is not yet confirmed. Docker Desktop was unavailable during L0-01, and local Supabase status was not established. Inspect `.env.local.staging`/local tooling without exposing values. If only production is available, stop and obtain Jen's explicit approval for a disposable production test account and rollback-safe probes.
- [ ] No verified restorable database backup exists. This does not prevent a non-mutating/rolled-back L0-02 baseline, but it blocks production execution of L0-03.
- [ ] The production database has one stored Stripe customer reference and one subscription reference while live Stripe has zero subscriptions. Do not send stored identifiers to Stripe without separate approval; L0-02 does not need that reconciliation.

### Deferred Items

- `LEAN-L0-04` is ready but remains a separate packet: disable stale Checkout and customer-facing unmetered AI/image/generic bypasses.
- `LEAN-L0-03` permission/server-authority repair follows L0-02 and remains gated from production by a restore-tested backup.
- Monthly billing catalog, webhook inbox/projector, and exact Price mapping belong to L2.
- Credit schema/metering belongs to L3/L4.
- Annuals, packs, rollover, Deep Search launch, signed-in Week 1, and image generation remain deferred by the lean plan.

## Context for Resuming Agent

## Important Context

The accepted preflight confirmed these test hypotheses:

1. `users`: an authenticated user appears able to update all columns on their own row, including `role`, `tokens_earned`, `subscription_status`, Stripe references, subscription dates, identity fields, and trial state.
2. Seven exposed tables have RLS disabled while `anon` and `authenticated` retain broad privileges: `convergence_concepts`, `convergence_relationships`, `convergence_traditions`, `correspondence_entity_types`, `correspondence_relationship_types`, `knowledge_claims`, and `knowledge_sources`.
3. `course_enrollments`: customer-owned insert/update/delete can forge course, week, completion, and progress state.
4. `api_usage`: the insert policy is assigned to `public` with `WITH CHECK (true)`.
5. `search_cache`: authenticated insert with `WITH CHECK (true)` can poison/flood shared results.
6. Course curriculum protection appears correct at the column-grant level: `anon`/`authenticated` can select metadata but not `courses.content` or `course_texts`. Prove both allowed preview and denied curriculum paths.
7. Seven `SECURITY DEFINER` functions are anonymously executable. Probe callable RPC behavior without relying solely on advisor output.
8. The webhook/Checkout/generation issues are confirmed but out of scope for L0-02 repairs. Preserve the baseline before L0-04 changes public behavior.

The production evidence report is the source for exact facts. Do not rerun broad pricing/product discovery and do not mutate production merely because a vulnerability is already likely.

## Assumptions Made

- Jen's "awesome lets do it" explicitly accepts L0-01 and authorizes advancing its tracker state, not production mutation.
- L0-02 should use a disposable fixture and privacy-safe evidence; it should never probe another real customer.
- Baseline tests may intentionally fail because they are proving current vulnerabilities. A failing test is useful only when the harness distinguishes an authorization failure from network/setup failure.
- L0-04 can start after L0-02 evidence is captured even though L0-03 waits for a backup, because L0-04 is an application-code/flag packet with its own verification and rollback.

## Potential Gotchas

- The worktree contains substantial pre-existing untracked user work. Preserve all unrelated files and do not stage/commit broadly.
- The planning/tracker/handoff files are themselves currently untracked. Their untracked state does not mean they may be overwritten.
- Supabase CLI read commands update `supabase/.temp/cli-latest`; restore that incidental metadata change before finishing.
- The CLI canonical tree has 14 valid migrations versus 26 deployed. Do not use `db push`, `migration repair`, or replay local-only migrations in L0-02.
- A broad Vercel production env pull was rejected because it materializes unrelated secrets. If live configuration is needed, use narrow per-variable reads held in memory and redact output.
- Do not expose or persist secret keys, raw Price/Product/customer/subscription IDs, Supabase project references, user UUIDs, emails, or JWTs.
- Do not count a service-role success as a customer vulnerability test; service role bypasses RLS by design.
- Middleware auth can make a route look protected while still allowing every signed-in customer. Test route-level authorization separately.
- The legacy limiter fails open, and some generation routes bypass it, but do not call paid providers merely to demonstrate that fact in L0-02.
- The configured live webhook points at the legacy domain and returns a 301. Do not send a synthetic Stripe event in L0-02.

## Environment State

### Tools/Services Used

- Supabase CLI: linked project; read-only migration, query, advisor, and backup-list commands succeeded.
- Vercel CLI/API: linked project `digital-grimoire-96dg`; production deployment/env metadata reads succeeded.
- Stripe API: production live account queried with narrow in-memory credentials; GET-only account/catalog/subscription/webhook reads succeeded.
- Git: branch `develop`; no background Git operation.

### Active Processes

- None. No dev server, Docker stack, watcher, or background script was started.

### Environment Variables

Names relevant to future work; values must never be printed:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT`
- `NEXT_PUBLIC_MAINTENANCE_MODE`
- `NEXT_PUBLIC_PRISMARIUM_CURRENT_COURSE_SLUG`
- `NEXT_PUBLIC_PRISMARIUM_NEXT_COURSE_SLUG`
- `NEXT_PUBLIC_PRISMARIUM_PREVIOUSLY_OPENED_COURSE_SLUGS`

## Related Resources

- [Accepted L0-01 report](../../docs/audits/lean-l0-01-read-only-preflight-2026-08-06.md)
- [Live implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Lean launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [Deferred full blueprint](../../docs/planning/prismarium-membership-credits-development-plan-2026-08-06.md)
- [Previous handoff](./2026-08-06-155729-lean-membership-launch-ready.md)

## Recommended next-chat prompt

> Resume from `.claude/handoffs/2026-08-06-180329-lean-membership-l0-02-ready.md` and begin `LEAN-L0-02`. Keep it baseline-only: use a disposable non-admin fixture, capture current authorization failures without repairing them, and do not mutate production unless I explicitly approve the exact test setup.
