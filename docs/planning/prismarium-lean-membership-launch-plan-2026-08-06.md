# Prismarium lean membership launch plan

**Date:** August 6, 2026  
**Status:** Controlling plan for the immediate membership build  
**Forecast:** 25–35 focused engineering days  
**Execution tracker:** [Prismarium membership implementation tracker](prismarium-membership-implementation-tracker.md)  
**Parallel course board:** [Prismarium course production tracker](prismarium-course-production-tracker.md)  
**Later expansion reference:** [Full membership, credits, and courses blueprint](prismarium-membership-credits-development-plan-2026-08-06.md)

This plan is the approved answer to a practical question: how can Prismarium charge in a way that reflects its value without delaying the courses for 50–70 engineering days or building systems that have not yet been justified by real demand?

The answer is a secure monthly membership foundation, a small credit wallet, reliable course saving, and metering for the tools that are ready. Course writing, rehearsal, recording, editing, and public-video production begin immediately on a separate track. Turning on paid course access still follows the membership launch gates.

## 1. Why this is the right-sized plan

The preliminary August 6 audit snapshot found strong product breadth but almost no paid-market evidence yet:

- 29 courses are published in the database, but only one enrollment was observed.
- The audited production aggregate contained 3 users, including 2 admins.
- No Student or Adept account was observed; the one Scholar account was an admin.
- Only 3 AI queries were observed in the prior 30 days.
- The locally configured Stripe account was in test mode with no active subscriptions or revenue.
- Public previews and a substantial course presentation system already exist.
- The V2 course learner still needs dependable saved work and progress behavior.

> These aggregates are planning context, not final launch evidence. `LEAN-L0-01` must revalidate the production/schema/Stripe facts in a dated privacy-safe artifact, and L1 must rerun the relevant course tests before either claim earns implementation credit.

Those facts do not mean the product lacks value. They mean the next investment should prove a trustworthy paid loop before adding annual-plan edge cases, purchased-credit accounting, rollover, or a complex course-slot engine.

## 2. Launch product contract

### 2.1 Plans

| Capability | Reader | Student | Scholar | Adept |
|---|---:|---:|---:|---:|
| Monthly price | $0 | **$15 founding** | **$39** | **$69, launch-gated** |
| Monthly Prism Credits | **10** | **30** | **100** | **300** |
| Course access | Public/free course paths | One explicitly configured launch course | All explicitly released courses | All explicitly released courses |
| Library and non-generative research tools | Included | Included | Included | Included |
| Active Journal pages | **50** | Unlimited | Unlimited | Unlimited |
| Saved course work and progress | Public/free paths | Included for accessible course | Included | Included |
| Generative tools | Credit-metered | Credit-metered | Credit-metered | Credit-metered |

“Launch-gated” means Adept is built into the catalog and entitlement model but is not sold until shadow cost data shows that 300 credits at $69 leaves a safe margin. If the evidence is good, it may launch with the other tiers; otherwise its public flag remains off.

### 2.2 Positioning

- Courses are optional. The product must present courses and independent research tools as parallel ways to use Prismarium.
- Public videos and course resources are an accessibility path, not a promise that every future video or creator format will always be free.
- Membership value comes from the durable environment: organized sources, guided learning, saved work, progress, the Library and Graph, and carefully metered generative tools.
- The offer must remain valuable during months when no new YouTube video is published. No tier promises a content cadence.
- Reader is a real free account, not a disabled demo. It receives 10 monthly credits and access to the free/public learning path.
- Student is the low-cost paid entry. Its founding price is $15 monthly. The later $19 standard offer is represented in the server catalog but stays inactive until a separate evidence-based decision.
- “Founding” attaches to the uninterrupted `student_founding_monthly` subscription, not permanently to an account. It renews at $15 while continuous; `cancel_at_period_end` keeps it through period end, reactivation before terminal end retains it, and terminal cancellation/lapse loses it once the founding offer is closed to new Checkout. Plan switching is disabled, so no cross-tier founding-preservation engine is promised at launch.
- Scholar is the complete default membership: meaningfully more tool capacity and all released courses without artificial concurrency rules.
- Adept is a high-volume option, never described as unlimited. All plans remain subject to transparent safety and abuse protections.

