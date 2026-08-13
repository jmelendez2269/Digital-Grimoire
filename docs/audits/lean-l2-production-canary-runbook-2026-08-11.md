# LEAN-L2 production canary runbook

**Prepared:** August 11, 2026  
**Status:** Review-only draft; not approved for execution  
**Target:** Prismarium Production — Vercel project `digital-grimoire-96dg`, Supabase project `ukguqtghfglirszsqqdj`, and live Stripe account fingerprint `d2eba286ce46`  
**Current packet:** `LEAN-L2-06` remains `blocked`; progress remains 48/114 (42.1%)  
**Maximum proposed financial exposure:** one explicitly approved $15 founding Student subscription, followed by one exact cancellation and optional full refund if approved before execution

## Purpose

Create one dedicated non-admin canary account, deploy the already verified learner/billing foundations, and prove the narrow production billing loop without opening public sales:

`non-admin account → canary-only Checkout → signed webhook → service-owned membership → safe billing summary → named Portal → exact Stripe/database agreement → controlled cleanup`

This document prepares that work. It does not authorize or perform a deployment, migration, account creation, environment change, Stripe mutation, payment, refund, cancellation, or cleanup.

## Why creating only a Supabase user is insufficient

The approved read-only gate established four production facts:

1. the nominated existing account is an administrator;
2. `public.billing_memberships` is not deployed;
3. `PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID` is absent; and
4. `PRISMARIUM_BILLING_OPERATIONS_ENABLED` is absent.

The current Checkout gate is also global. Enabling the founding offer with the existing variables would make it available to every otherwise eligible user, not only a test account. The canary therefore requires a small server-only per-user gate before production execution.

The local L2 code imports the L1 learner contract, and the L2-06 Journal trigger assumes the L1 Journal schema. Production does not contain the two L1 migrations. The production prerequisite is therefore **two ordered L1 migrations plus four ordered L2 migrations**, not only the four L2 files.

## Approval model

Execution must be divided into explicit approval units. Approval of one unit does not imply another.

| Unit | Mutations | Approval required before |
|---|---|---|
| A — Canary containment implementation | Local source/tests only | Local edits may proceed when requested; no external approval needed |
| B — Fresh backup and disposable rehearsal | Production logical read, restricted local backup files, temporary Supabase login role, disposable local restore | Connecting to production or creating backup artifacts |
| C — Application and database release | One production deployment plus exactly six reviewed migrations and six ledger entries | Commit, push, deployment, or SQL execution |
| D — Stripe/Vercel configuration | One Portal configuration, one webhook endpoint, and named Production variables | Any Stripe or Vercel mutation |
| E — Canary identity | One dedicated Supabase Auth user and its normal `public.users` profile | User creation |
| F — Live payment story | One $15 founding Checkout and ephemeral Portal Sessions | Checkout Session creation or payment |
| G — Lifecycle/cleanup | Portal cancel/reactivate, optional immediate terminal cancellation/refund, user cleanup, canary-variable closure | Each financial or destructive cleanup action |

No approval is active when this runbook is drafted.

## Required decisions before executable approval

- [ ] Jen supplies one dedicated email alias she controls. Do not reuse an administrator email.
- [ ] Jen chooses whether the account is created by ordinary verified signup or a reviewed Supabase Admin helper. Ordinary signup is the more customer-representative path.
- [ ] Jen explicitly approves or rejects a maximum one-time $15 live charge.
- [ ] Jen explicitly approves or rejects an immediate full refund after verification. Stripe processing fees may not be recoverable.
- [ ] Jen chooses whether the canary Auth user is deleted after terminal cleanup or retained as a disabled future canary.
- [ ] The exact production release commit, file manifest, deployment target, and pre-change deployment are frozen after rebasing onto current `origin/main`.

## Stage 0 — Build the missing canary containment locally

Do not prepare a production candidate until these local additions pass review.

### 0.1 Server-only per-user Checkout gate

Add three server-only variables:

- `PRISMARIUM_MEMBERSHIP_CANARY_ENABLED`
- `PRISMARIUM_MEMBERSHIP_CANARY_USER_IDS`
- `PRISMARIUM_MEMBERSHIP_CANARY_OFFERS`

Required behavior:

- the canary gate is active only when the first value is exactly `true`;
- the user list is an exact, duplicate-free UUID list and initially permits exactly one UUID;
- the offer list is exact and initially permits only `student_founding_monthly`;
- the existing public catalog remains closed when `PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED` is absent or false;
- only the authenticated allowlisted user can resolve the canary offer to the exact server-owned Price;
- malformed, empty, duplicated, unknown, admin, or non-allowlisted input returns the existing non-cacheable `CHECKOUT_UNAVAILABLE` response before Stripe access;
- safe client catalog responses never expose the canary user ID, raw Price, or canary offer;
- metered actions and member-course release remain closed.

Prefer a separate `resolveMembershipCanaryCheckoutOfferForUser()` boundary rather than weakening `getSafeMembershipCatalog()` or the public `resolveMembershipCheckoutOffer()` contract.

### 0.2 Canary identity helper

Add a guarded helper such as `app/scripts/manage-lean-l2-canary.ts` with `setup`, `inspect`, and `cleanup` actions. It must:

- require `--confirm-production`, the exact Supabase project ref, and an explicit action;
- take email and password only from process environment or secure interactive input;
- refuse the nominated administrator and any existing email;
- create at most one Auth user with a dedicated metadata marker;
- verify the resulting `public.users.role` is exactly `user`;
- never set legacy Stripe identifiers, paid status, enrollment, credits, or admin role;
- emit only counts, booleans, and a 12-character SHA-256 user fingerprint;
- cleanup only the exact marker-owned user after checking the expected Stripe lifecycle is terminal;
- refuse broad user listing, email search fallback, or deletion of an untagged account.

The helper must not contain a hard-coded email, password, user UUID, service key, Stripe identifier, or project credential.

### 0.3 Configuration helpers

Add or review explicit `--apply` scripts for:

- one named Portal configuration;
- one dedicated Prismarium webhook endpoint; and
- privacy-safe retrieval/verification of those exact objects.

Mutation scripts must require the expected live account fingerprint, deterministic idempotency where supported, exact target confirmation, and a separate `--apply`. They must never list Customers, Subscriptions, Checkout Sessions, invoices, or payments.

### 0.4 Required local tests

- non-canary users remain 503 before Stripe access;
- the one exact canary user can request only the founding offer;
- public sales and public catalog remain closed;
- malformed/duplicate canary configuration fails closed;
- an active or ambiguous membership still blocks duplicate Checkout;
- scripts contain no customer/subscription enumeration or mutation outside their named action;
- existing 62/62 L2 focused tests remain green;
- L1 persistence tests, commercial containment tests, and server-authority tests remain green;
- all six migrations pass in exact order against a disposable restore of current production;
- focused ESLint, global `tsc --noEmit`, `git diff --check`, and the production build pass.

## Stage 1 — Assemble a clean production candidate

The draft observed `origin/main` at `7ae0ce7`, while the membership branch is based on a different line. Reconfirm both before work. Never push the dirty membership branch directly to `main`.

1. Fetch read-only and record the current `origin/main`, deployed Vercel revision, and both production aliases.
2. Create a clean temporary worktree and release branch from that exact `origin/main`.
3. Import the verified L1 persistence change from `30e129f` without overwriting newer C01/course-parser work already on `origin/main`.
4. Apply only the reviewed L2 source, migrations, tests, helpers, and canary-containment patch.
5. Generate and attach the exact `git diff --name-status` manifest. Stop if it contains unrelated course content, course-parser work beyond the reviewed L1 compatibility hunk, pricing copy, credit work, or any other migration.
6. Run the complete local verification matrix before requesting execution approval.

### Required migration manifest

Apply only these six files, in this order:

1. `supabase/migrations/20260810220000_lean_l1_02_learner_progress.sql`
2. `supabase/migrations/20260810230000_lean_l1_03_learner_journal.sql`
3. `supabase/migrations/20260811200000_lean_l2_02_billing_memberships.sql`
4. `supabase/migrations/20260811210000_lean_l2_04_checkout_requests.sql`
5. `supabase/migrations/20260811220000_lean_l2_05_webhook_inbox_projector.sql`
6. `supabase/migrations/20260811230000_lean_l2_06_billing_lifecycle.sql`

Never use broad `supabase db push`. Production migration history has known drift.

### Known application scope

The frozen manifest must contain the reviewed L1 persistence runtime from `30e129f`, plus these L2 groups:

- `app/src/lib/membership/*.server.ts`
- `app/src/app/api/membership/**`
- the four membership-aware Stripe routes
- `app/src/components/membership/**` and `app/src/components/SubscriptionTab.tsx`
- `app/src/lib/supabase/service.ts` and `app/src/middleware.ts`
- the exact environment example/package-script changes
- the membership/Stripe tests, six ordered migration tests, local runners, live verifier, and new canary helpers
- the canary-gate changes and their tests

The execution approval must attach the final path-by-path manifest; this grouped scope is not permission to deploy a wildcard.

## Stage 2 — Fresh production backup and disposable rehearsal

1. Reconfirm the linked Supabase project ref is `ukguqtghfglirszsqqdj`.
2. Read the production migration ledger and relevant catalogs. Stop if any of the six versions is already applied, partially present, or structurally divergent.
3. Create a fresh restricted logical backup using the proven L0-03 process. Store it outside the repository with current timestamp, ACL, EFS status, sizes, hashes, retention, and owner.
4. Restore it into a network-disabled disposable container using the exact current production Postgres image.
5. Apply the six files to the disposable restore in exact order with `ON_ERROR_STOP=1`.
6. Run the six L1/L2 SQL acceptance stories and production-schema compatibility queries.
7. Prove zero fixture residue. Remove the disposable container; retain the restricted backup through the approved rollback window.

Any restore, migration, RLS, function, trigger, or compatibility failure stops the release.

## Stage 3 — Prepare Stripe and Vercel configuration while disabled

### 3.1 Named Portal configuration

Create exactly one non-default configuration with a privacy-safe description and these features:

| Feature | Required value |
|---|---:|
| Active | `true` |
| Customer/profile updates | Disabled; allowed updates empty |
| Invoice history | Enabled |
| Payment-method updates | Enabled |
| Subscription cancellation | Enabled |
| Cancellation mode | `at_period_end` |
| Cancellation proration | `none` |
| Subscription updates/plan switching | Disabled; allowed updates empty |
| Subscription pause | Disabled/not enabled |

Record only its fingerprint. Do not make it the account default. The application must always pass the exact configuration ID when creating a Portal Session.

### 3.2 Dedicated webhook endpoint

Create exactly one account webhook endpoint for:

`https://prismarium.xyz/api/stripe/webhook`

Enable only:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Create it with a privacy-safe description, capture its signing secret only at creation, and immediately disable it until the new application and database are ready. Record only the endpoint fingerprint, mode, status, URL host/path, and event booleans. Do not modify or reuse the stale legacy endpoint.

### 3.3 Vercel Production variables

Add values interactively or through process-only injection; never place literals in shell history or files.

| Name | Canary-window state |
|---|---|
| Four `PRISMARIUM_STRIPE_PRICE_*` mappings | Retain existing verified Sensitive values |
| `PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED` | Absent or `false` |
| `PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS` | Absent |
| `PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS` | Absent |
| `PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG` | Absent |
| `PRISMARIUM_ENABLED_METERED_ACTIONS` | Absent |
| `PRISMARIUM_MEMBERSHIP_CANARY_ENABLED` | `true` only for approved window |
| `PRISMARIUM_MEMBERSHIP_CANARY_USER_IDS` | Exact canary UUID; Sensitive |
| `PRISMARIUM_MEMBERSHIP_CANARY_OFFERS` | `student_founding_monthly` |
| `PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID` | Exact named configuration; Sensitive |
| `PRISMARIUM_BILLING_OPERATIONS_ENABLED` | `true` only for approved window |
| `STRIPE_WEBHOOK_SECRET` | Exact new endpoint secret; Sensitive |

Changing Production variables does not alter a running deployment until a new deployment is built. Do not enable the webhook or initiate Checkout before the new deployment is Ready.

## Stage 4 — Apply database and deploy the closed candidate

1. Confirm the candidate preview deployment is Ready and its build artifact matches the frozen commit.
2. Announce the short maintenance window. Recheck the fresh backup and rollback deployment identifiers.
3. Apply each migration through the one-file linked query path, in the six-file order. Each file owns its transaction and must complete before the next begins.
4. After each file, run its narrow read-only table/function/RLS/grant checks. If any step fails, stop; do not continue or reverse earlier migrations.
5. Mark only the successfully verified version as applied in the migration ledger. Re-read the ledger after every mark.
6. Deploy the frozen candidate to Vercel Production with public sales, released paid courses, and metered actions still closed.
7. Wait for Ready, confirm both Prismarium aliases, and smoke-test homepage, Explore, Library, sign-in, PRE preview, and logged-out 401/503 boundaries.
8. Confirm unauthenticated and non-canary Checkout stops before Stripe, the public membership catalog contains no paid offer, and billing operations require an exact paid service-owned row.
9. Enable only the new webhook endpoint and retrieve it again to verify live mode, exact URL, three-event allowlist, and enabled status.

