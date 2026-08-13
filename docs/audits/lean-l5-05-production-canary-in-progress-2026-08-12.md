# LEAN-L5-05 production canary and public launch gate — superseded

**Started:** August 12, 2026  
**Historical status at capture:** Local containment, read-only production inventory, isolated release-candidate verification, and fresh backup/disposable migration rehearsal complete; 0/5 packet points earned  
**Authorization:** Jen explicitly authorized starting `LEAN-L5-05` with “all right lets go!” after the L5-04 handoff was verified  
**Current status:** Superseded by the owner-approved [no-charge production-readiness completion](lean-l5-05-no-charge-production-readiness-complete-2026-08-12.md). No canary or public launch occurred.

## Authorization boundary

The start authorization activates the L5-05 packet and permits local containment, read-only inventory, and preparation of a frozen rollbackable candidate. It does not waive the packet's internal evidence gates or turn the historical review-only canary runbook into blanket mutation authority.

The remaining live units stay explicit and independently observable:

1. fresh restricted backup and disposable restore rehearsal;
2. exact source candidate, production deployment, and ordered migrations;
3. named Stripe Portal/webhook and Vercel Production configuration;
4. one dedicated non-admin canary identity;
5. at most one separately confirmed $15 founding Checkout completed by Jen on Stripe-hosted Checkout; and
6. cancellation/reactivation, optional refund, canary closure, and optional identity cleanup.

Card data, passwords, raw environment values, raw user/Stripe identifiers, Checkout/Portal URLs, webhook secrets, and customer payloads must never enter the repository or evidence.

## Verified starting state

| Boundary | Read-only result |
|---|---|
| Repository | Branch `agent/lean-membership-l2`, HEAD `6b6efc9`; intentionally dirty work preserved |
| Release base | `origin/main` is `7ae0ce7`; no fetch, commit, merge, push, or PR occurred |
| Vercel project | `digital-grimoire-96dg`, Root Directory `app`, authenticated as the expected owner |
| Current production | Ready deployment serves `prismarium.xyz` and `www.prismarium.xyz` |
| Production variables | Four encrypted lean Stripe Price mappings are present; canary, public-sales, offer, paid-course release, metering, billing-operation, and named Portal variables are absent |
| Supabase target | Linked project ref `ukguqtghfglirszsqqdj` confirmed |
| Migration ledger | L0-03 is applied; all 12 ordered L1-L4 lean migrations remain unapplied; historical migration drift remains, so broad `supabase db push` is prohibited |
| L5-04 | 30/30 success matrix remains complete; Reader/Student/Scholar/Adept economics decisions remain `enable` only |

### Required ordered migration candidate

| Order | Migration | SHA-256 |
|---:|---|---|
| 1 | `20260810220000_lean_l1_02_learner_progress.sql` | `3D39A51A7B5163D9F559F61CEF71053AB52CA7E42C164A51D6DC5CA880B8EEA4` |
| 2 | `20260810230000_lean_l1_03_learner_journal.sql` | `61E9006B470331F8ECC04DA15B75C7665D2D91BCE392FCB448418A353F7E85F7` |
| 3 | `20260811200000_lean_l2_02_billing_memberships.sql` | `A50A48AC9AD5B74A52B81AA4DC7FAC092CC6C25E44FBF2389CFBAC9D8542446F` |
| 4 | `20260811210000_lean_l2_04_checkout_requests.sql` | `E99BDFC80A1EBB4D3592475B96D91380BC0055F570E11DA99A02C2A123F3D64B` |
| 5 | `20260811220000_lean_l2_05_webhook_inbox_projector.sql` | `AF262C4EE114D3203A7F2F755C5E69A16E3301E504F4501C143E3B0448D4DD03` |
| 6 | `20260811230000_lean_l2_06_billing_lifecycle.sql` | `16211CD5D3230577AF0F57555DE20CEEE2C08D20C28EBB0AEB45F5D08BE70306` |
| 7 | `20260812000000_lean_l3_01_credit_core_schema.sql` | `4C3D64EE0674FBE7AE4D0DACECA9954F7D60A6379C91C4E1555647EE0EB2985C` |
| 8 | `20260812010000_lean_l3_02_monthly_grants.sql` | `E515B148F3EA61B8F877B9E9F7BC6E542751D2450802A502E12BDCE0BBF1086D` |
| 9 | `20260812020000_lean_l3_03_atomic_reservations.sql` | `E3AA51DBFC39FBA4D5C37F26EC4240979466CC0ED7CBD5D18D781D588A41CE5D` |
| 10 | `20260812030000_lean_l3_04_safe_wallet.sql` | `790230140AF08EA09680C6CCF61B550D68AED16DD18E07EA4D1C42D8593FE7B7` |
| 11 | `20260812040000_lean_l4_01_metering_foundation.sql` | `62FEAECA705AF3069B3BFAFAE5CDB4DF3F56017089368FBEA47208AE90F42152` |
| 12 | `20260812110000_lean_l4_04_lens_expansions.sql` | `68BDE05833EE0B4DC3BBB6D24BCC65A2AFC55872A274AE46DF8604FE74401C05` |

