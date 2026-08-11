# Handoff: Lean membership L0-04 ready

> **Completed on August 6, 2026:** `LEAN-L0-04` is now `done` at 8/114 total launch points. Do not repeat the implementation steps below. Continue from the [canonical tracker](../../docs/planning/prismarium-membership-implementation-tracker.md) and [dated L0-04 evidence](../../docs/audits/lean-l0-04-stale-sales-unmetered-closure-2026-08-06.md). No external state was changed, and L0-02's production/staging adversarial probe path remains permanently retired.

## Session Metadata

- Created: 2026-08-06 19:06:12
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `develop`
- Session duration: One extended audit and baseline session

### Recent Commits (for context)

- `e73061e` Make course preview source assertions formatting-agnostic
- `08d6be2` Restore the previous member dashboard and spotlight the current course
- `a81f931` Ship Course Format V2 rollout: release presentation, course-polls, public graph/library views
- `64631fc` Graph: retire legacy Concepts surface
- `c7617a4` DB: make course graph migrations atomic

## Handoff Chain

- **Continues from:** [2026-08-06-180329-lean-membership-l0-02-ready.md](./2026-08-06-180329-lean-membership-l0-02-ready.md)
- **Supersedes:** That handoff's execution instructions. `LEAN-L0-02` is now accepted and complete; do not follow its former production or staging probe guidance.

## Current State Summary

`LEAN-L0-01` is accepted for 3 points and `LEAN-L0-02` is accepted for 2 points. Verified launch progress is **5/114 points (4.4%)**. No packet is currently in progress. The next and only packet to start is **`LEAN-L0-04` — disable stale sales and unmetered bypasses**, worth 3 points. `LEAN-L0-03` remains production-gated by a fresh, restricted, restore-tested logical backup even though its L0-02 dependency is satisfied. Jen's controlling decision is permanent for this packet: do not perform or propose another L0-02 staging or production adversarial probe, do not restore the intentionally shut-off staging project, and do not reset a production database password to support the retired test.

## Codebase Understanding

## Architecture Overview

- The application is Next.js 16/React 19 on Vercel, with Supabase for auth/data and Stripe for billing.
- Stripe Checkout is created in `app/src/app/api/stripe/create-checkout-session/route.ts`. It currently accepts a caller-supplied `priceId`, optionally maps legacy tier names from public environment variables, and can create Stripe customers before the offer is proven to be supported.
- Customer-accessible AI and media-generation endpoints are distributed across several API route handlers. Authentication is not equivalent to plan authorization or credit metering.
- The middleware has a global `NEXT_PUBLIC_MAINTENANCE_MODE`, but L0-04 should use narrowly scoped, server-side application guards so unrelated Prismarium features remain available.
- L0-04 is a reversible containment packet, not the final pricing, credit-ledger, webhook-authority, or metering implementation.
- The accepted L0-02 runtime evidence is local-only by design. The SQL harness refuses production and permits only `local` or `staging` targets.

## Critical Files