### 2.3 Monthly credits

| Server action | Customer action | Launch cost | Launch state |
|---|---|---:|---|
| `working.generate` | The Working | 1 credit | Enabled after metering |
| `seven_lenses.expand` | Expand one lens | 1 credit | Enabled after metering |
| `seven_lenses.standard` | Standard Seven Lenses synthesis | 2 credits | Enabled after metering |
| `seven_lenses.long` | Long Seven Lenses synthesis | 3 credits | Enabled after metering |
| `deep_search.fresh` | Fresh Deep Search synthesis | 3 credits, provisional | Disabled/beta until cache and metering are safe |
| `image.generate` | Image generation | Not offered | Disabled |
| — | Library, ordinary search, Graph, Journal, saved-result reopen | 0 credits | Included |

The server determines the action and cost. The browser never submits a price. Every enabled paid generation reserves credits atomically, commits once on success, and releases the reservation on failure.

The 1/1/2/3 weights are launch hypotheses, not claims that the economics are already proven. Before public sales, the shadow study may recommend keeping, revising, or holding an action/allowance. Any revision must be recorded in the plan and tracker before customer copy changes.

### 2.4 Reset and access rules

- Reader credits use UTC calendar months: grant once on the first wallet access in that month and expire at 00:00 UTC on the first day of the next month.
- Paid credits use the verified Stripe monthly subscription period: grant once per paid period and expire at that period end. On a terminal return to Reader, the account may receive the current UTC Reader grant once if it has not already received it for that calendar month.
- On verified paid activation, expire any remaining Reader grant and issue the full paid-period allowance. `cancel_at_period_end` leaves the paid allowance active through the verified period end. At terminal paid-access end, expire the paid grant and issue the current Reader grant only if that UTC-month Reader source key has never been issued.
- Included credits do not roll over at launch.
- There are no add-on credit packs at launch.
- There is no annual billing at launch.
- A database course row marked `published` is content state, not membership-release authority.
- A server-owned release allowlist defines free/public courses and member-released paid courses. A separate `student_launch_course_slug` must name exactly one member-released paid course before Student sales open.
- Student receives only `student_launch_course_slug` during the single-course launch. Jen approved `c01-how-humans-know-what-they-know` as the exact initial slug on August 11, 2026; it is not inferred from database order or the first `published` row. Approval alone does not release the course or enable paid sales.
- Before a second paid course opens, Prismarium must add an explicit Student course-selection and switching flow that preserves prior work.
- Scholar and Adept receive every paid course on the explicit member-release allowlist.
- Reader may keep at most 50 active Journal pages; paid tiers are unlimited. Archiving remains the zero-cost way to make room.
- A paid-to-Reader transition never deletes or auto-archives Journal work. An over-limit Reader can read and edit every existing page but cannot create or restore another active page until archiving brings the active count below 50; unsaved course input must be preserved when this limit blocks a save.
- Existing public course previews and YouTube links remain available without requiring a paid membership.
- Generative work in a course should have a zero-credit alternative whenever reasonable. A course should not silently force an upgrade.

## 3. Current app versus lean launch

| Area | Current behavior observed | Lean launch target |
|---|---|---|
| Reader allowance | Marketing and enforcement disagree; one path is effectively 1 lifetime query | 10 credits every month from one server-owned source |
| Student | $15, 5-query language, broad paid-course access | $15 founding, 30 credits, one explicitly configured launch course |
| Scholar | $29, 25-query language, little course distinction | $39, 100 credits, all released courses |
| Adept | $49, 50-query language | $69, 300 credits, public sale gated by cost evidence |
| Billing | Browser can supply raw Stripe Price/mode; projection and webhook paths are unsafe | Server offer codes, exact catalog validation, idempotent service-owned projection |
| Tool usage | Mixed lifetime/query limits and bypasses | One reserve/commit/release credit path for enabled tools |
| Course learner | V2 presentation exists; saved work/progress are incomplete | Reliable Journal saves, progress, reload, and one proven enrollment flow |
| Course production | Coupled mentally to the membership build | Starts now and is tracked separately |

