# LEAN-L2-02 local membership schema and entitlement evidence

**Date:** August 11, 2026  
**Scope:** Local working tree only  
**Result:** PASS; packet complete locally  
**Launch effect:** None. Paid sales, paid course release, and metered actions remain default closed.

## Implemented boundary

- Added the forward-only `20260811200000_lean_l2_02_billing_memberships.sql` migration.
- Added one `billing_memberships` row per account, with exact Reader/Student/Scholar/Adept plan codes, complete projected Stripe lifecycle state, founding/standard/legacy cohort, semantic offer code, monthly interval, unique Stripe identifiers, access window, billing hold, and observation timestamps.
- Forced RLS and granted no table access to `anon` or `authenticated`; only `service_role` can select or mutate the projection.
- Added offer-to-plan, active-access-window, timestamp-order, known-token, and unique Stripe-identity constraints.
- Added one server-only `resolveMembershipEntitlement` function. It loads only the service-owned membership projection and returns effective plan, monthly credits, and an exact requested-course entitlement.
- Anchored the approved initial Student slug as `c01-how-humans-know-what-they-know`. The environment release value remains blank, so approval does not release the course.
- Added `server-only` protection to the privileged Supabase service client.

## Fail-closed behavior

- No membership row resolves to Reader with 10 monthly credits.
- Invalid identity, database lookup failure, malformed rows, billing hold, unknown cohort, unknown/terminal/delinquent status, or missing/expired/malformed access window resolve to Reader and no paid course access.
- Only `active` or `trialing` Student/Scholar/Adept rows with a known paid cohort and future access window can produce a paid plan resolution.
- PRE continues to come from the L1 free-course authority.
- A paid course is entitled only when the server catalog contains exactly one approved member release matching the approved Student slug. Duplicate, multiple, malformed, or unapproved release configuration yields no paid course entitlement.
- The resolver never queries `courses` and never reads `published` or `is_published`; database publication alone cannot grant membership access.
- Paid sales, Checkout, metered actions, Stripe ingestion, and public course release were not wired or enabled in this packet.

## Local database proof

`npm run test:membership-schema:local` applied only the new forward migration to the local Supabase database and ran a rollback-only fixture story:

- forced RLS present and no customer policy exists;
- `anon` and `authenticated` have no read or mutation privilege;
- direct authenticated read and insert fail;
- service-role projection insert succeeds;
- unknown plan and unknown external status tokens fail constraints;
- a mismatched offer/plan pair fails;
- active membership without an access window fails;
- duplicate Stripe customer identity fails;
- fixture cleanup residue is `0`.

Windows had reserved the repository's default local Supabase port block. Verification temporarily remapped only the local ports to `57320–57329`; the stack was stopped afterward and `supabase/config.toml` was restored with no diff. No remote database was contacted.

## Automated verification

| Check | Result |
|---|---:|
| Membership catalog tests | 8/8 pass |
| Entitlement resolver tests | 7/7 pass |
| Existing server-authority tests | 4/4 pass |
| Existing commercial containment tests | 8/8 pass |
| Local SQL schema/RLS story | PASS; 9 boundary assertions; 0 residue |
| Focused ESLint | PASS; 0 errors, 0 warnings |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Next.js production build | PASS; 137/137 pages |

The build retained existing non-blocking repository warnings about the deprecated middleware convention, Sentry client configuration, and stale baseline-browser data.

## Rollback and limitations

- This is additive, unused schema. The safe operational rollback is to leave all existing default-closed launch flags unchanged and not wire Stripe projection writers or entitlement consumers.
- The local migration persists in the retained local Supabase volume; all acceptance fixtures rolled back with zero residue.
- No membership backfill, webhook projection, Checkout flow, billing summary, course route integration, credit ledger, or customer-facing paid state was added.
- `users.subscription_status` and the existing Stripe route compatibility projection are unchanged by this packet.
- No commit, push, deployment, Stripe access, remote migration, production change, environment-variable change, or release-flag change occurred.

## Next gate

`LEAN-L2-03` remains unstarted. It requires exact approval before any Stripe inspection or other external interaction.