| File | Purpose | Relevance |
|---|---|---|
| `docs/planning/prismarium-membership-implementation-tracker.md` | Canonical packet status and points | Records L0-01 and L0-02 done, 5/114 points, and L0-04 next |
| `docs/audits/lean-l0-02-authorization-baseline-2026-08-06.md` | Accepted authorization evidence | Controlling evidence; no further staging/production probe required |
| `docs/audits/lean-l0-02-production-rollback-test-review-2026-08-06.md` | Retired production proposal and attempt record | Explicitly prohibits retrying or rebuilding the production runner |
| `app/src/app/api/stripe/create-checkout-session/route.ts` | Creates Stripe Checkout sessions and customers | Primary stale-sales containment target; must fail closed before Stripe or database mutation |
| `app/src/app/api/stripe/webhook/route.ts` | Handles Stripe events | Context only for L0-04; final authority/mapping repair belongs to later packets |
| `app/src/app/api/stripe/sync-subscription/route.ts` | Syncs Stripe subscription state | Context only; do not expand L0-04 into full billing repair |
| `app/src/app/api/working/generate/route.ts` | Generic generation endpoint | Candidate unmetered customer-accessible route to disable or guard |
| `app/src/app/api/parallax/query/route.ts` | Parallax query generation | Candidate unmetered customer-accessible route to disable or guard |
| `app/src/app/api/parallax/ai-search/route.ts` | AI search generation | Candidate unmetered customer-accessible route to disable or guard |
| `app/src/app/api/parallax/lens/[lensId]/route.ts` | Per-lens AI generation | Candidate unmetered customer-accessible route to disable or guard |
| `app/src/app/api/ai/gpt/route.ts` | Direct GPT proxy | Candidate generic provider bypass to disable or guard |
| `app/src/app/api/ai/claude/route.ts` | Direct Claude proxy | Candidate generic provider bypass to disable or guard |
| `app/src/app/api/ai/gemini/route.ts` | Direct Gemini proxy | Candidate generic provider bypass to disable or guard |
| `app/src/app/api/practitioner/tarot/generate/route.ts` | Tarot generation | Inspect caller and authority before deciding L0-04 disposition |
| `app/src/app/api/covers/generate/route.ts` | Cover generation | Inspect admin/service controls; contain only if customer-accessible and unmetered |
| `app/src/app/api/chapters/generate-names/route.ts` | Chapter-name generation | Inspect caller and authority before deciding L0-04 disposition |
| `app/src/app/api/process-document/route.ts` | Document processing with provider costs | Inspect for customer-accessible unmetered work |
| `app/src/app/api/process-media/route.ts` | Media processing with provider costs | Inspect for customer-accessible unmetered work |
| `app/src/app/api/metadata/extract/route.ts` | Metadata extraction | Inspect for customer-accessible unmetered work if the path exists in the active tree |
| `app/src/lib/parallax/rate-limit.ts` | Legacy limiter | Do not mistake legacy rate limiting for membership authorization or credit metering |
| `app/src/lib/routing/public-access.ts` | Public route map | Check whether any target endpoint bypasses normal authentication |
| `app/src/lib/supabase/middleware.ts` | Session refresh, auth routing, maintenance switch | Avoid using its global maintenance mode for scoped L0-04 containment |

## Key Patterns Discovered

- Route-level authentication is widespread, but the current membership model does not consistently authorize plans, meter credits, or deny unsupported offers.
- Existing Stripe tier environment variables represent stale offers and must not be treated as the new lean membership allowlist.
- A safe L0-04 guard should be evaluated at the top of a route, before provider clients, Stripe calls, customer creation, database writes, or expensive parsing.
- Default-closed server configuration is preferable for containment. Do not use a `NEXT_PUBLIC_` variable for a server authority decision.
- Preserve useful non-generative routes and admin/service workflows unless inspection proves they expose the same customer bypass.

## Work Completed

## Tasks Finished

- [x] Completed and accepted `LEAN-L0-01` read-only production and schema preflight for 3 points.
- [x] Built the guarded rollback-only L0-02 SQL suite and local runner.
- [x] Ran 48 local authorization probes: 11 secure passes, 37 security failures, 0 inconclusive, and `cleanup_residue = 0`.
- [x] Combined the local runtime results with the accepted production catalog evidence and accepted `LEAN-L0-02` for 2 points.
- [x] Recorded that the separately approved production connection attempt failed at password authentication before SQL, transaction, fixture creation, reads, or writes.
- [x] Permanently retired further L0-02 production/staging probing and deleted the production runner.
- [x] Restored the SQL guard to local/staging-only and left the intentionally shut-off staging project off.
- [x] Stopped the local Supabase containers with their data volume preserved and shut down Docker Desktop.
- [x] Updated the canonical tracker to 5/114 points (4.4%) and selected L0-04 as the next packet.

## Files Modified

