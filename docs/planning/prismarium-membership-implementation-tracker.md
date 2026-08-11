# Prismarium lean membership implementation tracker

**Created:** August 6, 2026  
**Last updated:** August 11, 2026  
**Program status:** Phases L0 and L1 complete; the full PRE Reader course story is locally verified  
**Launch progress:** **29 / 114 verified points (25.4%)**  
**Current packet:** No active implementation packet; `LEAN-L2-01` is ready to begin locally  
**Next packet:** `LEAN-L2-01` — shared plan/action/course-release catalog and launch flags  
**Forecast:** 25–35 focused engineering days; course production runs in parallel

This is the single source of truth for immediate implementation status. The [lean membership launch plan](prismarium-lean-membership-launch-plan-2026-08-06.md) controls scope, product decisions, architecture, and launch gates. The [course production tracker](prismarium-course-production-tracker.md) separately tracks curriculum and YouTube work. The [full expansion blueprint](prismarium-membership-credits-development-plan-2026-08-06.md) is deferred reference material and does not add requirements to this tracker.

## Launch contract at a glance

| Plan | Monthly price | Monthly credits | Released-course access | Initial public state |
|---|---:|---:|---|---|
| Reader | $0 | 10 | Public/free path | Active |
| Student | $15 founding | 30 | One explicitly configured launch course | Active after launch gate |
| Scholar | $39 | 100 | All | Active after launch gate |
| Adept | $69 | 300 | All | Built, but cost-gated |

Monthly only. No rollover, add-on packs, annual plans, or automatic $19 cutover in this program. The Working and Seven Lenses are the initial metered tools. Deep Search and image generation remain closed until their later gates are satisfied.

The 10/30/100/300 allowances and 1/1/2/3 action weights are launch hypotheses until the prelaunch cost gate passes. The initial provider-COGS ceilings at full use are $0.50 per monthly-active Reader, $2.25 Student, $5.85 Scholar, and $10.35 Adept; paid plans also target at least 70% contribution margin after payment processing, AI, and marginal infrastructure. The Reader global protective breaker defaults to $50 per UTC month until Jen explicitly changes it. A failed or data-poor result produces `hold` or `revise`, never an assumed pass.

## How progress works

### Statuses

| Status | Meaning |
|---|---|
| `not_started` | At least one dependency or required gate is incomplete, or the packet has not yet been unlocked. |
| `ready` | Dependencies are complete and the packet may be selected. |
| `in_progress` | It is the active implementation packet. |
| `verifying` | Implementation exists but acceptance evidence is incomplete. |
| `blocked` | Work cannot continue; the blocker and unblock condition must be recorded. |
| `done` | All acceptance evidence is linked and the relevant gate agrees. |

Only `done` points count. The percentage is always `sum(done L0–L5 points) / 114`. A packet must not be marked done merely because code exists.

### Effort and ownership

| Effort | Points | Meaning |
|---|---:|---|
| S | 2 | Small, focused packet |
| M | 3 | Meaningful implementation or integration |
| L | 5 | High-risk or multi-layer packet |

| Owner | Responsibility |
|---|---|
| Build | Codex implements, verifies, and updates this tracker. |
| Jen | Business approval, external account authority, policy decisions, and go-live approval. |
| Both | Codex prepares evidence and a recommendation; Jen approves the gate or external action. |

### Definition of done

A packet is done only when all applicable evidence exists:

- implementation or forward-only migration is identified;
- targeted automated tests and their exact result are recorded;
- authorization and failure paths are tested, not only the happy path;
- direct database/API boundaries are checked where applicable;
- Stripe/provider behavior is checked for external integrations;
- real-browser, responsive, keyboard, and accessibility behavior is checked for customer UI;
- rollback or kill-switch behavior is recorded for risky changes;
- limitations and follow-up work are explicit.

Use this compact Evidence format:

`YYYY-MM-DD | commit/PR or working tree | tests + boundary artifact | rollback note`

## Dashboard

| Phase | Outcome | Points | Done | Status |
|---|---|---:|---:|---|
| L0 | Safety and stale-sales closure | 14 | 14 | Complete |
| L1 | Durable course beta | 15 | 12 | In progress; L1-05 ready |
| L2 | Monthly billing and catalog | 22 | 0 | L2-01 dependency clear; may run alongside L1 |
| L3 | Monthly credit core | 21 | 0 | Waiting on trusted schema/catalog |
| L4 | Initial tool metering | 21 | 0 | Waiting on credit core |
| L5 | Customer UI, shadow costs, canary, and launch | 21 | 0 | Waiting on earlier gates |
| **Launch total** |  | **114** | **26** | **22.8%** |

## Phase L0 — Safety and stale-sales closure

**Gate:** Production truth is recorded; customer-writable authority is closed; outdated Checkout and unmetered generation cannot create new risk; rollback is known.

