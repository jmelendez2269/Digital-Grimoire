# LEAN-L2-04 server-authoritative Checkout and idempotency

**Evidence date:** August 11, 2026  
**Scope:** Local application, forward migration, and rollback-only local Supabase verification  
**Result:** PASS — server-authoritative Checkout is locally complete and remains operationally closed  
**Packet state:** `done`; 3 points earned

## Outcome

The Checkout route now accepts exactly two customer fields: a known membership `offerCode` and a UUIDv4 `requestId`. Price ID, amount, tier, mode, Customer ID, and subscription authority are never accepted from the browser. The server resolves the offer through the L2 catalog, requires the offer to pass every paid-launch gate, verifies its exact server-only Price mapping without ambiguity, and retains the independent L0 commercial-action and Price-allowlist kill switches.

The route authenticates the user, checks the service-owned `billing_memberships` projection, and blocks active, trialing, incomplete, delinquent, paused, unpaid, held, unknown, or malformed state before creating a Checkout Session. A terminal canceled or expired paid projection may reuse its known Stripe Customer. A new Reader does not create a Customer directly; Stripe Checkout creates it only if the customer proceeds with the subscription.

## Idempotency contract

Each authenticated user and request ID has one service-owned ledger identity. The request fingerprint binds catalog version, user, request ID, offer, and exact Price. Reuse with different authority returns a conflict. Exact completed replay returns the retained Session and URL without a new Stripe call.

New Checkout Sessions receive a deterministic SHA-256-based Stripe idempotency key. This follows Stripe's documented behavior that identical POST retries return the original result, while the durable database ledger preserves the application's completed replay identity beyond Stripe's idempotency-key retention window. Concurrent completion accepts only the exact same fingerprint, Session ID, and Checkout URL.

The Checkout Session is always `subscription` mode with one server-resolved Price and quantity one. Session and Subscription metadata carry the authenticated user ID, exact offer code, and request ID for later signed-webhook reconciliation. Success return state does not grant membership.

## Database boundary

Migration `20260811210000_lean_l2_04_checkout_requests.sql` adds `billing_checkout_requests` with:

- primary key `(user_id, request_id)`;
- constrained offer, SHA-256 fingerprint, and `pending`/`session_created` state;
- unique non-null Stripe Checkout Session identity;
- complete-or-pending consistency checks;
- forced RLS, no customer policies, revoked `anon`/`authenticated` privileges, and service-role-only CRUD.

The ledger contains no entitlement authority and cannot create a `billing_memberships` row.

## Verification

| Check | Result |
|---|---:|
| Checkout contract/adversarial/replay tests | 9/9 pass |
| Membership catalog tests | 8/8 pass |
| Membership entitlement tests | 7/7 pass |
| Commercial containment tests | 8/8 pass |
| Server-authority tests | 4/4 pass |
| Stripe catalog verifier tests | 6/6 pass |
| Focused Node total | 42/42 pass |
| Local SQL authorization/idempotency story | 10/10 boundaries; PASS |
| Local SQL fixture residue | 0 |
| Focused ESLint | Pass |
| TypeScript `tsc --noEmit` | Pass |
| `git diff --check` | Pass |
| Next.js production build | Pass; 137/137 pages |

The build retained existing non-blocking warnings for middleware naming, Sentry client configuration, baseline-browser data, and known static-generation cookie fallbacks.

## Operational closure and rollback

No real Stripe Checkout Session, Customer, or Subscription was created or inspected. No remote migration, database connection, environment change, deployment, commit, push, course release, paid-sales flag, or production state change occurred. The local Supabase stack was stopped, its temporary Windows port override was restored, and the rollback-only test left zero fixture residue.

The customer UI remains intentionally unwired. Checkout still requires all of the following server configuration to agree: the L0 `checkout` action token, exact L0 Price allowlist, L2 paid-sales flag, exact enabled offer, valid initial course release, exact server Price mapping, and Adept cost decision where applicable. Missing or conflicting configuration stops before authentication, database mutation, or Stripe.

Application rollback is the route/orchestrator revert. The additive ledger can remain inert with all sales gates closed. Remote deployment and migration require separate approval. Signed webhook projection belongs to `LEAN-L2-05`; portal, reconciliation, and monthly lifecycle proof belong to `LEAN-L2-06`.
