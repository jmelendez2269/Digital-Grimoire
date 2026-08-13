# LEAN-L5-06 minimal membership launch monitoring

**Status:** In progress; baseline accepted, 72-hour exit gate not yet earned<br>
**Launch baseline:** August 12, 2026 at 23:08 EDT<br>
**Monitoring deadline:** August 15, 2026 at 23:08 EDT<br>
**Production source:** `c2ebb18` on `release/lean-membership-launch-20260812`<br>
**Production deployment:** `dpl_9FELW8KUwzbTbrvkqR5dF6ziVRbJ`, Ready on both Prismarium aliases

## Authorized scope

Jen authorized the minimal membership launch with these exact boundaries:

- PRE remains the free/public course.
- C01 (`c01-how-humans-know-what-they-know`) is the sole member-released course.
- Reader, Student founding at $15/month, and Scholar at $39/month are public.
- Adept remains held. Student standard at $19 remains inactive.
- Checkout, safe billing operations, monthly 10/30/100-credit grants, The Working, and Seven Lenses are enabled.
- The enabled metered actions are exactly Working 1, lens expansion 1, standard Seven Lenses 2, and long Seven Lenses 3 credits.
- Deep Search, image generation, generic/unmetered generation, annual plans, credit packs, rollover, and all deferred expansion remain closed.
- The dedicated staged webhook is cut over without overwriting the legacy `STRIPE_WEBHOOK_SECRET`.
- No canary and no synthetic charge/refund may be created.

## Release sequence and evidence

The primary dirty worktree was preserved. Launch work occurred in the isolated exact-candidate worktree at `.worktrees/lean-membership-launch`.

Before external activation, verification found three launch blockers in the candidate: the deployed webhook read only the legacy secret, customer UI had no Checkout action, and course/Journal authority still depended on the legacy user subscription field. Commit `318fb01` repaired those boundaries by adding staged-first/legacy-overlap signature verification, exact offer-code Checkout UI, service-owned membership entitlement for paid course access/enrollment and Journal limits, and focused regression coverage.

Verification passed:

- 60/60 focused membership, Checkout, billing, webhook, course, and Journal tests;
- focused ESLint;
- global TypeScript;
- `git diff --check`;
- 139/139-page production build;
- Ready closed Preview and Production deployments before activation.

Live preflight verified Stripe account fingerprint `d2eba286ce46`, safe Portal fingerprint `691ce8320201`, and dedicated webhook fingerprint `3151d3c79a74`. The webhook was live-mode, disabled, pointed exactly to `/api/stripe/webhook`, and allowed only subscription created/updated/deleted. It was then enabled without writing either webhook secret. The staged secret remained in its separate Sensitive Production variable and the legacy secret was untouched.

Vercel received exactly 13 launch variables for Student founding, Scholar, C01, the two-price Checkout allowlist, billing operations, enforce-mode metering, the four approved actions, the $50 Reader breaker, and Adept hold. The two previously audited live Price fingerprints (`2bc999c417ea` and `499ad4155254`) were resolved and validated in process through read-only Account/Product/Price calls. No raw Stripe ID was emitted.

The first launch deployment `dpl_EL1shafi6VhWTMduAz3qsJAvvuqC` reached Ready. Baseline observability found one homepage 200 response containing a logged permissions error: the safe shared course-preview query used the anonymous client after the production permissions repair. The verifier stopped, commit `c2ebb18` changed only that query to the already-created service client and added a regression assertion, and the forward deployment `dpl_9FELW8KUwzbTbrvkqR5dF6ziVRbJ` reached Ready. Six focused tests, lint, global TypeScript, and diff checks passed. The repaired deployment returned homepage 200 with zero runtime error logs and zero HTTP 500s in the post-deploy scan.

## Baseline customer and route checks

The public catalog returns:

- public plans: Reader, Student, Scholar;
- public offers: `student_founding_monthly`, `scholar_monthly`;
- sole member release and Student course: C01;
- Adept decision: `hold`;
- enabled actions: `working.generate`, `seven_lenses.expand`, `seven_lenses.standard`, `seven_lenses.long`.

Course APIs prove PRE is `open-now`, free, and does not require upgrade; C01 is `open-now`, paid, and requires membership for full access. Anonymous Checkout, Portal, The Working, and Seven Lenses POSTs return 401 before side effects. An unsigned webhook returns 400.

A fresh browser session verified the pricing page visibly renders Reader $0/10 credits, Student founding $15/30 with C01, Scholar $39/100, and exact 1/1/2/3 action costs. Adept is absent. Checkout is offered only after sign-in. The browser reported no page errors and only normal anonymous-auth initialization logs.

Read-only Stripe verification confirms webhook `3151d3c79a74` is enabled with the exact URL and three-event allowlist. It accessed no Customer, Subscription, Checkout Session, invoice, payment, or charge object.

## Pre-24-hour coverage validation

This section is an interim monitoring preflight, not the 24-hour checkpoint. It does not advance `LEAN-L5-06` or shorten the required observation window.