## 4. Minimum safe architecture

### 4.1 Server-owned offer catalog

The browser sends only an allowlisted offer code. The server owns the Stripe Price ID, amount, currency, interval, active state, entitlement, and launch flag.

| Offer code | Price | Initial state |
|---|---:|---|
| `student_founding_monthly` | $15/month | Active at launch |
| `student_standard_monthly` | $19/month | Inactive; future decision |
| `scholar_monthly` | $39/month | Active at launch |
| `adept_monthly` | $69/month | Cost-gated |

L1 establishes the narrow server-owned free-course allowlist with PRE as its sole entry so the course beta never treats database `published` state as access authority. L2 extends that same catalog with member-released courses and `student_launch_course_slug`; it does not create a competing access list. At initial public sales, exactly one paid course may be member-released and it must match the Student slug. Unknown or mismatched Prices and ambiguous course configuration fail closed. A customer with an active subscription cannot accidentally create a second subscription through new-customer Checkout.

### 4.2 Membership projection

Add the smallest trustworthy billing model:

- a server-owned membership projection with tier, offer/cohort, Stripe references, status, and entitlement dates;
- a webhook-event inbox with unique event IDs and replay-safe processing;
- service-role webhook mutation, with failures surfaced instead of acknowledged silently;
- safe Checkout, return-page reconciliation, billing summary, and customer-portal paths;
- cancel/refund tests proportional to the initial monthly-only offer.

The lean customer portal supports payment methods, invoices, and cancellation. Plan switching inside Stripe Portal stays disabled because no safe lean upgrade/downgrade flow is in scope. The launch does not need a generalized product engine or advanced proration scheduler.

When a later explicit decision activates `student_standard_monthly`, the founding offer is removed only from new Checkout. Existing continuous $15 subscriptions keep their exact Stripe Price. Any verified prelaunch live subscription also keeps its exact Price untouched while L0/L2 maps its entitlement; an unresolved legacy Price is quarantined for manual review and blocks launch rather than defaulting to a tier or being auto-cancelled.

### 4.3 Simple credit core

Use a deliberately small append-only model:

- `credit_accounts` for the account and cached available balance;
- `credit_grants` for the current monthly allowance and its expiry;
- `credit_reservations` for in-flight operations;
- `credit_transactions` for grants, commits, releases, and adjustments;
- `ai_usage_events` for privacy-safe provider/cost telemetry.

Required operations are atomic `reserve`, `commit`, and `release`. Unique request/source keys prevent double charging and double grants. Customer sessions can read safe wallet data but cannot write grants, balances, transactions, reservations, or usage evidence directly.

This model intentionally omits purchased-credit buckets, rollover ordering, debt, refunds for packs, and multi-period grant allocation.

### 4.4 Course durability

Before the paid course experience is promoted, the V2 learner must prove:

1. a signed-in learner can enter the open course;
2. workbook/course work saves to the Journal with course and week metadata;
3. progress saves through a server-authorized path;
4. both survive refresh and a new session;
5. the public preview remains sanitized.

The first end-to-end proof uses free PRE. C01 and FD01 previews do not by themselves make either full course launch-released. The release decision sets the explicit allowlist and Student slug before public sales. Student switching is added before a second paid course is released, not as an initial blocker while only one paid course is open.

### 4.5 Cost and abuse controls

- Require verified email for generative actions.
- Enforce request-size, concurrency, and velocity limits per action.
- Record provider model, units, latency, outcome, and estimated cost without storing private prompt text in operational telemetry.
- Provide global and per-action kill switches.
- Fail closed if the credit or entitlement decision cannot be made safely.
- Run internal shadow metering before public enforcement.
- Use observed cost-per-credit and high-percentile behavior to decide whether Adept may be sold.

### 4.6 Predeclared economics guardrails

The cost study must test both observed behavior and conservative full-use scenarios. A tiny average-use sample cannot prove that a high-volume allowance is safe. Its minimum evidence window is 7 consecutive shadow days and 30 successful samples across at least 3 internal test accounts. Each of the four enabled billable variants—The Working, lens expansion, Seven Lenses standard, and Seven Lenses long—must have at least 5 successes; the sample set must exercise default and maximum permitted request sizes. Failure, timeout, abort, and retry paths are tested separately and do not count toward the 30 successes. The conservative full-use model uses the costliest permitted action mix. Meeting this minimum still does not force a tier to pass.