| ID | Work packet | Effort | Owner | Depends on | Status | Acceptance evidence | Evidence |
|---|---|---:|---|---|---|---|---|
| `LEAN-L0-01` | Read-only production, schema, migration-tree, and Stripe preflight | M / 3 | Both | — | `done` | Dated privacy-safe report identifies canonical/deployed schema, effective RLS/grants, exact Stripe environment/catalog, active subscriptions, unsafe routes, all database-published courses versus actual public/member access, backup location, and rollback prerequisites. No production or Stripe mutation occurs. | [Dated preflight report](../audits/lean-l0-01-read-only-preflight-2026-08-06.md) accepted by Jen on 2026-08-06. Migration drift and unsafe authority confirmed; live Stripe has 0 subscriptions, stale prices/webhook configuration remain; no verified restorable DB backup exists. |
| `LEAN-L0-02` | Adversarial authorization baseline | S / 2 | Build | L0-01 | `done` | Tests demonstrate whether a normal customer can alter protected user fields, enrollment/access state, cache, usage, credits, or another account; current failures are captured before repair. | [Accepted baseline](../audits/lean-l0-02-authorization-baseline-2026-08-06.md): production catalog evidence plus 48 rollback-only local probes, 11 secure passes, 37 security failures, 0 inconclusive, and 0 residue. Jen accepted the combined evidence on 2026-08-06. The [production probe proposal](../audits/lean-l0-02-production-rollback-test-review-2026-08-06.md) is retired and must not be retried. |
| `LEAN-L0-03` | Permission and server-authority hotfix | M / 3 | Build | L0-02 | `done` | Customer mutation of tier, Stripe IDs, billing status, role, credits, protected enrollment, shared cache, and authoritative usage fails; legitimate server paths still work; migrations are forward-only. | The [restricted backup and disposable restore evidence](../audits/lean-l0-03-backup-restore-gate-2026-08-10.md) cleared the prerequisite. [Local hotfix evidence](../audits/lean-l0-03-permission-hotfix-local-2026-08-10.md) proved forward/reversal behavior. [Production verification](../audits/lean-l0-03-production-verification-2026-08-10.md) records commit `179f270`, a Ready 136-page deployment, unsafe API privilege pairs 22→0, exposed protected functions 7→0, seven RLS/read-policy repairs, retained service authority/shared reads, live HTTP checks, and migration-ledger confirmation. |
| `LEAN-L0-04` | Disable stale sales and unmetered bypasses | M / 3 | Build | L0-01 | `done` | Old Checkout cannot sell unsupported offers; unknown Price mapping fails closed; generic/unmetered AI and image routes are disabled or safely gated until their lean packets land. | [Dated closure evidence](../audits/lean-l0-04-stale-sales-unmetered-closure-2026-08-06.md): centralized server-only guards default closed; Checkout requires exact action and Price allowlists; 13 routes plus one conditional AI branch are contained before side effects; 8 focused tests, global typecheck, focused lint, diff check, and production build pass. No external state changed. |
| `LEAN-L0-05` | Staging/production verification and rollback gate | M / 3 | Both | L0-03, L0-04 | `done` | Authorization suite, smoke tests, deployed-schema check, and rollback/kill-switch rehearsal pass in the intended environment; evidence contains no secrets or PII. | [Production verification](../audits/lean-l0-05-production-verification-2026-08-10.md) records exact commit `11ef501`, Ready Vercel deployment, both domain aliases, four core 200 checks, unchanged secure L0-03 catalogs, absent production enablement variables, 16/16 logged-out authorization stops, combined inner-guard proof from 11/11 tests, and zero error/500 logs. No test user, bypass, environment change, database change, Stripe activity, or rollback occurred. |

## Phase L1 — Durable course beta

**Gate:** PRE proves that an eligible learner can enter, save work and progress, reload it, and remain inside sanitized access boundaries.