All 12 migrations were later applied through the separately authorized closed production release and are recorded in the [production release evidence](lean-l5-05-production-release-2026-08-12.md). Broad `supabase db push` was not used.

## Local canary containment

The historical runbook correctly identified that the existing global Checkout gate could not safely expose one canary while public sales remained closed. The local implementation now adds a separate server-only resolution boundary with these requirements:

- `PRISMARIUM_MEMBERSHIP_CANARY_ENABLED` must equal lowercase `true` exactly;
- the configured user list must contain exactly one duplicate-free UUIDv4;
- the configured offer list must contain exactly `student_founding_monthly` and nothing else;
- the authenticated user must match that UUID and have profile role exactly `user`;
- the founding Price must reverse-map unambiguously through the server catalog;
- the existing commercial-action and exact Price allowlists must also pass; and
- the safe public catalog ignores canary configuration and remains closed.

Malformed, duplicated, broader, non-canary, or admin inputs fail before membership lookup, Checkout ledger reservation, or Stripe access. The route now authenticates and reads the exact profile role before invoking this boundary. Raw Price IDs and canary identity never enter customer-safe catalog responses.

### Verification so far

- membership Checkout tests: 12/12 passed;
- membership catalog tests: 10/10 passed;
- commercial containment tests: 12/12 passed;
- guarded canary-helper tests: 4/4 passed;
- isolated `origin/main`-based candidate: 175/175 selected membership, metering, learner-save, access-control, billing/wallet UI, Stripe-configuration, and canary checks passed;
- focused ESLint: passed;
- global TypeScript `--noEmit`: passed after updating the existing local Checkout fixture with its explicit normal-user role;
- focused `git diff --check`: passed; and
- placeholder-isolated Next.js production build: passed with all 139 static-generation entries and no real service credentials.

## Isolated release candidate

The release candidate is assembled in a separate detached worktree based on production baseline `origin/main` `7ae0ce789a1a426bf93ade1b5ff7d194eeda3182`. The primary dirty worktree remains intact. Candidate review detected and removed a repository-wide README rewrite, sixteen historical handoff files, and an unrelated course-parser change plus its test before verification. The candidate contains no `supabase/config.toml`, Supabase temp state, post-lean roadmap, dirty course-parser V2 test, or source-worktree environment profile.

A single detached local candidate commit was created and amended in place after the rehearsal exposed one stale cross-version SQL fixture. The final commit is `8b67e5300b4096ade5a827778fcde460c581ecbe`. It was later pushed only to `release/lean-l5-05-canary-20260812` and used for the separately authorized [closed production application/database release](lean-l5-05-production-release-2026-08-12.md); `origin/main` was not updated.

## Fresh restricted backup and disposable rehearsal

The separately authorized backup/rehearsal unit completed without a production write.