| File | Changes | Rationale |
|---|---|---|
| `app/package.json` | Added the local authorization baseline command | Makes the accepted local harness reproducible without a production path |
| `app/tests/sql/README.md` | Documented the L0-02 suite and safety model | Preserves target and cleanup expectations |
| `app/tests/sql/lean-l0-02-authorization-baseline.sql` | Added 48 guarded rollback-only authorization probes; production is refused | Captures baseline failures without repairing permissions or retaining fixtures |
| `app/scripts/run-lean-l0-02-baseline.ps1` | Added local harness runner | Runs only against the local Supabase stack |
| `docs/audits/lean-l0-01-read-only-preflight-2026-08-06.md` | Added accepted L0-01 evidence | Establishes production catalog truth without mutation |
| `docs/audits/lean-l0-02-authorization-baseline-2026-08-06.md` | Added and finalized accepted L0-02 evidence | Records results and the no-more-probing decision |
| `docs/audits/lean-l0-02-production-rollback-test-review-2026-08-06.md` | Converted the former proposal into a retired historical record | Prevents another agent from retrying the unnecessary production test |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Marked L0-02 done, total 5/114, and L0-04 next | Keeps progress and immediate execution state canonical |
| `.claude/handoffs/2026-08-06-180329-lean-membership-l0-02-ready.md` | Marked superseded by this handoff | Prevents stale L0-02 execution instructions from being resumed |

The earlier `app/scripts/run-lean-l0-02-production-baseline.ps1` proposal was deleted. Do not recreate it.

## Decisions Made

| Decision | Options Considered | Rationale |
|---|---|---|
| Accept L0-02 from production catalog plus local runtime evidence | Retry production, restore staging, or accept combined evidence | The combined evidence is conclusive for baseline planning; more probing adds operational risk without changing the next repair decisions |
| Permanently close the L0-02 production/staging test path | Keep a dormant runner or require another approval | Jen explicitly questioned its necessity and directed the documentation to prevent recurrence |
| Start L0-04 before L0-03 | Permission migration first or containment first | L0-04 is code-only and reversible; L0-03 production repair still requires restore-tested backup evidence |
| Use scoped server-side guards for L0-04 | Global maintenance mode or immediate full credit implementation | Scoped guards contain stale sales and provider-cost bypasses without taking down unrelated features or implementing later packets early |
| Do not mutate external systems during initial L0-04 implementation | Change Stripe products, Vercel variables, Supabase, or deploy immediately | The packet can be implemented and verified locally first; exact external mutations require explicit approval |

## Pending Work

## Immediate Next Steps

1. Read this handoff, the canonical tracker, the accepted L0-02 report, and the L0-04 row; then mark only `LEAN-L0-04` as `in_progress` in the tracker.
2. Inventory every customer-callable Checkout, AI, image, and provider-cost route. Classify each as stale sale, unmetered bypass, already admin/service-only, or out of scope. Do not disable routes merely because their filename contains `generate`.
3. Add a small centralized, server-only, default-closed availability guard. Apply it before side effects in stale Checkout and confirmed customer-accessible unmetered routes. Return a consistent safe response and avoid leaking configuration details.
4. Add focused source/unit tests proving disabled routes fail before Stripe/provider/database calls and that unsupported or unknown Checkout prices cannot be sold.
5. Run relevant tests, lint/type/build checks in proportion to the changes. Update the tracker and create dated L0-04 evidence only after acceptance criteria are actually verified.

## Blockers/Open Questions

- [ ] Determine the exact active route set and callers before editing; the initial inventory is deliberately conservative.
- [ ] Decide the names and enablement semantics of server-only guard variables during implementation. Default must remain closed, and no production environment change is authorized in this handoff.
- [ ] Determine whether admin/service-only generators need explicit exemption or can remain untouched.

No staging environment, Docker stack, production database connection, Stripe dashboard access, or Vercel mutation is required to begin L0-04.

## Deferred Items

- `LEAN-L0-03`: permission and policy repair; do not execute against production until a fresh logical backup has a recorded hash, restricted location, and successful restore evidence.
- Final lean membership pricing, Checkout allowlists, webhook authority, credit ledger, metering, entitlements, and top-up behavior belong to later packets.
- Stripe product archival, Vercel environment changes, deployment, and production smoke tests require their appropriate later packet and explicit external-mutation approval.
- Do not repair the 37 L0-02 failures as part of L0-04 unless a change is strictly necessary for the route containment acceptance criteria.

## Context for Resuming Agent

## Important Context

The most important constraint is that **L0-02 is complete and its production/staging test path is permanently retired**. Do not re-open the question, restore staging, reset a database password, build a Management API workaround, or ask Jen to approve another adversarial production test. The one approved connection attempt never reached SQL and caused no production read or mutation. Docker was used for local evidence and a transient client only; it is now off because L0-04 does not need it.

