# Handoff: Lean Membership L2-06 locally verified; live Both gate approval required

## Session Metadata

- Created: 2026-08-11 15:38:51 America/New_York
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `agent/lean-membership-l0-l1`
- HEAD: `5191f12` (`Record lean membership plans and verification`)
- Milestone interval: multi-session Lean Membership continuation through August 11, 2026; exact duration not recorded

## Recent Commits (for context)

- `5191f12` Record lean membership plans and verification
- `30e129f` Persist PRE learner progress and Journal work
- `850049d` Contain commercial actions and restore server authority
- `0b80730` Refresh Prismarium repository guidance
- `e73061e` Make course preview source assertions formatting-agnostic

## Handoff Chain

- **Continues from**: [2026-08-10-214941-lean-membership-l1-02-complete-l1-03-ready.md](./2026-08-10-214941-lean-membership-l1-02-complete-l1-03-ready.md)
- **Supersedes**: the previous handoff's L1-03-ready state. Retain the earlier file for the L0/L1 context chain.

## Current State Summary

Prismarium Lean Membership Phases L0 and L1 are complete. `LEAN-L2-01` through `LEAN-L2-05` are complete, and `LEAN-L2-06` has passed its local implementation, mocked Stripe, rollback-only PostgreSQL, static, and build verification. It intentionally remains `verifying`, worth no points yet, because its external `Both` gate requires separately approved live Stripe Portal-configuration and exact customer/Subscription agreement evidence. The tracker therefore remains at **48/114 verified points (42.1%)**, with Phase L2 at **19/22**. Every paid offer, Checkout UI, billing operation, member-course release, membership grant, and metered action remains default closed. The worktree contains substantial uncommitted membership work plus pre-existing course-parser changes; preserve it all. No commit, push, deployment, remote migration, production mutation, new Stripe access, or environment-variable change was performed while completing L2-06 locally.

## Codebase Understanding

## Architecture Overview

- `membership-catalog.server.ts` is the server-owned source of truth for plans, offers, exact Stripe Price mappings, launch gates, and released paid-course slugs. Client input never selects a raw Price ID or amount.
- `billing_memberships` is the service-owned membership projection. Browser-facing paths receive safe plan/status summaries, not raw Stripe Customer, Subscription, or Price identifiers.
- Checkout accepts only an offer code and stable request ID, resolves the Price server-side, rejects existing paid members, and uses a service-only request ledger plus Stripe idempotency.
- The webhook route verifies the raw Stripe signature and account mode before database authority. A privacy-minimized event inbox and ordered atomic projector handle replay, delay, conflict, quarantine, cancellation, and database failure.
- The L2-06 billing summary reads the authenticated user's projection only. Reconciliation retrieves only the exact Subscription already bound to that user's service-owned row; it never searches by email or selects the first Customer/Checkout Session/Subscription.
- The Portal path has a separate billing-operations gate and requires one named Portal configuration. The implementation accepts only payment-method updates, invoice history, and cancellation; plan switching, profile changes, and subscription pause must remain disabled.
- The four L2 migrations are additive and ordered: membership authority, Checkout ledger, webhook inbox/projector, then billing reconciliation/lifecycle ordering. They have been tested only against local Supabase and have not been remotely applied.
- Paid access fails closed. Unknown Prices, identity mismatch, malformed snapshots, and ambiguous state quarantine or hold rather than grant access.

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `docs/planning/prismarium-membership-implementation-tracker.md` | Status, scoring, gates, and acceptance source of truth | Records 48/114, L2-06 `verifying`, and the exact next gate |
| `docs/audits/lean-l2-06-billing-lifecycle-local-2026-08-11.md` | Local L2-06 evidence | Primary resume document after this handoff |
| `app/src/lib/membership/membership-billing.server.ts` | Safe billing summary, exact reconciliation, Portal contract | Core L2-06 server authority |
| `app/src/app/api/membership/billing-summary/route.ts` | No-ID authenticated billing summary | Browser-safe read boundary |
| `app/src/app/api/stripe/create-portal-session/route.ts` | Gated, named-configuration Portal session path | Must stay closed until a separately approved operational step |
| `app/src/app/api/stripe/sync-subscription/route.ts` | Exact customer-scoped Subscription reconciliation | Replaces the unsafe legacy email/session fallback |
| `app/src/lib/membership/membership-webhook.server.ts` | Shared Stripe snapshot normalization and ordered projection | Keeps webhook and reconcile meanings aligned |
| `app/src/app/api/stripe/webhook/route.ts` | Raw signed event ingestion | L2-05 authority reused by L2-06 |
| `supabase/migrations/20260811230000_lean_l2_06_billing_lifecycle.sql` | Service-only reconcile ledger, ordering floor, Journal-cap authority | Local-only forward migration; never broad-push |
| `app/tests/membership-billing-lifecycle.test.ts` | L2-06 source and mocked boundary proof | Includes gate, Portal, reconcile, lifecycle, and no-ID checks |
| `app/tests/sql/lean-l2-06-billing-lifecycle.sql` | Transactional database story | Proves 12 authority/lifecycle/Journal boundaries and zero residue |
| `app/scripts/run-lean-l2-06-billing.ps1` | Safe local SQL runner | Use only with the local target unless scope is explicitly changed and approved |
| `app/src/lib/membership/membership-catalog.server.ts` | Server-owned offer/catalog authority | All paid and metered behavior defaults closed |
| `app/src/lib/membership/membership-entitlement-resolver.server.ts` | Server entitlement resolution | Reader fallback and quarantine behavior |
| `app/src/lib/membership/membership-checkout.server.ts` | Checkout authorization and idempotency | Completed L2-04 dependency |
| `supabase/migrations/20260811200000_lean_l2_02_billing_memberships.sql` | Membership projection authority | Local-only L2-02 migration |
| `supabase/migrations/20260811210000_lean_l2_04_checkout_requests.sql` | Checkout request ledger | Local-only L2-04 migration |
| `supabase/migrations/20260811220000_lean_l2_05_webhook_inbox_projector.sql` | Webhook inbox and projector | Local-only L2-05 migration |

