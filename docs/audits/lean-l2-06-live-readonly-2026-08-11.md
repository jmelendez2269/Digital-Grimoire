# LEAN-L2-06 live read-only prerequisite verification

**Evidence date:** August 11, 2026  
**Scope:** Approved Vercel Production variable-name inspection, exact production user lookup, exact live Stripe account identity, and conditional Portal/customer/Subscription reads  
**Result:** BLOCKED — the live target does not yet contain the prerequisites needed for the L2-06 external agreement gate  
**Packet state:** `blocked`; 0 additional points earned and launch progress remains 48/114 (42.1%)

## Approval and privacy boundary

Jen approved the previously stated read-only plan and nominated one account by email as the intended regular-user target. The email and all raw user, Stripe, Portal, Customer, Subscription, Price, project, and credential values are omitted from this evidence. The production user is retained only as fingerprint `6d9e8bfb6dd5`.

The approved flow allowed exact reads only. It prohibited environment changes, Portal Session creation, customer or subscription enumeration, the write-producing reconciliation route, database writes, migrations, deployment, sales activation, and every Stripe mutation.

## Findings

| Boundary | Privacy-safe result |
|---|---|
| Vercel target | Production project `digital-grimoire-96dg` confirmed |
| Supabase target | Production project ref `ukguqtghfglirszsqqdj` confirmed |
| Stripe target | Live mode; account fingerprint `d2eba286ce46` matched the approved L2-03 account |
| Billing operations flag | `PRISMARIUM_BILLING_OPERATIONS_ENABLED` absent in Production |
| Named Portal configuration | `PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID` absent in Production |
| Exact user lookup | One row matched; fingerprint `6d9e8bfb6dd5` |
| User role | `admin`, not an eligible regular-user canary |
| Service-owned membership table | `public.billing_memberships` absent in Production |
| Customer/Subscription binding | Unavailable; no service-owned row can bind an exact identity |

The verifier stopped before any Portal configuration, Customer, or Subscription read. It did not list configurations, Customers, Subscriptions, or Checkout Sessions and did not call the application reconciliation route.

## Execution-boundary note

The first inline command failed locally during JavaScript parsing and made no API request. A later guarded attempt from the application directory discovered that `vercel env run` loaded `.env.local`; it made one read-only Stripe account-identity request, detected that the account fingerprint did not match the approved live target, and stopped before database, Portal, Customer, or Subscription access. No raw identifier was emitted. The final verification ran from a clean linked directory so only Vercel Production variables entered the process.

This isolation issue caused no mutation, but it is recorded because the approval named one exact live Stripe account. Future external verifiers must run from a clean linked directory and enforce the expected project/account fingerprints before resource reads.

## Local verifier

`app/scripts/verify-lean-l2-06-live.ts` now provides the guarded privacy-safe read path. It requires an explicit read-only confirmation, expected Supabase project ref, expected Stripe account fingerprint, and one target email. It emits only counts, booleans, safe lifecycle fields, and 12-character SHA-256 fingerprints. Focused ESLint and global `tsc --noEmit` pass.

## Disposition and unblock conditions

L2-06 cannot satisfy its live Portal/customer agreement gate in the current production state:

1. there is no named Portal configuration to inspect;
2. billing operations remain absent and therefore closed;
3. the service-owned membership projection is not deployed; and
4. the nominated account is an administrator rather than a non-admin canary.

The packet is `blocked`, not failed locally. Its mocked Stripe, rollback-only PostgreSQL, static, and build evidence remains valid. Unblocking requires separately reviewed and approved production changes: deploy the exact L2 application/migrations, establish and configure one safe named Portal configuration, and establish one explicitly authorized non-admin canary with an exact service-owned Customer/Subscription binding. After those writes exist, a new read-only approval can rerun the agreement check.

No environment variable, Stripe object, database row/schema, deployment, paid offer, course release, or customer entitlement changed during this verification. Every paid and billing gate remains closed.