If deployment fails, Vercel keeps the prior Ready application. Leave the additive database objects inert, keep all commercial flags closed, disable the new webhook, and prepare a forward repair. Do not reverse the secure migrations automatically.

## Stage 5 — Create and verify the Supabase canary user

1. Create exactly one account using the approved email alias and strong one-time password, or complete ordinary signup and email verification.
2. Confirm exactly one `auth.users` row and one `public.users` row exist for it.
3. Confirm email verified, `role='user'`, legacy subscription status is free/none, legacy Stripe IDs are null, and no enrollment, Journal, membership, Checkout, webhook, reconciliation, or credit row exists.
4. Record only the canary user fingerprint.
5. Set the Sensitive canary UUID variable if it was not known earlier, rebuild/redeploy the same source commit, and re-run the closed-boundary checks.

Never change an existing administrator into the canary.

## Stage 6 — One controlled live Checkout

This stage requires explicit approval of one real $15 charge. Jen enters payment details directly on Stripe-hosted Checkout; card data must never pass through Codex, logs, screenshots, or repository files.

1. Sign in as the dedicated canary in a clean browser profile.
2. Submit one exact `{ offerCode: 'student_founding_monthly', requestId: <UUIDv4> }` request to the authenticated Checkout route.
3. Verify one session fingerprint and one pending/completed request-ledger row. Replay the identical request once and confirm the same Session; never create a second request after successful Session creation.
4. Before payment, confirm a non-canary account receives 503 and no Stripe object is created.
5. Jen completes the $15 Checkout on Stripe's hosted page.
6. Wait for the signed `customer.subscription.created` or `updated` event to project exactly one membership row.
7. If the webhook fails, do not repeat Checkout. Disable the canary gate, inspect only the exact event/session/subscription fingerprints, repair forward, and rely on Stripe retry or exact replay.

## Stage 7 — Acceptance verification

### 7.1 Exact Stripe/database agreement

Run the guarded read-only verifier from a clean Vercel-linked directory. It must prove:

- intended Supabase project and live Stripe account fingerprints match;
- canary role is non-admin;
- exactly one service-owned membership row exists;
- exact Customer and Subscription identities agree;
- plan is Student, offer is founding, cohort is founding, interval is monthly, status is active/trialing, hold is false, and period/access timestamps agree;
- the exact configured Price remains $15 USD monthly and active;
- no second Customer, Subscription, Checkout Session, or membership row exists.

Do not call the write-producing reconciliation route during this read-only comparison.

### 7.2 Portal contract

Retrieve the exact named configuration and verify every feature boolean before creating a Session. Then, as the canary:

- create one Portal Session through the authenticated route;
- confirm payment methods, invoice history, and cancellation are available;
- confirm plan switching, profile editing, quantity changes, promotion codes, and pause are absent;
- schedule cancellation at period end and verify Stripe plus `billing_memberships.cancel_at_period_end=true` while paid access remains active;
- reactivate before terminal end and verify the flag returns false while the founding Price/cohort remains unchanged.

Portal Session URLs are secrets. Never record or share them.

### 7.3 Safety regressions

- public catalog and pricing remain closed;
- non-canary Checkout remains 503 before Stripe access;
- duplicate Checkout remains blocked/replayed exactly;
- no member course or metered action opens;
- direct customer database writes remain denied;
- PRE and Journal behavior remains healthy;
- Vercel logs contain no new 500/error spike and no PII/raw Stripe identifiers;
- webhook inbox has one explicit disposition per delivered event and no unexplained `received` row.

Only after every check passes may L2-06 be marked `done`, Phase L2 become 22/22, and total progress become **51/114 (44.7%)**.

## Stage 8 — Controlled terminal cleanup

Cleanup is a separate approved mutation sequence. Do not infer it from Checkout approval.