| ID | Work packet | Effort | Owner | Depends on | Status | Acceptance evidence | Evidence |
|---|---|---:|---|---|---|---|---|
| `LEAN-L1-01` | V2 learner progress and save contract | M / 3 | Build | L0-05 | `done` | One documented typed contract defines course/week identifiers, progress and week-save semantics, Journal metadata, authorization, errors, and reload behavior. It establishes the narrow server-owned free-course allowlist with PRE as its sole entry and never derives access from database `published`. It explicitly excludes billing effects, retained completed-course access, slot release, certificates, and a generalized completion lifecycle. | [Local verification](../audits/lean-l1-01-v2-learner-progress-save-contract-local-2026-08-10.md): one server-only typed contract plus its plain-language guide; 8/8 focused tests, global TypeScript, and diff checks pass. No route, database, environment, Stripe, deployment, production, or course data changed. |
| `LEAN-L1-02` | Server progress endpoint and RLS | M / 3 | Build | L1-01 | `done` | A verified Reader authorized by the PRE-only free-course allowlist can persist/retrieve only their own PRE progress; anonymous, non-allowlisted-course, cross-user, malformed, and replay paths fail safely. | [Local verification](../audits/lean-l1-02-server-progress-local-2026-08-10.md): exact PRE GET/PUT route, forward service-only atomic/RLS migration, 8-case transactional database story with zero residue, 14/14 focused tests, lint, TypeScript, diff check, and 136/136-page build pass. Production was not connected or changed. |
| `LEAN-L1-03` | V2 workbook/Journal saves | M / 3 | Build | L1-01, L0-05 | `done` | Workbook work saves through the authorized Journal API with course/week/source metadata and survives reload. Reader has a 50-active-page limit and paid is unlimited. A paid/legacy account returning to Reader above 50 retains read/edit access to all pages, loses no work, and cannot create or restore an active page until it archives below 50. | [Local verification](../audits/lean-l1-03-learner-journal-local-2026-08-10.md): PRE-only GET/PUT Journal route, canonical forward schema/RLS/RPC/limit migration, 13-case rollback-only PostgreSQL story with zero residue, 21/21 focused L1 tests, lint, TypeScript, diff checks, and 136/136-page build pass. Production was not changed. |
| `LEAN-L1-04` | Learner save/progress UI | M / 3 | Build | L1-02, L1-03 | `done` | V2 shows clear saving, saved, error, and retry states; refresh/new session restores work and progress; keyboard and narrow-screen use pass. A Journal-cap denial preserves unsaved input, explains the 50-page rule, and links the archive-to-make-room path. | [Local verification](../audits/lean-l1-04-learner-persistence-ui-local-2026-08-11.md): PRE-only V2 progress/Journal integration; clean and dirty reload merge; saving, saved, retryable error, conflict, missing-save, and 50-page-cap states; 32/32 L1 tests; focused lint; TypeScript; 375×812 keyboard/browser story; zero horizontal overflow; and 136/136-page build. Production was not changed. |
| `LEAN-L1-05` | PRE full-story course gate | M / 3 | Both | L1-04 | `done` | A verified non-admin Reader in a test fixture proves public preview → sign-in → free PRE enrollment/access → work save → progress save → reload in a real browser; public payload remains sanitized and rollback is recorded. | [Local full-story verification](../audits/lean-l1-05-pre-full-story-local-2026-08-11.md): real Chromium, Next.js routes, local Supabase auth/PostgreSQL, non-admin free Reader, public preview → keyboard sign-in → `201` enrollment → full access → progress and Journal saves → separate-session 375×812 reload. Anonymous payloads stayed sanitized; a real Reader-cap `403` preserved the exact draft; 32/32 L1 tests, lint, TypeScript, and diff checks passed; tagged cleanup returned zero residue. Production was not changed. |

## Phase L2 — Monthly billing and catalog

**Gate:** The four monthly offers resolve through one server-owned catalog; paid state is projected idempotently from verified Stripe events; customer billing flows cannot self-grant access or duplicate subscriptions.

| ID | Work packet | Effort | Owner | Depends on | Status | Acceptance evidence | Evidence |
|---|---|---:|---|---|---|---|---|
| `LEAN-L2-01` | Shared plan/action/course-release catalog and launch flags | M / 3 | Both | L0-05, L1-01 | `ready` | Server catalog extends L1's PRE-only free-course authority—without duplicating it—and defines Reader 10, Student founding $15/30, inactive Student standard $19, Scholar $39/100, cost-gated Adept $69/300, member-released course allowlist, and a Jen-approved `student_launch_course_slug`; UI consumes safe projections; raw Price IDs stay server-side. Initial public configuration requires exactly one paid member-released course matching the Student slug. | — |
| `LEAN-L2-02` | Membership schema and entitlement resolver | L / 5 | Build | L2-01, L0-05 | `not_started` | Forward migration creates server-owned membership/cohort/status projection; one resolver returns plan, credits, and allowlisted course entitlement. Database `published` never grants membership access by itself; customer writes, unknown state, and ambiguous release configuration fail closed. | — |
| `LEAN-L2-03` | Exact monthly Stripe catalog verification | M / 3 | Both | L2-01 | `not_started` | Each configured Price is verified for account mode, product, currency, amount, monthly interval, active state, and offer. Any verified prelaunch live Price remains untouched while entitlement is mapped; mismatches/unknowns quarantine and block launch rather than granting Scholar or triggering automatic cancellation. | — |
| `LEAN-L2-04` | Server-authoritative Checkout and idempotency | M / 3 | Build | L2-02, L2-03 | `not_started` | Checkout accepts only an active offer code and request ID; forged Price/mode/amount fails; replay produces one session; an existing paid member cannot create a second subscription. | — |
| `LEAN-L2-05` | Service-owned webhook inbox and membership projector | L / 5 | Build | L2-02, L2-03 | `not_started` | Raw signature and service role are used; unique event inbox handles duplicate, delayed, out-of-order, database-failure, replay, cancellation, and unknown-Price cases without false success. | — |
| `LEAN-L2-06` | Billing summary, portal, reconciliation, and monthly lifecycle gate | M / 3 | Both | L2-04, L2-05 | `not_started` | Checkout return cannot grant access; customer-scoped reconcile, renewal, cancellation, and refund/correction tests agree with Stripe and database state; rollback is documented. A continuous founding subscription renews at $15; cancel-at-period-end plus pre-terminal reactivation retains it; terminal end loses it once closed to new Checkout. Stripe Portal plan switching is disabled—the lean portal supports payment methods, invoices, and cancellation only. Cancellation to Reader never deletes/archives Journal pages; an over-limit account follows the retain/read/edit-but-no-new-page rule. | — |