Initial go/no-go thresholds are:

| Plan | Full included-credit use | Maximum AI-provider COGS target | Implied average provider cost/credit |
|---|---:|---:|---:|
| Reader | 10 credits | **$0.50 per monthly-active Reader account** plus a global Reader spend breaker | **$0.0500** |
| Student | 30 credits at $15 | **$2.25/month (15% of plan revenue)** | **$0.0750** |
| Scholar | 100 credits at $39 | **$5.85/month (15%)** | **$0.0585** |
| Adept | 300 credits at $69 | **$10.35/month (15%)** | **$0.0345** |

These are provider-cost budgets, not promises of profit. The same study must estimate payment processing and marginal infrastructure and target at least 70% contribution margin before founder labor and content-production cost. Jen records an explicit global monthly Reader subsidy budget before canary; until changed, the protective default is **$50 per UTC calendar month**.

The Reader breaker atomically counts committed Reader provider spend plus estimated provider cost reserved by in-flight Reader actions for the current UTC month. If a new Reader action would exceed $50, Reader generative actions fail closed until the next UTC month with clear “free AI capacity is paused” messaging and preserved input. Paid generative actions and all non-generative Library, Search, Graph, Journal, and course access remain unaffected. Any override is server-only and records actor, reason, amount, effective period, and expiry.

If Student or Scholar fails its conservative threshold, its public offer also pauses or its allowance/action costs are revised before launch. Adept defaults to **hold** when there is not enough heavy-use evidence; lack of data is not a pass.

## 5. Delivery phases

| Phase | Outcome | Estimate |
|---|---|---:|
| L0 — Safety and stale-sales closure | Establish production truth, close customer-writable authority, and disable unsafe old purchase/unmetered paths | 2–4 days |
| L1 — Durable course beta | Make V2 progress and Journal saves reliable; prove PRE end to end | 3–5 days |
| L2 — Monthly billing and catalog | Implement exact monthly offers, trustworthy membership projection, Checkout, webhook, portal, and reconciliation | 4–6 days |
| L3 — Monthly credit core | Implement 10/30/100/300 monthly grants and atomic reserve/commit/release | 5–7 days |
| L4 — Initial tool metering | Meter The Working and Seven Lenses; add telemetry, abuse controls, and fail-closed bypasses | 5–7 days |
| L5 — Customer UI and launch | Update pricing/account/wallet/tool states, shadow costs, canary, and launch safely | 3–5 days |
| Integration allowance | Cross-phase fixes and verification | Included in forecast |

**Total forecast: 25–35 focused engineering days.** This is effort, not guaranteed elapsed calendar time: L5 includes at least 7 consecutive shadow days and 72 hours of post-enable monitoring, which may overlap other work. It is not a publishing deadline. Course writing, recording, editing, and release preparation proceed in parallel on their own board.

## 6. Launch gates

Public paid sales stay off until all of these are true:

- no customer session can change its own tier, billing identifiers, credit balance, usage record, protected enrollment, or shared cache;
- the exact live/test Stripe catalog and environment are verified;
- duplicate, delayed, out-of-order, and failed webhook stories are replay-safe;
- each enabled AI action charges once on success and returns its reservation on failure;
- monthly grants occur once per account and cannot overspend under concurrency;
- pricing, account, and tool UIs consume the same server-owned catalog and balance truth;
- the PRE preview-to-enrollment-to-save-to-reload story passes in a real browser;
- the release catalog distinguishes database `published` state from customer release, contains exactly one initial paid course, and names that same course as `student_launch_course_slug`;
- observed and conservative full-use cost scenarios support each published paid allowance and the Reader subsidy guardrails;
- every paid tier has an explicit `enable`, `hold`, or `revise` result; Adept is held by default if heavy-use evidence is insufficient;
- Reader, Student, and Scholar must record `enable` before public sales. Adept may record `enable` or `hold`. A `revise` result reopens every affected catalog, grant, metering, wallet, pricing, and evidence gate before canary;
- kill switches, rollback steps, and initial monitoring have been rehearsed.