L0-04 should contain unsafe commercial and provider-cost entry points with reversible application code. It should not become a full membership implementation. For Checkout, fail closed before Stripe client use, customer creation, or user-row updates. For generation routes, inspect actual caller/access patterns and guard confirmed customer-accessible unmetered paths before any provider call or expensive work. Preserve unrelated functionality and use tests to prove ordering.

The worktree is dirty and contains user-owned untracked files, including screenshots and planning documents. Preserve all unrelated changes. Do not reset, clean, stage, commit, or publish unless Jen asks.

Recommended resume prompt:

> Resume from `.claude/handoffs/2026-08-06-190612-lean-membership-l0-04-ready.md` and begin `LEAN-L0-04`. Keep L0-02 accepted and permanently retire further production/staging adversarial probing. Implement reversible fail-closed application guards for stale Checkout and customer-accessible unmetered generation routes; do not change Stripe, Supabase, Vercel, or production state without my explicit approval.

## Assumptions Made

- Jen's instruction to update the project so "we don't do that anymore" applies to all further L0-02 staging/production adversarial probing, not to later purpose-built production verification packets with separate safety requirements.
- L0-04 can begin and be substantially verified with application code and local static/test tooling, without Docker or an active staging project.
- An endpoint is not automatically unsafe solely because it performs generation; its caller, authentication, authorization, metering, and side-effect order must be inspected.
- No external system mutation is authorized by this handoff.

## Potential Gotchas

- The old L0-02 handoff contains historical production-probe instructions below its superseded notice. Treat them as archival only.
- The retired production proposal contains the former test design for audit history. Its opening and final disposition are controlling: do not execute it.
- `NEXT_PUBLIC_MAINTENANCE_MODE` is broad and public-facing. It is not the desired authority boundary for L0-04.
- `NEXT_PUBLIC_STRIPE_PRICE_ID_*` variables and caller-supplied `priceId` values are not a trusted lean-membership offer allowlist.
- The Checkout route currently may create/verify Stripe customers and update `users.stripe_customer_id`; guard placement must precede all of those effects.
- Legacy rate limiting does not satisfy membership authorization or credit metering.
- Do not count L0-04's 3 points until its acceptance evidence is complete. When completed, the projected total will be 8/114 points (7.0%).
- Path inventories can drift; verify files with `rg --files` before implementing. One earlier inventory referred to `api/metadata/extract`; the active tree may instead use a different metadata path.

## Environment State

## Tools/Services Used

- Local Supabase CLI and Docker Desktop were used for the accepted L0-02 harness only; both are stopped.
- A cached `psql` client was used for the approved connection attempt, which failed before SQL authentication completed.
- No production, staging, Stripe, Vercel, or Supabase mutation was performed during the accepted baseline.

## Active Processes

- No local Supabase containers are running.
- Docker Desktop is shut down.
- No development server or other task-specific background process should be assumed running.

## Environment Variables

Relevant names to inspect, never values:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT`
- `NEXT_PUBLIC_MAINTENANCE_MODE`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Provider-key names referenced by confirmed target routes
- New L0-04 server-only availability flags, once selected

Do not record values in source, reports, terminal summaries, or handoffs.

## Related Resources

- [Membership implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Accepted L0-01 preflight](../../docs/audits/lean-l0-01-read-only-preflight-2026-08-06.md)
- [Accepted L0-02 authorization baseline](../../docs/audits/lean-l0-02-authorization-baseline-2026-08-06.md)
- [Retired production rollback proposal](../../docs/audits/lean-l0-02-production-rollback-test-review-2026-08-06.md)
- [Lean membership launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [Membership credits development plan](../../docs/planning/prismarium-membership-credits-development-plan-2026-08-06.md)
- [L0-02 SQL suite](../../app/tests/sql/lean-l0-02-authorization-baseline.sql)
- [L0-02 local runner](../../app/scripts/run-lean-l0-02-baseline.ps1)

---

**Security reminder:** This handoff must pass `validate_handoff.py` before use. It contains environment variable names only, never credentials or values.