1. Disable the canary Checkout gate first and deploy the same source with its canary variables absent/false.
2. If approved, immediately cancel only the exact canary Subscription and optionally refund only the exact $15 canary payment. Never enumerate or select the first invoice/payment.
3. Wait for the exact terminal webhook and verify the service-owned row is terminal, paid entitlement is inactive, and saved work was not deleted or archived.
4. Set `PRISMARIUM_BILLING_OPERATIONS_ENABLED` absent/false and deploy the closed configuration.
5. Keep public sales, paid-course release, and metered actions absent/closed.
6. Leave the safe Portal configuration inert. Leave the dedicated webhook enabled only if its signature/processing health is clean; otherwise disable it and record why.
7. Delete the canary Auth user only if Jen chose deletion and the helper proves the account marker plus terminal subscription. Confirm expected cascade cleanup and zero user-linked fixture residue. Never delete Stripe financial history merely to make the database clean.
8. Retain the privacy-safe evidence, exact production deployment, migration versions, object fingerprints, gross charge/refund state, and any unavoidable fee.

## Rollback and recovery

| Failure | Immediate response |
|---|---|
| Local/preflight/restore failure | Stop before production; change nothing externally |
| Migration failure | Stop at the failed transaction; keep completed additive migrations; prepare forward repair |
| Deployment failure | Keep prior Ready deployment; disable new webhook; keep all commercial gates closed |
| Wrong Vercel/Stripe/Supabase target | Stop before resource access or mutation |
| Canary gate exposes another user | Disable canary/public gates, deploy closed config, inspect logs, and treat as a high-severity incident |
| Checkout succeeds but webhook fails | Do not retry Checkout; close canary gate and repair/replay the exact event |
| Unknown Price/identity mismatch | Leave membership held/quarantined; do not grant access or auto-cancel |
| Portal feature mismatch | Do not create a Portal Session; disable billing operations and correct only under new approval |
| Payment or refund ambiguity | Stop all financial mutations and reconcile the exact Subscription/invoice/payment manually |

Database rollback is forward-only by default. The six migrations establish stricter service-owned authority and can remain inert while environment gates are off. Any destructive reversal requires its own reviewed migration and approval.

## Stop conditions

- The production base or file manifest changes after approval.
- Current production schema/ledger differs from the rehearsal target.
- Fresh backup or isolated restore cannot be proven.
- Any of the six migrations fails its rehearsal or production acceptance check.
- The canary account is admin, pre-existing, unverified, or not marker-owned.
- Public sales, paid-course release, or metered actions become enabled.
- The Stripe account fingerprint, mode, Price, webhook, or Portal configuration differs.
- The canary gate allows more than one user or more than the founding offer.
- Jen has not explicitly approved the $15 live charge.
- Card details would need to be handled by Codex.
- Any Customer/Subscription ambiguity, duplicate, hold, quarantine, or unexplained webhook state appears.
- Core public pages, PRE, Journal, authorization, or Vercel health regresses.

## Evidence to retain

- exact source commit, production deployment, aliases, and frozen file manifest;
- backup timestamp/location class, sizes, hashes, ACL/EFS, restore result, and retention—never contents;
- six migration versions plus post-apply catalog/RLS/grant/function results;
- canary user, Stripe account, Portal, webhook, Customer, Subscription, Price, Session, event, invoice/payment fingerprints only;
- feature/status booleans, safe plan/cohort/period fields, aggregate counts, and HTTP status codes;
- gross canary charge, refund state, and unavoidable fee in dollars;
- cleanup and zero-residue results;
- limitations, deviations, stop events, and rollback actions.

Never retain raw IDs, email, password, card data, Portal/Checkout Session URLs, signing secrets, service keys, event payloads, invoice PDFs, or customer profile fields.

## Proposed success result

If every stage passes and cleanup is recorded:

- `LEAN-L2-06` moves from `blocked` to `done`;
- Phase L2 moves from 19/22 to 22/22;
- launch progress moves from 48/114 (42.1%) to 51/114 (44.7%);
- public sales, paid-course release, and metered actions remain closed;
- `LEAN-L3-01` becomes the next local implementation packet.

## References

- [L2-06 live prerequisite evidence](lean-l2-06-live-readonly-2026-08-11.md)
- [L2-06 local lifecycle evidence](lean-l2-06-billing-lifecycle-local-2026-08-11.md)
- [Membership implementation tracker](../planning/prismarium-membership-implementation-tracker.md)
- [Lean Membership launch plan](../planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [Stripe Portal configuration API](https://docs.stripe.com/api/customer_portal/configurations/create)
- [Stripe webhook endpoint API](https://docs.stripe.com/api/webhook_endpoints/create)
- [Stripe webhook signature guidance](https://docs.stripe.com/webhooks/signature)