- At 23:30 EDT, the exact Production deployment remained Ready on both Prismarium aliases. Bounded error-level and HTTP 500 log queries over the post-launch window returned no matching entries. A repeat after the public smoke returned the same result.
- Public readback continued to show Reader, Student, and Scholar available; Student founding and Scholar as the only public Checkout offers; C01 as the only member-released course; and Adept held. Student standard and Adept were unavailable. Deep Search and image generation were explicitly present as disabled catalog actions. Generic generation, annual plans, packs, rollover, and deferred features were absent from the launch catalog.
- PRE remained `open-now`, free, preview-only for an anonymous viewer, and did not require upgrade. C01 remained `open-now`, paid, preview-only for an anonymous viewer, and required membership for full access.
- A name-and-scope-only Vercel Production environment audit found all 13 launch variables. No canary variable name was present. `PRISMARIUM_STRIPE_WEBHOOK_SECRET_STAGED` and legacy `STRIPE_WEBHOOK_SECRET` remained separate names; no value was read or compared.
- A one-use verifier made only live Stripe Account, Billing Portal Configuration, and Webhook Endpoint reads. It reconfirmed account `d2eba286ce46`, safe Portal `691ce8320201`, and enabled webhook `3151d3c79a74` at `prismarium.xyz/api/stripe/webhook` with exactly subscription created/updated/deleted. It read no Customer, Subscription, Checkout Session, invoice, payment, or charge object, performed no mutation, emitted no raw ID or secret, and was deleted after the check.
- Exact searches of the connected Gmail mailbox found no Prismarium-, domain-, PRE-, C01-, or Seven-Lenses-related support message after launch. One loose phrase match was an unrelated newsletter and was excluded. This is evidence only for the connected mailbox, not for any unconnected support channel.
- No canary, synthetic charge/refund, Checkout Session, credit use, generation, customer session, deployment, migration, secret write, or feature expansion was created by monitoring.

## Scheduled-checkpoint evidence contract

| Requirement | Privacy-safe evidence at 24h, 48h, and 72h | Interpretation boundary |
|---|---|---|
| Deployment health | Inspect the exact aliased Production deployment; query error-level and HTTP 500 logs over the bounded checkpoint interval | An empty bounded query means no matching Vercel entry in that interval, not universal absence of failures |
| Billing and webhook projection | Read only the approved live account, safe Portal configuration, and exact webhook endpoint; inspect webhook/billing runtime errors | Do not read Customer, Subscription, Checkout Session, invoice, payment, or charge objects merely to manufacture activity evidence |
| Credits and reservations | Review naturally occurring privacy-safe runtime/provider errors and customer-safe route behavior | Private table aggregates remain unavailable through this process; unavailable is never recorded as zero or pass |
| Course access and saves | Recheck PRE/C01 public access metadata, fail-closed anonymous save boundaries, and related runtime/support anomalies | Private enrollment, progress, and Journal aggregates remain unavailable without a privileged bypass |
| Authorized metered routes | Recheck the complete public action catalog and protected anonymous route boundaries; inspect Working and Seven Lenses errors | Do not invoke a generation or consume credits for monitoring |
| Closed gates | Enumerate all catalog plans, offers, actions, and course releases; audit Production variable names without values | Adept, Student standard, Deep Search, image/generic generation, annual, packs, rollover, canary, and deferred scope must remain closed |
| Support and anomalies | Search the connected Gmail mailbox with exact Prismarium/course/tool terms and correlate any report with bounded runtime evidence | No-match applies only to the connected mailbox; no unconnected support channel is inferred |

### Exact observation windows

All Vercel interval queries use UTC ISO timestamps. Each scheduled checkpoint first resolves both public aliases and compares their current Production target with baseline deployment `dpl_9FELW8KUwzbTbrvkqR5dF6ziVRbJ`. If either alias moved, the change is an anomaly: inspect the new deployment and query every deployment that served any portion of the interval rather than treating the baseline deployment alone as complete coverage.

| Checkpoint | EDT boundary | UTC log window |
|---|---|---|
| 24 hours | 2026-08-13 23:08 | `2026-08-13T03:08:00Z` through `2026-08-14T03:08:00Z` |
| 48 hours | 2026-08-14 23:08 | `2026-08-14T03:08:00Z` through `2026-08-15T03:08:00Z` |
| 72 hours | 2026-08-15 23:08 | `2026-08-15T03:08:00Z` through `2026-08-16T03:08:00Z` |

Stripe configuration, public catalog/course state, Production environment names, and connected-mailbox support results are point-in-time readbacks at each boundary. Gmail searches may use date-granularity search to shortlist candidates, but only messages whose returned timestamps fall inside the exact interval count toward that checkpoint.

## Monitoring limitation

Vercel process injection intentionally withholds the Sensitive Production Supabase service-role value. The baseline therefore cannot directly count private membership, billing, credit, reservation, transaction, or usage tables without weakening credential handling or adding a new privileged endpoint. Those aggregate counts are recorded as unavailable through this channel, not as zero or passing. Monitoring uses customer-safe APIs, exact deployment/runtime logs, webhook identity, public course/catalog behavior, and any naturally occurring privacy-safe operational evidence. No monitoring backdoor or public aggregate endpoint was created.

## Checkpoint plan

| Checkpoint | Due (EDT) | Required review | State |
|---|---|---|---|
| Baseline | 2026-08-12 23:08 | Ready deployment, exact catalog/course/routes, browser, webhook, error/500 scan | Complete |
| 24 hours | 2026-08-13 23:08 | Deployment/errors/500s, catalog drift, webhook status, billing/credit/reservation/provider/course/support signals available without privileged bypass | Pending |
| 48 hours | 2026-08-14 23:08 | Repeat and compare; assign any anomaly owner/action | Pending |
| 72 hours | 2026-08-15 23:08 | Final stabilization review and explicit rollback/continue decision | Pending |

`LEAN-L5-06` remains `in_progress` at 0/2 points. The total remains 112/114. No claim of 72-hour completion is made in this baseline record.
