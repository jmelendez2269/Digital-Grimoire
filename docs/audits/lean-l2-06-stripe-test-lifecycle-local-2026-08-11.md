# LEAN-L2-06 Stripe test lifecycle evidence — 2026-08-11

**Evidence date:** 2026-08-11  
**Scope:** Local Next.js application, local Supabase, and Stripe test mode only  
**Result:** PASS  
**Packet state:** `done`, accepted by Jen on 2026-08-11

## Outcome

The L2 billing lifecycle was exercised end to end with a dedicated, clearly marked Stripe test Product/Price and a marker-owned local non-admin Reader account. The account remained a regular `user`, password sign-in succeeded, and its privacy-safe marker fingerprint was `449dd46d8048`. No password or raw user, Customer, Subscription, Checkout, Price, Product, or Event identifier is recorded here.

One $15 USD monthly Stripe test Checkout completed through the hosted Checkout page. The application reused the completed session for an identical request instead of creating a second purchase. The browser returned to the local success path and then to sign-in because the browser session was intentionally unauthenticated.

An actual Stripe test `customer.subscription.created` Event was signed with the local endpoint secret and delivered to `/api/stripe/webhook`. The endpoint recorded `processed`, projected the Student founding membership, and the entitlement resolver returned 30 monthly credits plus access to the configured initial Student course.

The test Subscription was then canceled. An actual Stripe test `customer.subscription.deleted` Event was delivered through the same signed local route and recorded `processed`. The database retained the Student/founding/canceled billing history, while effective authority fell back to Reader: paid entitlement was false and the Student course closed. Replaying an already processed Event returned `duplicate_processed` without changing authority.

## Verification

| Boundary | Result |
|---|---|
| Dedicated local account is non-admin and can sign in | PASS |
| Exact $15 monthly test offer creates one hosted Checkout and safely replays | PASS |
| Signed created/deleted Stripe test Events are accepted by the real webhook route | PASS |
| Active verified projection resolves to Student, 30 credits, and the configured Student course | PASS |
| Terminal cancellation preserves billing history and resolves to Reader with paid/course access closed | PASS |
| Focused webhook and billing suites | PASS — 16/16 |
| Focused ESLint, repository TypeScript, and diff validation | PASS |

## Boundaries and cleanup

- No production Supabase, Vercel, Stripe live-mode, deployment, migration, environment, sales flag, course-release flag, or real-user state was read or changed.
- The clearly labeled Stripe test Product/Price remains reusable; the test Subscription is canceled.
- Local Supabase and the reusable non-admin test user were retained. The temporary Next.js server and automated browser were closed.
- This run did not exercise a real Stripe Portal session. The safe Portal configuration contract remains covered by the original [local lifecycle evidence](lean-l2-06-billing-lifecycle-local-2026-08-11.md).

## Acceptance decision

Jen explicitly accepted this combined evidence as completion of `LEAN-L2-06`: the original local contract and lifecycle proof, plus the real Stripe test-mode Checkout, signed webhook, entitlement, cancellation, and Reader-fallback story above.

This acceptance does not mean production billing is deployed or live. The prior [live read-only prerequisite audit](lean-l2-06-live-readonly-2026-08-11.md) and [production canary runbook](lean-l2-production-canary-runbook-2026-08-11.md) remain historical launch-gate evidence. Production deployment/migrations, the named live Portal configuration, an eligible non-admin production canary, and live paid activation are deferred to `LEAN-L5-05`; all associated gates remain default closed.