## Phase L3 — Monthly credit core

**Gate:** Monthly allowances grant once, enabled requests cannot overspend, every reservation settles once, and customer sessions cannot forge wallet history.

| ID | Work packet | Effort | Owner | Depends on | Status | Acceptance evidence | Evidence |
|---|---|---:|---|---|---|---|---|
| `LEAN-L3-01` | Account, grant, reservation, transaction, and usage schema | L / 5 | Build | L2-02 | `not_started` | Forward migration creates the lean append-only model with unique source/request keys, expiry, non-negative/accounting constraints, and service-owned writes; no pack/rollover/debt machinery is added. | — |
| `LEAN-L3-02` | Idempotent monthly reset grants | L / 5 | Build | L3-01, L2-05 | `not_started` | Reader receives 10 once per UTC calendar month, expiring at the next UTC month boundary; paid tiers receive 30/100/300 once per verified Stripe monthly period. Verified paid activation expires the remaining Reader grant and issues the full paid allowance; `cancel_at_period_end` preserves it through period end; terminal paid end expires it and issues the current Reader grant only if that UTC-month Reader source key has never existed. Renewal, delayed event, retry, and boundary tests are deterministic; no rollover occurs. | — |
| `LEAN-L3-03` | Atomic reserve, commit, release, and stale recovery | L / 5 | Build | L3-01, L3-02 | `not_started` | Concurrent requests cannot overspend; request replay, hash conflict, double settlement, provider/persistence failure, and stale reservation recovery preserve the accounting invariant. | — |
| `LEAN-L3-04` | Safe wallet summary and history | M / 3 | Build | L3-02, L3-03 | `not_started` | Server returns current balance, reset/expiry date, recent safe transactions, and pending state; users see only their account and cannot mutate authoritative rows. | — |
| `LEAN-L3-05` | Credit invariant, concurrency, and RLS phase gate | M / 3 | Both | L3-02, L3-03, L3-04 | `not_started` | Twenty simultaneous reservations cannot produce a negative or overspent account. For every account, authoritative available balance equals unexpired grants and adjustments minus committed debits and active reservations; it agrees with the cached balance. Adversarial RLS tests pass and no unexplained pending reservation remains. | — |

## Phase L4 — Initial tool metering

**Gate:** Every enabled generative route uses one auditable reservation adapter, costs match the catalog, failures return credits, bypasses stay closed, and cost/abuse telemetry supports launch decisions.

| ID | Work packet | Effort | Owner | Depends on | Status | Acceptance evidence | Evidence |
|---|---|---:|---|---|---|---|---|
| `LEAN-L4-01` | Shared metering adapter, telemetry, abuse controls, and flags | L / 5 | Build | L3-05 | `not_started` | Auth → entitlement → quote → reserve → provider → persist → commit/release is shared; verified-email, size, concurrency, velocity, global/per-action kill switches, and privacy-safe cost telemetry work in off/shadow/enforce modes. The Reader breaker atomically counts committed plus in-flight estimated Reader provider cost per UTC month, fails closed only for Reader generation at the configured threshold, resets on the UTC month boundary, and audits server-only overrides. | — |
| `LEAN-L4-02` | Meter The Working at 1 credit | M / 3 | Build | L4-01 | `not_started` | Success commits once; provider, moderation, timeout, empty-response, and persistence failures release once and preserve customer work; cost appears before action. | — |
| `LEAN-L4-03` | Meter Seven Lenses at 2/3 credits | L / 5 | Build | L4-01 | `not_started` | Standard/long costs are 2/3; streaming commits at the defined durable boundary; abort/error/stale paths release correctly; client cannot invent cost/balance. | — |
| `LEAN-L4-04` | Meter expanded lens at 1 credit | M / 3 | Build | L4-01, L4-03 | `not_started` | Expansion costs one credit through the same adapter; retries and failures are idempotent; parent synthesis and expansion cannot double-charge each other. | — |
| `LEAN-L4-05` | Fail-closed Deep Search, image, and generic bypasses | S / 2 | Build | L4-01 | `not_started` | Fresh Deep Search, image generation, and any generic unmetered generation cannot be publicly invoked; ordinary search/Library/Graph remain free and functional. | — |
| `LEAN-L4-06` | Enabled-generation full-story gate | M / 3 | Both | L4-02, L4-03, L4-04, L4-05 | `not_started` | Real browser/API/database/provider stories prove success, insufficient balance, concurrency, failure return, telemetry, and kill switch for every enabled action; bypass probe passes. | — |

