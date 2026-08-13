# LEAN-L2-05 service-owned webhook inbox and membership projector

**Evidence date:** August 11, 2026  
**Scope:** Local application, forward migration, and rollback-only local Supabase verification  
**Result:** PASS — signed-event ingestion and ordered membership projection are locally complete and operationally closed  
**Packet state:** `done`; 5 points earned

## Outcome

The Stripe webhook route now reads the exact raw request body, requires the `Stripe-Signature` header, verifies it with Stripe's server library, and rejects live/test mode mismatches before creating any database authority. It does not parse customer JSON, trust browser input, retrieve follow-up Stripe objects, or mutate legacy `users` billing fields.

Verified subscription-created, subscription-updated, and subscription-deleted events pass through a narrow server-only normalizer. One exact configured Price must resolve to one catalog offer. Invalid identity, unknown Price, ambiguous items, metadata mismatch, unsupported status, non-unit quantity, or invalid period becomes a quarantine input rather than a paid plan. Unsupported event types receive an explicit ignored disposition.

## Atomic inbox and projector

Migration `20260811220000_lean_l2_05_webhook_inbox_projector.sql` adds:

- forced-RLS `billing_webhook_events`, with no customer policies and service-role-only authority;
- immutable Stripe event identity plus an exact raw-payload SHA-256 hash, without storing the raw payload or signature;
- explicit processed, quarantined, ignored, and stale outcomes plus delivery counts;
- last-applied Stripe event identity and timestamp on `billing_memberships`;
- one security-definer service RPC that records the inbox result and applies the membership projection in the same transaction;
- transaction-scoped per-user serialization before first-row creation and membership row locking thereafter.

Exact duplicate delivery increments its delivery count without applying state twice. A reused event ID with a different payload hash places the affected membership on hold. An older event is recorded stale and cannot overwrite newer state. Distinct events with the same Stripe timestamp are conservatively quarantined and held because their order cannot be proven. Active or uncertain membership state also cannot be silently rebound to a different Customer or parallel Subscription. A later valid event can clear the hold. Database failure rolls back both inbox insertion and projection so the route returns `500` and Stripe can retry instead of receiving false success.

Created/updated subscription state preserves exact plan, offer, pricing cohort, Stripe status, Customer/Subscription references, period boundaries, and cancel-at-period-end. Unknown or malformed state writes only an unknown held projection when the user can be safely resolved. Terminal cancellation retains the exact known offer/cohort for billing history but never grants paid entitlement because the entitlement resolver accepts only current active/trialing state with a valid future access window and no hold.

## Verification

| Check | Result |
|---|---:|
| Webhook normalization, mode, hashing, route-order, and database-failure contract | 8/8 pass |
| Membership catalog tests | 8/8 pass |
| Membership entitlement tests | 7/7 pass |
| Checkout authority/idempotency tests | 9/9 pass |
| Commercial containment tests | 8/8 pass |
| Server-authority tests | 4/4 pass |
| Stripe read-only catalog verifier tests | 6/6 pass |
| Stripe Price configuration tests | 3/3 pass |
| Focused Node total | 53/53 pass |
| Local SQL authorization/replay/ordering/quarantine/rollback story | 14/14 boundaries; PASS |
| Local SQL fixture residue | 0 |
| Focused ESLint | Pass |
| TypeScript `tsc --noEmit` | Pass |
| `git diff --check` | Pass |
| Next.js production build | Pass; 137/137 pages |

The build retained existing non-blocking warnings for middleware naming, Sentry client configuration, baseline-browser data, and known static-generation cookie fallbacks.

## Operational closure and rollback

No Stripe API call, webhook endpoint creation, Customer/Subscription access, remote migration, database connection, environment change, deployment, commit, push, course release, paid-sales flag, or production state change occurred. The local Supabase stack was stopped, the temporary Windows port override was restored, and the rollback-only database story left zero fixture residue.

Paid behavior remains default closed behind the existing catalog, course-release, offer, action, and cost gates. Application rollback is the webhook route/normalizer revert. The additive inbox and ordering columns can remain inert while no compatible route is deployed; a database reversal is not required for operational closure. Any deployment, remote migration, webhook configuration, or sales activation requires separate exact approval.

`LEAN-L2-06` still owns billing summary, customer portal, reconciliation, renewal, cancellation/refund correction, and the complete monthly lifecycle gate. No local result here establishes production readiness or authorizes public paid sales.
