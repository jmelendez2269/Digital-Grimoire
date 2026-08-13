# LEAN-L5-05 closed production application/database release

**Date:** August 12, 2026  
**Result:** PASS — exact application and database release unit completed with every commercial/configuration gate closed  
**L5-05 credit at the time of this release unit:** 0/5 points; the then-planned live canary/public-launch boundary had not run

## Authorization boundary

Jen separately authorized this exact unit after the candidate and backup/rehearsal gate passed:

1. push the frozen commit to a dedicated release branch;
2. build and verify one Preview;
3. apply only the 12 SHA-256-frozen migrations individually and record only those versions;
4. deploy the exact source to Production with all operational flags closed; and
5. run closed-boundary production smoke checks.

The authorization did not include Stripe or Vercel configuration changes, canary identity creation, payment, sales, Checkout enablement, paid-course release, billing operations, credit grants/actions, metered-route activation, cleanup, refund/cancellation, or public flags. None occurred.

## Frozen source and deployments

| Item | Evidence |
|---|---|
| Source commit | `8b67e5300b4096ade5a827778fcde460c581ecbe` |
| Release branch | `origin/release/lean-l5-05-canary-20260812` points exactly to the source commit |
| Production baseline | `origin/main` remained `7ae0ce789a1a426bf93ade1b5ff7d194eeda3182`; it was not updated |
| Pre-change Production | `dpl_G4tMBDrSi3XhzEh9eof2XxEVEBdh`, `digital-grimoire-96dg-cdm3j7mg8-ravemage444s-projects.vercel.app`, Ready |
| Preview | `dpl_B4jSXqvPR8YzVY1ngYrHj3orjZ3D`, `digital-grimoire-96dg-pqu51czon-ravemage444s-projects.vercel.app`, Ready |
| New Production | `dpl_6kvJmSfgz1fVsPB8FsuqyYyj4Rvf`, `digital-grimoire-96dg-agh4x4kqi-ravemage444s-projects.vercel.app`, Ready |
| Production aliases | `prismarium.xyz`, `www.prismarium.xyz`, and the project alias point to the new Ready deployment |
| Build | Next.js 16.0.10 production build completed all 139 static-generation entries; only pre-existing dependency/runtime deprecation warnings remained |

The CLI-uploaded deployments do not expose a Git SHA in Vercel metadata. Exact source identity is instead established by the clean detached worktree HEAD check immediately before each deployment and the remote release ref, all equal to `8b67e53`. No tracked candidate change existed during either upload.

Vercel linking initially generated candidate-local OIDC `.env.local` files and a `.gitignore` edit. Each generated secret file was removed before deployment, the tracked `.gitignore` was restored to the frozen commit, and the first incorrectly rooted Preview command created no deployment.

## Production migrations

Production was reconfirmed as healthy Supabase project `ukguqtghfglirszsqqdj` on PostgreSQL `17.6.1.021`. A structural preflight found zero of the 14 target tables before migration 1.

Each frozen migration was hash-verified locally, executed through its own linked one-file query, verified through a narrow catalog query, marked applied only after that verification, and then checked for exactly one ledger row before continuing. Broad `supabase db push` was never used.

| Order | Version | Result |
|---:|---|---|
| 1 | `20260810220000` | object check pass; one ledger row |
| 2 | `20260810230000` | object check pass; one ledger row |
| 3 | `20260811200000` | object check pass; one ledger row |
| 4 | `20260811210000` | object check pass; one ledger row |
| 5 | `20260811220000` | object check pass; one ledger row |
| 6 | `20260811230000` | object check pass; one ledger row |
| 7 | `20260812000000` | object check pass; one ledger row |
| 8 | `20260812010000` | function check pass; one ledger row |
| 9 | `20260812020000` | four-function check pass; one ledger row |
| 10 | `20260812030000` | function check pass; one ledger row |
| 11 | `20260812040000` | two-table check pass; one ledger row |
| 12 | `20260812110000` | object check pass; one ledger row |

### Inert security state

- 14/14 target tables exist and have RLS enabled.
- The intended 12 service-authority tables have forced RLS.
- `learner_progress_requests` and `learner_journal_requests` match the frozen L1 contract: RLS enabled, not forced, zero customer policies, and zero `anon`/`authenticated` table privileges.
- All 14 new tables contain zero rows after deployment and smoke checks.
- There are zero overdue reservations.
- All 12 versions appear exactly once in the remote ledger.
- Known historical migration-ledger drift outside this exact manifest remains unchanged.

## Closed Preview and Production checks

Preview returned 200 for home, pricing, Library, courses, PRE preview, and the safe membership catalog; logged-out Checkout returned 401. Its catalog exposed no raw Prices and reported paid sales false, zero public offers, zero released paid courses, no Student launch slug, and zero enabled metered actions.

After Production became Ready:

- both `prismarium.xyz` and `www.prismarium.xyz` returned 200 for home, pricing, Library, courses, and PRE preview;
- the safe catalog returned 200;
- logged-out tool-cost, billing-summary, wallet, Checkout, Portal, reconcile, Working, and Seven Lenses requests returned 401 before privileged or external work;
- the catalog again proved paid sales false, zero public offers, zero released paid courses, no Student launch slug, and zero enabled metered actions;
- the four encrypted lean Stripe Price mapping names remained present;
- canary, public-sales, offer, course-release, Student-launch, metering, billing-operation, Portal, and commercial-action variable names remained absent;
- the new deployment produced zero error-level log entries and zero HTTP 500 entries during the checked 30-minute window; and
- the post-smoke database check still showed zero rows in all 14 new authority tables and zero overdue reservations.

## Current boundary

No rollback was needed. The encrypted restricted backup remains retained through August 19, 2026. Application and additive database foundations are live but inert.

Jen later accepted this release, its backup/rehearsal, and the disabled Stripe/Vercel configuration as the [no-charge production-readiness completion](lean-l5-05-no-charge-production-readiness-complete-2026-08-12.md). `LEAN-L5-05` is `done` at 5/5 without a canary or public launch. `LEAN-L5-06` remains `not_started`; canary identity, live payment/refund, lifecycle cleanup, public offer/course flags, production credits, metered actions, webhook activation/cutover, billing operations, further deployment/migration, and public activation remain closed.