## Phase L5 — Customer UI, shadow costs, canary, and launch

**Gate:** Customers see the exact lean offer and server truth; the complete paid loop survives canary; allowances have defensible cost evidence; rollback and monitoring are ready.

| ID | Work packet | Effort | Owner | Depends on | Status | Acceptance evidence | Evidence |
|---|---|---:|---|---|---|---|---|
| `LEAN-L5-01` | Lean public pricing UI | M / 3 | Build | L2-06 | `not_started` | Reader/Student/Scholar and conditionally Adept show exact monthly price, credits, the named Student launch course, all-course distinction, 50-versus-unlimited Journal rule, tool-only path, optional courses, and honest YouTube wording from the shared catalog; deferred offers do not appear. | — |
| `LEAN-L5-02` | Account billing surface | M / 3 | Build | L2-06 | `not_started` | Exact plan/cohort/status/renewal and portal/cancel actions render from server truth; founding language is accurate; no raw Price or duplicate-subscribe path appears. | — |
| `LEAN-L5-03` | Wallet and tool-cost customer states | L / 5 | Build | L3-04, L4-06 | `not_started` | Balance/reset date/history and required-versus-available cost are clear; reserved, committed, returned, insufficient, disabled, free-capacity-paused, and retry states preserve customer work and pass responsive/keyboard checks. Reader-breaker messaging gives the UTC reset without blocking paid or non-generative use. | — |
| `LEAN-L5-04` | Internal shadow cost study and tier economics gate | M / 3 | Both | L4-06 | `not_started` | A dated report covers at least 7 consecutive shadow days and 30 successes across at least 3 test accounts: at least 5 each for Working, expansion, standard, and long, including default and maximum permitted sizes. Failure/abort/retry tests are separate. It verifies current provider prices; models the costliest permitted full-use mix; compares cost, high-percentile use, payment fees, and marginal infrastructure against predeclared ceilings; and records `enable`, `hold`, or `revise` for Student, Scholar, and Adept plus the Reader subsidy/breaker decision. Adept defaults to hold if heavy-use evidence is insufficient. | — |
| `LEAN-L5-05` | Production canary and public launch gate | L / 5 | Both | L1-05, L3-05, L5-01, L5-02, L5-03, L5-04 | `not_started` | L5-04 records `enable` for Reader, Student, and Scholar; Adept may be `enable` or `hold`. Any `revise` result reopens and refreshes every affected catalog, grant, metering, wallet, pricing, and evidence packet before canary. A small real cohort then completes pricing → Checkout → webhook → entitlement → monthly grant → named Student course save/tool use → account/portal. Evidence shows one Checkout/subscription projection, one grant source for the period, the wallet equation holds, no overdue reservation exists, only the explicit release allowlist grants course access, and Stripe/database state agrees. Jen approves public flags; live smoke and rollback pass. | — |
| `LEAN-L5-06` | Initial monitoring and stabilization | S / 2 | Both | L5-05 | `not_started` | During the first 72 hours after public enablement, billing, credit, provider-cost, reservation, course-save, authorization, and support signals are reviewed; anomalies have owners/actions; immediate rollback remains available. | — |

## Deferred expansion register

These items do not count toward 114 launch points. Add them only after the evidence trigger in the lean plan is met and the tracker is deliberately re-scoped.

| Item | Earliest trigger |
|---|---|
| Student $19 standard offer | Explicit price review after stable billing, activation, retention, support, and cost evidence |
| Annual plans | Proven monthly retention and customer demand |
| Add-on credit packs | Repeated legitimate exhaustion/tool-only demand |
| Included-credit rollover | Evidence of material reset anxiety or retention harm |
| Student course selection/switching | Before the second released paid course opens |
| Deep Search metering/cache | Versioned service cache and verified reservation/cost behavior |
| Signed-in interactive Week 1 | Funnel evidence that public preview/video is insufficient |
| Image generation | Separate cost, safety, and product decision |
| Record of Completion | Trustworthy completion evidence and reviewed non-accredited language |
| Advanced billing/course lifecycle | Demonstrated real-world need |