## Key Patterns Discovered

- Authenticate before database/service-client or Stripe work, and check the relevant server-only feature gate before authentication when the whole operation must be globally closed.
- Never return raw billing identifiers to the browser or write them into privacy-safe evidence.
- Treat exact configured Price IDs as the only paid-plan normalization authority. Metadata, amount, name, and email are not entitlement authority.
- Bind reconciliation to the exact stored Customer and Subscription for the authenticated user. Identity or catalog ambiguity must hold/quarantine, never grant.
- Preserve event ordering with a reconciliation event-time floor so a delayed webhook cannot overwrite a newer exact retrieval.
- Use service-only atomic RPCs with forced RLS and revoked customer writes for billing state and idempotency ledgers.
- Keep application activation, environment configuration, deployment, remote migration, production verification, and sales activation as separate approval gates.
- Journal downgrade behavior is lossless: Reader users over the 50-active-page cap retain read/edit/archive access but cannot create or restore until below the cap.

## Work Completed

## Tasks Finished

- [x] Completed `LEAN-L2-01`: typed server-owned membership catalog, safe client projection, default-closed offers/actions/courses, dev inspection page, tests, and evidence.
- [x] Completed `LEAN-L2-02`: service-owned billing membership projection, entitlement resolver, RLS/RPC migration, rollback-only SQL proof, and evidence.
- [x] Completed `LEAN-L2-03` under earlier exact approvals: privacy-safe live catalog verification, reuse of the intended founding Price, creation of only the missing monthly Prices, and four server-only production mappings. Those approvals are exhausted and authorize no further Stripe or environment action.
- [x] Completed `LEAN-L2-04`: server-authoritative Checkout contract and idempotent request ledger, with mocked and local SQL verification.
- [x] Completed `LEAN-L2-05`: raw-signature webhook inbox and ordered membership projector, with duplicate/stale/conflict/quarantine/cancellation/rollback proof.
- [x] Implemented `LEAN-L2-06` locally: no-ID billing summary, named/configuration-checked Portal contract, exact stored-Subscription reconciliation, service-only ledger, delayed-webhook floor, founding renewal/cancel/reactivate/terminal behavior, and no-loss Reader Journal transition.
- [x] Passed the combined focused suite: **62/62 tests**.
- [x] Passed L2-06 rollback-only local SQL: **12/12 boundaries**, **0 fixture residue**.
- [x] Passed focused ESLint, `tsc --noEmit`, `git diff --check`, and the production-style Next.js build at **138/138 pages**.
- [x] Stopped the temporary local Supabase stack and restored its temporary port override exactly.
- [x] Updated the launch plan, tracker, L2-06 evidence, and this handoff without committing.