Rollback prioritizes safety and saved work: turn off public offer flags and AI enforcement, preserve the secure permissions and append-only evidence, keep existing course work, and reconcile affected billing/credits before reopening.

## 7. Explicitly deferred

The following are not hidden obligations inside this launch:

- annual Student, Scholar, or Adept plans;
- automatic founding-to-$19 cutover logic beyond an inactive catalog offer;
- add-on credit packs or a Reader boost;
- included-credit rollover or purchased-credit expiry rules;
- a general multi-bucket wallet, credit debt, or pack-refund engine;
- a complete signed-in interactive Week 1 for every course;
- Student course switching before a second paid course is ready;
- complex downgrade/course-completion lifecycle behavior;
- Deep Search public metering before its cache and accounting are trustworthy;
- image generation;
- certificates or a Record of Completion;
- a promised YouTube or bonus-content publishing cadence;
- advanced billing operations that monthly founding launch does not exercise.

## 8. Evidence triggers for expansion

| Possible expansion | Evidence needed first |
|---|---|
| Turn on Adept | Observed plus conservative full-use scenarios pass the predeclared 15% provider-cost and 70% contribution-margin targets at 300 credits/$69; insufficient heavy-use evidence means hold |
| Raise new Student price to $19 | Stable billing, meaningful Student activation, support load, retention, and cost evidence; explicit business decision |
| Add annual billing | Proven monthly conversion/retention plus repeated customer demand for annual prepayment |
| Add credit packs | Repeated legitimate credit exhaustion and tool-only demand that cannot be served well by the plans |
| Add rollover | Evidence that monthly reset anxiety materially harms retention or fair use |
| Add Student switching | Before the second released paid course becomes available |
| Enable Deep Search | Versioned service-owned cache, reliable cost telemetry, reservation tests, and safe failure behavior |
| Build signed-in Week 1 previews | Funnel evidence that the existing public preview and video path do not create enough confidence |
| Add a completion record | Reliable completion evidence and carefully reviewed non-accredited language |

## 9. Governance

- This file controls immediate product scope and architecture.
- The implementation tracker controls status. Only verified `done` points count.
- The course-production tracker controls editorial/video progress; membership points never inflate it.
- The full blueprint is a reference, not a backlog that must be completed before launch.
- A scope change requires a dated decision in the live tracker and an updated point total before implementation begins.
- The 2026-08-11 `LEAN-L2-06` acceptance counts the verified local contract plus real Stripe test-mode lifecycle as L2 completion. It does not satisfy or authorize the `LEAN-L5-05` production deployment, live Portal, canary, or paid-activation gates.
- “Frozen” launch numbers are implementation targets, not permission to ignore failed cost evidence. A prelaunch `hold` or dated `revise` decision overrides public sale/copy until the documents agree again.
- Production, Stripe, pricing, or public-sales changes require explicit evidence and the appropriate launch gate; planning approval alone does not authorize a risky production mutation.

## 10. Immediate next move

Phases L2 and L3 are complete at 22/22 and 21/21. On August 11, Jen accepted `LEAN-L2-06` from its verified local billing/Portal contract plus a real Stripe test-mode $15 Checkout, signed created/deleted webhook projection, Student entitlement, terminal cancellation, and Reader fallback. `LEAN-L3-05` then passed the local authoritative active-grant/adjustment/commit/pending formula, full adversarial RLS/ACL matrix, cache/ledger agreement, and a real twenty-session race that produced exactly ten reservations and ten safe insufficiency results. All ten holds settled once, no pending row remained, and both fixture paths left zero residue. Combined launch progress is 72/114 verified points (63.2%), with `LEAN-L4-01` ready for the shared metering adapter, server-owned quotes, privacy-safe telemetry, abuse controls, and off/shadow/enforce flags. Keep every paid offer, billing operation, member-course release, Checkout UI, real credit action, and metered route default closed. Production billing deployment/migrations, the named live Portal configuration, an eligible non-admin production canary, and live paid activation remain separate `LEAN-L5-05` requirements; local phase completion does not authorize them.