## Risks

| ID | Severity | Risk | Immediate response | State |
|---|---|---|---|---|
| LR-01 | Critical | Customer sessions may mutate protected user, enrollment, cache, or usage state. | L0 preflight, adversarial baseline, and permission hotfix precede sales. | Resolved by verified L0-03 production repair |
| LR-02 | Critical | Multiple migration trees may differ from production. | Inventory and compare first; forward reconciliation only. | Confirmed in L0-01 |
| LR-03 | High | Current Checkout/webhook behavior can trust the wrong authority or silently fail. | Server offer codes, exact verification, service-owned inbox/projector, and replay tests. | Checkout creation contained in L0-04; final billing authority remains L2 |
| LR-04 | High | Mixed/unmetered tool paths could spend provider money without reliable accounting. | Close bypasses in L0; reopen only through the L4 adapter. | Contained and verified in production by L0-05; reopening remains gated |
| LR-05 | High | Course value is weakened if saved workbook/progress behavior is unreliable. | Complete PRE full-story gate in L1 while content production proceeds separately. | Resolved by the verified local L1 gate; production canary remains in L5 |
| LR-06 | High | Any allowance may be uneconomic before representative usage exists, especially Adept and free Reader subsidy. | Test conservative full use against predeclared ceilings; hold/revise any failing tier and default Adept to hold when evidence is thin. | Open |
| LR-07 | Medium | Deferred features may creep back into the launch. | Treat the full blueprint as reference; update scope and points before adding work. | Controlled |
| LR-08 | High | Database `published` state may accidentally expose any of 29 content records as a released member course. | Inventory in L0; use an explicit server release allowlist and one Student launch slug that fail closed when ambiguous. | Preview breadth confirmed; full access currently PRE only |

## Decision register

| ID | Date | Decision | State |
|---|---|---|---|
| LD-01 | 2026-08-06 | Immediate build is the 25–35 day lean program, not the 50–70 day full blueprint. | Frozen |
| LD-02 | 2026-08-06 | Reader/Student/Scholar/Adept receive 10/30/100/300 non-rollover monthly credits. | Frozen |
| LD-03 | 2026-08-06 | Launch pricing is $0, $15 founding, $39, and cost-gated $69; monthly only. | Frozen |
| LD-04 | 2026-08-06 | Student standard $19 exists only as an inactive future catalog offer. | Frozen |
| LD-05 | 2026-08-06 | No annual billing, credit packs, or rollover at launch. | Frozen |
| LD-06 | 2026-08-06 | Student gets the one explicitly configured launch course; selection/switching is required before a second paid course opens. | Frozen |
| LD-07 | 2026-08-06 | Scholar and enabled Adept receive all released courses. Courses remain optional. | Frozen |
| LD-08 | 2026-08-06 | Meter The Working and Seven Lenses first; keep Deep Search/image/generic bypasses closed. | Frozen |
| LD-09 | 2026-08-06 | Course and YouTube production start now on a separate tracker and do not wait for membership launch. | Frozen |
| LD-10 | 2026-08-06 | Public videos/resources are an accessibility path, not an all-content-free or publishing-cadence promise. | Frozen |
| LD-11 | 2026-08-06 | Database `published` is not customer release authority; the server catalog explicitly allowlists released courses and exactly one initial Student course. The actual paid launch slug remains a pre-sales business decision. | Frozen rule; slug open |
| LD-12 | 2026-08-06 | Reader grants follow UTC calendar months; paid grants follow verified Stripe monthly periods; neither rolls over. | Frozen |
| LD-13 | 2026-08-06 | Reader keeps the existing 50-active-Journal-page limit; paid tiers are unlimited. | Frozen |
| LD-14 | 2026-08-06 | The $15 founding Price lasts while that subscription is uninterrupted; a future $19 cutover affects new Checkout only, and terminal lapse loses founding eligibility after the offer closes. No cross-tier preservation is promised because plan switching is deferred. | Frozen |

Any change to a frozen decision requires a dated row here, an update to the lean plan, affected packet/point changes, and customer-copy review. It must not be changed only in code.

“Frozen” identifies the current implementation target. It does not force a public launch when the cost gate fails. A documented prelaunch `hold` or `revise` result must update the affected decision and customer copy before sales open.

## Session rhythm

### Start

1. Read the dashboard, active risks, selected packet, and its dependencies.
2. Confirm dependencies are `done`.
3. Mark exactly one packet `in_progress` and state its acceptance boundary.
4. Inspect live code/schema before editing and preserve unrelated worktree changes.

### Finish

1. Run risk-proportionate targeted tests and boundary checks.
2. Capture privacy-safe browser/API/database/Stripe/provider evidence as applicable.
3. Mark the packet `verifying`, `done`, or `blocked`; unfinished work earns no points.
4. Record limitations, rollback, evidence, and any decision change.
5. Recalculate phase and total points.
6. Add one session-log row and set the next dependency to `ready` only when valid.