## Files Modified or Added

| File/group | Changes | Rationale |
|------------|---------|-----------|
| `app/src/lib/membership/` | Added catalog, entitlement, Checkout, webhook, and billing authorities | Centralize server-only membership semantics and fail-closed gates |
| `app/src/app/api/membership/` | Added catalog and billing-summary routes | Expose privacy-safe client reads only |
| `app/src/app/api/stripe/create-checkout-session/route.ts` | Replaced client-selected billing behavior with the offer/request contract | Prevent Price/amount forgery and duplicate subscriptions |
| `app/src/app/api/stripe/create-portal-session/route.ts` | Added exact billing gate and Portal configuration validation | Keep plan switching and unsafe Portal features closed |
| `app/src/app/api/stripe/sync-subscription/route.ts` | Replaced email/session enumeration with exact stored-Subscription reconciliation | Remove ambiguous and unsafe grant paths |
| `app/src/app/api/stripe/webhook/route.ts` | Connected verified raw events to the service-owned projector | Make Stripe events idempotent and ordered |
| `app/src/components/SubscriptionTab.tsx` | Removed legacy client billing authority and unsafe sync behavior | Keep the browser from granting or inferring paid state |
| `app/src/components/membership/MembershipAvailability.tsx` and `app/src/app/dev/membership-catalog/page.tsx` | Added safe catalog visibility and dev inspection UI | Verify packaging without activating sales |
| `app/src/lib/supabase/service.ts`, `app/src/middleware.ts` | Hardened server authority and routing for new boundaries | Preserve service-only access and expected route behavior |
| `app/.env.example` | Documented closed-by-default membership variable names and empty mappings | Make safe configuration intent explicit; no real environment was changed in L2-06 |
| `app/package.json` | Added focused membership and local SQL scripts | Make verification repeatable |
| `app/scripts/configure-stripe-membership-prices.ts` | Added the earlier approval-scoped catalog configurator | **Mutates Stripe; do not run without new exact approval** |
| `app/scripts/verify-stripe-prices.ts` | Replaced unsafe verifier with privacy-safe exact catalog checks | **Reads live Stripe; do not run without new exact approval** |
| `app/scripts/run-lean-l2-02-membership.ps1` through `run-lean-l2-06-billing.ps1` | Added local migration/test runners | Reproducible rollback-only database stories |
| `app/tests/membership-*.test.ts`, `app/tests/stripe-*.test.ts` | Added focused server, lifecycle, and configuration tests | Prove fail-closed application behavior |
| `app/tests/sql/lean-l2-*.sql`, `app/tests/sql/README.md` | Added rollback-only SQL acceptance stories | Prove database authority with zero residue |
| `supabase/migrations/20260811200000_*.sql` through `20260811230000_*.sql` | Added four forward L2 migrations | Build the local service-owned billing model |
| `docs/audits/lean-l2-*.md` and L2-01 screenshot | Added privacy-safe evidence for L2-01 through L2-06 | Preserve exact results, boundaries, and limitations |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` and tracker | Advanced local implementation status | Keep operational and engineering gates explicit |
| `app/src/lib/parsers/course-markdown-parser.ts`, `app/tests/course-parser-v2.test.ts` | Pre-existing course-parser work remains modified | User work outside L2; preserve and do not overwrite |

The worktree is intentionally dirty. Run `git status --short` on resume and preserve all modified and untracked files. Do not stage, commit, clean, restore, or overwrite anything without an explicit user request.

## Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Leave L2-06 `verifying` with zero points | Mark local work done vs honor the external `Both` gate | Live Portal and customer agreement have not been approved or proven |
| Keep paid behavior default closed | Enable locally verified paths vs require independent operational approvals | Local correctness is not launch authorization |
| Require a named safe Portal configuration | Use Stripe's default configuration vs inspect one exact configuration | The lean product permits invoices, payment methods, and cancellation only; plan switching must be impossible |
| Reconcile one exact stored Subscription | Search by email/list sessions vs use the service-owned binding | Avoids cross-customer, stale, and first-result ambiguity |
| Share strict snapshot normalization across webhook and reconcile | Duplicate logic vs one exact catalog/status model | Prevents webhook/reconcile disagreement |
| Retain Journal content on downgrade | Delete/archive excess pages vs restrict only new active pages | Membership loss must never destroy learner work |
| Do not exercise the production reconcile route for a read-only gate | Invoke a write-producing reconcile RPC vs compare exact Stripe and database state read-only | The user's current boundary forbids production mutation; any write needs separate exact approval |

## Pending Work

## Immediate Next Steps

1. Resume by reading this handoff, the linked prior handoff as needed, the tracker, and the L2-06 evidence. Confirm the directory, branch, `HEAD`, and full dirty worktree before any edit.
2. Do **not** access Stripe yet. Prepare a narrow read-only L2-06 verification plan naming the exact Stripe mode/account, exact Portal configuration, authorized Customer/Subscription scope, database read scope, privacy-safe evidence fields, and commands/tools. Do not create a Portal Session or invoke the production reconciliation route.
3. Ask Jen for exact approval of that read-only plan. Approval must explicitly cover the intended live Stripe Portal-configuration read and the exact customer/Subscription plus database-state reads. Do not infer permission from any earlier L2-03 approval.
4. If exact approval is granted, execute only the approved reads. Verify payment methods enabled, invoice history enabled, cancellation enabled, plan switching disabled, customer-profile changes disabled/not enabled, subscription pause disabled/not enabled, and exact Stripe/database state agreement. Record fingerprints or safe descriptions, never raw identifiers.
5. If all external evidence passes, mark `LEAN-L2-06` `done`, award 3 points, update Phase L2 to **22/22**, and update total progress to **51/114 (44.7%)**. If any mismatch or ambiguity appears, leave it `verifying` or mark it blocked and keep every paid gate closed.
6. After closing L2-06, begin `LEAN-L3-01` locally: account, grant, reservation, transaction, and usage schema. Add no pack, rollover, or debt machinery.

## Blockers/Open Questions

- [ ] **Blocking external completion:** no current exact approval exists for live Stripe Portal, Customer, Subscription, or production database access. The next agent must first draft the exact read-only scope and receive approval.
- [ ] **Target identity:** the exact authorized test Customer/Subscription and exact Portal configuration must be established without exposing raw identifiers in chat, docs, logs, or evidence.
- [ ] **Production writes remain prohibited:** the application reconciliation route records service-owned state, so it must not be exercised against production under a read-only approval.

## Deferred Items

- Deployment, remote migration, environment configuration, webhook configuration, Portal configuration mutation, production testing, Checkout UI enablement, paid sales activation, member-course release, membership grants, and metered actions all require separate exact approvals.
- `LEAN-L3-01` and later monthly-credit packets remain local future work until the L2-06 gate is resolved in the recommended sequence.
- Commit, push, PR publication, and release work remain unrequested and prohibited for this continuation.

## Context for Resuming Agent

## Important Context

- The user's standing instruction is: inspect and preserve all uncommitted work; keep paid features default closed; do not commit, push, deploy, run remote migrations, modify production, touch Stripe, or change environment variables without exact approval.
- **No approval is active.** Earlier L2-03 approvals were narrow, completed, and exhausted. They do not authorize new Stripe reads, Stripe writes, environment access/changes, deployment, or production work.
- Current score is **48/114 (42.1%)**. Phase L2 is **19/22**. L2-06 is `verifying`, not `done`, despite all local checks passing.
- The remaining L2-06 gate can begin with a proposed read-only scope, but no external call may occur until the user approves the exact targets and operations.
- All paid features remain closed by configuration and server checks. Do not weaken those gates for testing.
- The branch and all membership changes are uncommitted. The worktree also contains user-owned course-parser changes. Never use reset, checkout/restore, clean, or broad formatting against it.
- The local database proof was rollback-only and left zero fixture residue. All four L2 migrations remain unapplied remotely.
- Local L2-06 evidence passed 62/62 focused tests, 12/12 SQL boundaries, lint, TypeScript, diff checks, and a 138/138-page build.
- No new Stripe/customer/Portal access occurred during L2-06. No Portal Session was created. No production state or real environment variable was changed.

## Assumptions Made

- A read-only comparison of one explicitly authorized Stripe Subscription against its exact service-owned database row can satisfy the live agreement portion without invoking the production write path; if the tracker owner requires a production write-path exercise, that would need a new and more expansive exact approval.
- The intended Portal configuration can be verified by reading its feature settings; mutation and Portal Session creation are not necessary for the current evidence gate.
- The existing local mocked/service/SQL verification is sufficient for application behavior; only the external agreement remains.
- L3-01 should follow L2-06 closure even though its direct tracker dependency is L2-02, because finishing the phase gate keeps the implementation sequence easy to audit.

## Potential Gotchas

- `app/scripts/configure-stripe-membership-prices.ts` performs Stripe mutations. Never run it under a read-only approval.
- `app/scripts/verify-stripe-prices.ts` accesses live Stripe even though it is privacy-safe. It still requires exact approval.
- `sync-subscription` is no longer the legacy email fallback, but its production path can write a reconciliation ledger/projection. Do not call it when only reads are approved.
- Do not confuse the prior successful L2-03 live catalog work with permission to inspect customers or subscriptions; L2-03 evidence explicitly excluded them.
- Do not put raw Stripe Customer, Subscription, Price, Portal configuration, event, or account identifiers in committed evidence. Prefer counts, booleans, last-four-style fingerprints, or hashes where useful.
- Windows reserves ports `54255-54354`, overlapping normal local Supabase ports. The prior test temporarily used a safe `5702x` override, then restored `supabase/config.toml` exactly. Recheck before and after any future local stack use.
- The first Next build hit a three-minute command cap during static generation; the same build passed with a longer timeout. Existing non-blocking warnings concern middleware naming, Sentry client configuration, baseline-browser data, and known static-generation cookie fallbacks.
- Git may warn that `C:\Users\Jen_a\.config\git\ignore` is inaccessible in the sandbox. This did not invalidate status/diff results.

## Environment State

## Tools/Services Used

- Node/`tsx` test runner, ESLint, TypeScript, and Next.js production build for local application verification.
- Local Docker/Supabase PostgreSQL for rollback-only RLS/RPC/lifecycle integration tests.
- Git read-only status/diff checks to protect the dirty worktree.
- Earlier, separately approved L2-03 work used live Stripe catalog reads/mutations and production Vercel environment mappings. That scope is closed; do not repeat it.

## Active Processes

- The temporary local Supabase stack used for L2-06 is stopped.
- No membership test runner, development server, build, migration, or Stripe process is intentionally left running.
- `supabase/config.toml` was restored after the temporary local port override.

## Environment Variables

Relevant names only; no values are included:

- `PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED`
- `PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS`
- `PRISMARIUM_ENABLED_METERED_ACTIONS`
- `PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS`
- `PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG`
- `PRISMARIUM_ADEPT_LAUNCH_DECISION`
- `PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY`
- `PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY`
- `PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY`
- `PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY`
- `PRISMARIUM_BILLING_OPERATIONS_ENABLED`
- `PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

No environment variable was changed while implementing L2-06. Do not read or change remote environment configuration without the user's exact approval.

## Related Resources

- [Membership implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Lean Membership launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [L2-06 local billing lifecycle evidence](../../docs/audits/lean-l2-06-billing-lifecycle-local-2026-08-11.md)
- [L2-05 local webhook evidence](../../docs/audits/lean-l2-05-webhook-projector-local-2026-08-11.md)
- [L2-04 local Checkout evidence](../../docs/audits/lean-l2-04-checkout-idempotency-local-2026-08-11.md)
- [L2-03 privacy-safe live catalog evidence](../../docs/audits/lean-l2-03-stripe-catalog-live-2026-08-11.md)
- [L2-02 local membership authority evidence](../../docs/audits/lean-l2-02-membership-entitlement-local-2026-08-11.md)
- [L2-01 local catalog evidence](../../docs/audits/lean-l2-01-membership-catalog-local-2026-08-11.md)
- [Previous handoff](./2026-08-10-214941-lean-membership-l1-02-complete-l1-03-ready.md)

---

**Security Reminder**: This handoff must pass the session-handoff validator before use.