| Item | Evidence |
|---|---|
| Production target | Healthy project `ukguqtghfglirszsqqdj`, region `us-east-2`, PostgreSQL `17.6.1.021` |
| Ledger | L0-03 remains applied; all 12 frozen L1-L4 migrations remain unapplied; known historical drift unchanged |
| Restricted location | `%LOCALAPPDATA%\Prismarium\RestrictedBackups\l5-05-20260812-195554` |
| Access and encryption | Parent ACL inheritance protected; exactly current Windows user and `SYSTEM`; directory and all four retained files EFS-encrypted |
| Retention | Seven days, through August 19, 2026, unless a later reviewed rollback window requires it temporarily |
| Total bytes | 262,759,123 |
| Restore image | `public.ecr.aws/supabase/postgres:17.6.1.021` |
| Isolation | Docker network `none`, zero published ports, database-local `supabase_admin` only |
| Logical restore | Roles, managed-schema reset, two trigger dependencies, managed schema, ordinary schema, and COPY data passed with `ON_ERROR_STOP=1` |
| Migration rehearsal | All 12 frozen SHA-256-verified files applied in order to the disposable restore |
| Acceptance | 12/12 rollback-only SQL stories pass; the Journal story passes both L1-only and full-chain modes; every story reports zero fixture residue |
| Final compatibility | 14/14 expected tables present, 114 total restored-plus-new tables, zero rows in the 14 new tables, zero synthetic residue, zero overdue reservations |
| Cleanup | All L5-05 disposable containers removed; encrypted backup retained |

### Backup manifest

| File | Bytes | SHA-256 |
|---|---:|---|
| `roles.sql` | 297 | `25873CEC56A2CC6514E204F420231777F85C03DA818CAA7090CDCDFA89776ECD` |
| `schema.sql` | 269,941 | `D16B4C6986384CEA2CE69AFB4738B66BC9E4DD4C3FFD75D204D37E0F99291BA3` |
| `managed-schema.sql` | 94,921 | `9851B24FAC2EFC864B51243968274941BE7E640592CE6D986AB64AB68E2D1A83` |
| `data.sql` | 262,393,964 | `F6DFC7FD093D4CADC83ACB6719FBEF5F8A0135C25F47493BEC77731B254B55EE` |

### Rehearsal correction

The full-chain rehearsal found that the older L1 Journal acceptance story represented its synthetic paid user only through the retired legacy `public.users.subscription_status` field. The final L2 trigger correctly requires an active, unheld service-owned `billing_memberships` row, so the story stopped at the Reader page cap. The test now conditionally creates and then removes one exact authoritative synthetic membership when the L2 table exists, while preserving its original legacy-only L1 behavior. Both modes pass with zero residue. No runtime authority was weakened.

Two harness-only interruptions were also resolved without changing production or retained backup contents: the disposable database required its local password, normal PostgreSQL notices needed native exit-code handling, and a secondary container needed sustained readiness before schema reset. Failed disposable attempts created no retained fixture and were removed.

## Excluded read attempt

One read-only Stripe verification attempt was rejected as evidence because `vercel env run` loaded `app/.env.local` ahead of Production values. It reached the local test Stripe account, found no lean mappings, performed only Account/Product/Price reads, and made zero mutations. This is the same isolation trap documented by the earlier L2-06 audit. Future live verification must run from a clean linked directory and enforce the approved live account fingerprint before catalog reads.

## Historical owner decisions retired by the scope revision

The following were open under the former live-payment boundary. They are not required for the revised L5-05 gate and are not authorized work:

- dedicated non-admin email alias controlled by Jen;
- ordinary verified signup versus the guarded Supabase Admin helper;
- explicit approval or rejection of the maximum one-time $15 live charge;
- explicit approval or rejection of an immediate full refund, acknowledging that processing fees may not be recoverable; and
- retain the disabled canary identity versus delete it after terminal cleanup.

## Stop conditions

Stop before mutation if the frozen source/manifest changes, backup/restore proof fails, production schema differs from rehearsal, any migration fails, the canary is not exact/non-admin/marker-owned, a public/release/metered gate opens early, Stripe/Vercel/Supabase targets differ, or any payment/identity ambiguity appears.

## Current disposition

This record preserves the former canary plan as history. Jen later revised the packet to the [no-charge production-readiness gate](lean-l5-05-no-charge-production-readiness-complete-2026-08-12.md), which is `done` at 5/5 points. No canary identity, live payment, lifecycle cleanup, webhook activation/cutover, public flag, sale, course release, production credit, metered route, billing operation, further deployment/migration, or activation occurred or is authorized. `LEAN-L5-06` remains `not_started`.