## Session log

| Date | Packet(s) | Outcome and evidence | Verified progress | Decisions or blockers |
|---|---|---|---:|---|
| 2026-08-06 | Planning reset | Replaced the 216-point full-build tracker with this 114-point lean tracker; created a separate course board; reclassified the full blueprint as deferred. No application code, database, Stripe object, or deployment changed. | 0 / 114 (0%) | `LEAN-L0-01` is the only ready packet. |
| 2026-08-06 | `LEAN-L0-01` | Completed and accepted the read-only production/schema/migration/Stripe/route preflight. The [privacy-safe report](../audits/lean-l0-01-read-only-preflight-2026-08-06.md) confirms migration drift, customer-writable authority, stale live Stripe prices/webhook configuration, unmetered routes, 29 public previews with PRE as the only full open course, and no verified restorable DB backup. No external mutation occurred. | 3 / 114 (2.6%); packet `done` | Jen accepted the evidence. L0-02 and L0-04 are ready; L0-03 production execution additionally requires a fresh restore-tested backup. |
| 2026-08-06 | `LEAN-L0-02` | Completed the [authorization baseline](../audits/lean-l0-02-authorization-baseline-2026-08-06.md) from accepted production catalog evidence plus a guarded local suite: 48 probes, 37 security failures, 11 secure passes, 0 inconclusive, and 0 residue. A separately approved production connection was rejected before SQL; Jen then accepted the combined evidence and permanently retired further production/staging adversarial probing. The production runner was deleted and SQL remains local/staging-only. | 5 / 114 (4.4%); packet `done` | L0-04 is next. L0-03's dependency is satisfied, but production permission repair remains gated by a fresh restore-tested backup. |
| 2026-08-06 | `LEAN-L0-04` | Completed the [application closure](../audits/lean-l0-04-stale-sales-unmetered-closure-2026-08-06.md). Checkout and confirmed customer-reachable unmetered AI/image/provider-cost paths now use independent default-closed server action guards before side effects; Checkout additionally requires an exact server Price allowlist. Eight focused tests, global typecheck, focused lint, diff check, and the Next.js production build pass. No Stripe, Supabase, Vercel, staging, production, or deployed environment state changed. | 8 / 114 (7.0%); packet `done` | L0-02 remains accepted and its adversarial production/staging path remains retired. L0-03 production execution is still gated by a fresh restricted restore-tested logical backup and explicit approval. |
| 2026-08-10 | `LEAN-L0-03` backup gate | Created a fresh restricted logical production backup and completed a network-disabled disposable restore using the exact production Supabase Postgres release. The [privacy-safe evidence](../audits/lean-l0-03-backup-restore-gate-2026-08-10.md) records EFS/ACL controls, file hashes and sizes, retention, cleanup, and aggregate verification of 101 tables and 64,990 rows. No application migration or application schema/data mutation occurred; Supabase's passwordless CLI initialized its temporary platform-managed login role for export access. | 8 / 114 (7.0%); packet `ready` | The backup prerequisite is satisfied. Draft/review may proceed locally, but production migration execution requires a separate exact approval. |
| 2026-08-10 | `LEAN-L0-03` local repair | Wrote the forward permission migration, guarded reversal, local SQL runner, and server-authority changes. [Local evidence](../audits/lean-l0-03-permission-hotfix-local-2026-08-10.md) records 48/48 secure probes, 11 protected-table checks, seven RLS repairs, six locally present protected definer functions, four service mutation smokes, working auth triggers/shared reads, exact 11/37 reversal reproduction, 48/48 restoration, zero residue, 3/3 authority tests, 8/8 containment tests, global typecheck, and a 136-page build. | 8 / 114 (7.0%); packet `verifying` | Production/staging were not connected or changed. Points remain unearned until the separately approved production step satisfies the packet boundary. Unrelated course migrations/work were preserved. |
| 2026-08-10 | `LEAN-L0-03` production repair | Jen approved the exact nine-file release. Commit `179f270` deployed Ready on Vercel with 136/136 pages; `prismarium.xyz` and `www` point to it. The one reviewed migration was applied directly, read-only catalogs changed from 22 unsafe API table pairs and seven exposed functions to zero, all seven shared RLS/read policies and trusted server grants passed, live public/protected-route smoke checks passed, and only version `20260810210000` was recorded applied. See [production evidence](../audits/lean-l0-03-production-verification-2026-08-10.md). | 11 / 114 (9.6%); packet `done` | No rollback was needed. Course work, unrelated migrations, L0-04 containment, Stripe, and environment values were excluded. L0-05 is now active and requires a new exact approval before its remaining production changes. |
| 2026-08-10 | `LEAN-L0-05` production containment | Jen approved the exact 20-file runbook. Commit `11ef501` deployed Ready to both Prismarium domains with 136/136 pages. Core pages/APIs returned 200, L0-03 catalogs remained secure, production enablement variables were absent, all 16 logged-out paid/provider requests stopped at middleware, exact deployed inner guards remained proven by 11/11 tests, and Vercel reported zero error/500 logs. See [production evidence](../audits/lean-l0-05-production-verification-2026-08-10.md). | 14 / 114 (12.3%); packet `done`; Phase L0 complete | No authenticated production fixture was created; the inner 503 proof combines deployed source, absent settings, and exact runtime/order tests. No rollback, database, Stripe, environment, staging, or course change occurred. `LEAN-L1-01` is next. |
| 2026-08-10 | `LEAN-L1-01` local learner contract | Added one server-only typed PRE progress/week-save contract, an exact PRE-only free-course allowlist, stable authorization/error/reload semantics, and a plain-language guide. [Local evidence](../audits/lean-l1-01-v2-learner-progress-save-contract-local-2026-08-10.md) records 8/8 tests plus passing TypeScript and diff checks. | 17 / 114 (14.9%); packet `done` | No route, database, environment, Stripe, deployment, production, or course data changed. L1-02 and L1-03 are ready; L1-02 is next. |
| 2026-08-10 | `LEAN-L1-02` local PRE progress | Added the authenticated PRE progress GET/PUT route and a forward service-only atomic/RLS migration. [Local evidence](../audits/lean-l1-02-server-progress-local-2026-08-10.md) records owner success, identical replay, changed/stale/non-PRE/unknown-week denials, cross-user hiding, closed direct mutation, zero residue, 14/14 focused tests, lint, TypeScript, diff, and 136/136 pages. | 20 / 114 (17.5%); packet `done`; Phase L1 6/15 | Local Supabase was stopped after testing. No production, deployment, Stripe, environment, real user, or course-data change occurred. L1-03 is next. |
| 2026-08-10 | `LEAN-L1-03` local PRE workbook/Journal | Added the authenticated PRE Journal GET/PUT route, full progress-plus-work reload snapshot, forward canonical workbook metadata/replay/RLS/RPC migration, and database-wide Reader cap trigger. [Local evidence](../audits/lean-l1-03-learner-journal-local-2026-08-10.md) records Reader 50/51 behavior, paid unlimited, no-loss downgrade/edit/archive/restore behavior, replay/revision and access denials, 0 residue, 21/21 focused tests, lint, TypeScript, diff checks, and 136/136 pages. | 23 / 114 (20.2%); packet `done`; Phase L1 9/15 | Local Supabase was stopped and its volume retained. No push, deployment, remote migration, Stripe, environment, real user, or production change occurred. L1-04 is next. |
| 2026-08-11 | `LEAN-L1-04` local PRE learner persistence UI | Connected the exact PRE V2 screen to progress and Journal reload/save behavior. [Local evidence](../audits/lean-l1-04-learner-persistence-ui-local-2026-08-11.md) records clean/dirty reload, saving/saved/error/conflict/retry/cap states, missing-save recovery, input preservation, keyboard operation, 375×812 layout with no horizontal overflow, 32/32 L1 tests, lint, TypeScript, and a 136/136-page build. | 26 / 114 (22.8%); packet `done`; Phase L1 12/15 | Browser APIs were mocked to exact route shapes; L1-05 owns the authenticated non-admin Reader/database/new-session full story. No push, deployment, migration, database, Stripe, environment, real user, or production change occurred. L1-05 is ready. |
| 2026-08-11 | `LEAN-L1-05` local PRE full story | A [real local browser/API/database story](../audits/lean-l1-05-pre-full-story-local-2026-08-11.md) proved public PRE preview → keyboard sign-in → free Reader enrollment → full access → progress and Journal saves → separate-session reload. Anonymous responses stayed sanitized, a real cap `403` preserved the exact draft, 375×812 and keyboard checks passed, 32/32 L1 tests plus lint/TypeScript/diff checks passed, and tagged cleanup left zero residue. | 29 / 114 (25.4%); packet `done`; Phase L1 complete at 15/15 | No push, deployment, remote migration, Stripe, environment, production user, or production data change occurred. `LEAN-L2-01` is ready. |

## Immediate next move

Phases L0 and L1 are complete at 14/14 and 15/15 phase points. The launch is now 29/114 total points (25.4%). `LEAN-L2-01` is ready: build one server-owned catalog for the frozen lean plans, action costs, explicit released-course allowlist, and launch flags while extending—rather than duplicating—the PRE-only free-course authority. The paid Student launch slug remains an open business decision and must fail closed until Jen approves it. Do not change production without a new exact approval; preserve L0-02 as accepted and all unrelated course work.
