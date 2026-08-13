# LEAN-L2-06 billing lifecycle local verification

**Evidence date:** August 11, 2026  
**Scope:** Local application, forward migration, mocked Stripe boundaries, and rollback-only local Supabase verification  
**Result:** PASS — local implementation and lifecycle boundaries are verified; live Stripe Portal configuration and real-customer agreement remain unverified  
**Packet state:** `verifying`; 0 points earned until the external `Both` gate is approved and satisfied

## Outcome

The billing summary now reads only the authenticated user's service-owned `billing_memberships` row and returns a no-store safe projection. Raw Customer, Subscription, and Price identifiers never enter the response. A missing row remains Reader; malformed or held state fails closed.

The legacy fallback sync no longer searches Stripe by email, enumerates Checkout Sessions, chooses the first Subscription, or writes legacy `users` billing columns. Reconciliation can retrieve only the exact Subscription already bound to the authenticated user's service-owned row. Exact catalog normalization is shared with the signed webhook path. Unknown Price, user mismatch, identity mismatch, malformed period, and other ambiguous state quarantine instead of granting access.

The portal path now requires an exact server-only billing-operations gate and a named Stripe Portal configuration. It retrieves that configuration before creating a session and requires:

- payment-method updates enabled;
- invoice history enabled;
- cancellation enabled;
- customer-profile updates and subscription pause not enabled;
- subscription updates/plan switching disabled.

No environment value was added or changed. With absent configuration, portal and reconciliation stop before authentication, database access, or Stripe access.

## Lifecycle and ordering

Migration `20260811230000_lean_l2_06_billing_lifecycle.sql` adds a forced-RLS, service-only reconciliation request ledger and one atomic snapshot reconciliation RPC. A successful exact Subscription retrieval records a reconciliation event-time floor. Delayed webhook events at or below that floor are recorded stale and cannot overwrite the newer retrieved state; existing event IDs still pass through the L2-05 core so duplicate and payload-conflict behavior is preserved.

The exact founding Price continues to normalize as `student_founding_monthly`, `student`, and `founding` across renewal. Active `cancel_at_period_end=true` retains paid entitlement through the existing period. A pre-terminal reactivation returns it to `false` without changing the founding cohort. Terminal `canceled` state retains billing history but cannot grant paid entitlement.

Non-subscription refund events are explicitly ignored and cannot directly grant or revoke a plan. Any resulting correction is taken only from a later exact Subscription event or the exact customer-scoped Subscription reconciliation; invalid correction snapshots place the existing projection on hold.

The Reader Journal-cap trigger now consumes the same server-owned `billing_memberships` authority as course entitlement. Terminal cancellation does not delete or archive a Journal page. An account returning to Reader above 50 active pages can read, edit, and archive its existing pages, cannot create or restore another active page while at or above 50, and can create again only after archiving below 50.

## Verification

| Check | Result |
|---|---:|
| Catalog, entitlement, Checkout, webhook, billing lifecycle, containment, authority, and Stripe catalog/configuration tests | 62/62 pass |
| L2-06 billing lifecycle unit/source tests | 8/8 pass |
| Local SQL reconciliation/lifecycle/Journal/rollback story | 12/12 boundaries; PASS |
| Local SQL fixture residue | 0 |
| Focused ESLint | Pass |
| TypeScript `tsc --noEmit` | Pass |
| `git diff --check` | Pass |
| Next.js production build | Pass; 138/138 pages |

The first build attempt reached static generation but exceeded its three-minute command cap; the same build completed cleanly with a longer local timeout. Existing non-blocking warnings remained for middleware naming, Sentry client configuration, baseline-browser data, and known static-generation cookie fallbacks.

## Operational closure, rollback, and remaining gate

No Stripe API call, Customer or Subscription read, Portal configuration read or write, Portal Session creation, remote migration, deployment, environment change, paid sale, Checkout UI, course release, metered action, commit, push, or production mutation occurred. The temporary local Supabase stack was stopped, its port override was fully restored, and the rollback-only database story left zero fixture residue.

Paid behavior remains default closed. Application rollback is the billing summary/portal/reconciliation route and billing-service revert. The additive reconciliation ledger and ordering floor can remain inert while billing operations are disabled; the Journal trigger's server-owned authority is intentionally safer than the legacy `users.subscription_status` check and never mutates saved pages.

The packet remains `verifying`, not `done`. Completion requires separate exact approval before any live Stripe access, followed by privacy-safe proof that the intended Portal configuration disables plan switching and that an authorized customer-scoped reconciliation agrees with live Stripe and database state. Deployment, remote migration, environment configuration, sales activation, and production testing remain separate approval gates.
