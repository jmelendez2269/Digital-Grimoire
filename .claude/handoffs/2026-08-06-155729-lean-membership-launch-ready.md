# Handoff: Lean Membership Launch Ready to Begin

## Session Metadata

- Created: 2026-08-06 15:57:29
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `develop`
- Session duration: Multi-turn pricing, product-scope, audit, and implementation-planning session; exact elapsed time was not recorded

## Recent Commits (for context)

- `e73061e` Make course preview source assertions formatting-agnostic
- `08d6be2` Restore the previous member dashboard and spotlight the current course
- `a81f931` Ship Course Format V2 rollout: release presentation, course-polls, public graph/library views
- `64631fc` Graph: retire legacy Concepts surface
- `c7617a4` DB: make course graph migrations atomic

## Handoff Chain

- **Continues from:** None. This begins a new lean membership-launch implementation stream.
- **Supersedes:** No prior handoff. It supersedes the *immediate execution status* of the 216-point/50–70 day membership blueprint, which remains in the repository as deferred expansion reference material.

## Current State Summary

Prismarium's pricing and membership direction has been reset after a from-scratch product audit and a production-evidence check. The controlling scope is now a 25–35 focused-day, monthly-only lean launch: Reader $0/10 credits, Student $15 founding/30, Scholar $39/100, and Adept $69/300 only if shadow cost evidence passes. Annual plans, packs, rollover, Deep Search launch, image generation, interactive signed-in Week 1, and advanced course lifecycle are deferred. The new implementation tracker is at 0/114 verified points with only `LEAN-L0-01` ready. No application code, production schema, Stripe object, or deployment was changed during the documentation reset. Course and YouTube production can start immediately on a separate board with PRE as the active course.

## Codebase Understanding

## Architecture Overview

- The app uses Next.js 16/React 19 with Supabase for auth/data and Stripe for billing.
- Membership authority is currently split among a user-row subscription projection, hardcoded account pricing UI, Checkout/webhook routes, and legacy Parallax query limits. These sources do not yet agree.
- Course Format V2 already has parser, catalog, public-preview, learner, Library, Graph, Journal, and presentation foundations. Public payload sanitization exists, but learner save/progress callbacks are not yet a dependable full story.
- Generative entry points are not all routed through one accounting boundary. The lean design adds one server-owned catalog and atomic reserve/commit/release adapter for The Working and Seven Lenses first.
- The repository contains multiple migration locations. `supabase/migrations` is expected to be canonical for the CLI, but `migrations` and `app/src/lib/supabase/migrations` must be inventoried against deployed production before any schema write.
- The immediate build is intentionally dependency ordered: safety, course durability, monthly billing, simple credits, initial tool metering, then customer UI/shadow/canary.

## Critical Files

| File | Purpose | Relevance |
|---|---|---|
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Stable lean product and architecture plan | Controlling WHAT/WHY and launch scope |
| `docs/planning/prismarium-membership-implementation-tracker.md` | 114-point live execution tracker | Controlling status, dependencies, evidence, risks, and decisions |
| `docs/planning/prismarium-course-production-tracker.md` | Separate editorial/YouTube board | Lets course production begin without waiting for membership engineering |
| `docs/planning/prismarium-membership-credits-development-plan-2026-08-06.md` | Larger 50–70 day architecture | Deferred reference only; it does not govern immediate work |
| `app/src/components/SubscriptionTab.tsx` | Current account pricing/subscribe surface | Currently hardcodes stale price/allowance distinctions |
| `app/src/app/api/stripe/create-checkout-session/route.ts` | Creates Stripe Checkout sessions | Current path accepts browser-supplied Price/mode and needs server offer codes |
| `app/src/app/api/stripe/webhook/route.ts` | Handles Stripe events | Current mutation authority/error behavior is not safe enough for launch |
| `app/src/lib/parallax/rate-limit.ts` | Legacy generative query limits | Does not implement the approved monthly credit model and may fail open |
| `app/src/lib/courses/access.ts` | Course payload/access sanitization | Reusable foundation for safe public/full course boundaries |
| `app/src/components/courses/CourseLearnerRenderer.tsx` | V2 learner experience | L1 must wire reliable save/progress behavior here and through server routes |
| `supabase/migrations/20260219210102_remote_schema.sql` | Existing remote-schema/RLS baseline | Prior audit found broad customer-writable authority that L0 must verify and repair |
| `app/src/lib/courses/launch-presentation.ts` | PRE/C01/FD01 public launch presentation | Source for current public course labels/access status and YouTube roles |

## Key Patterns Discovered

- Route Handlers are the normal boundary for JSON, streaming, Stripe, and provider integrations.
- Public course data should be serialized through explicit allowlists; never fetch full course content and merely hide it in the browser.
- Customer-readable projections and service-owned authoritative writes must stay separate.
- Stripe identifiers, amounts, modes, entitlements, and action costs belong in server-owned catalogs, not browser payloads.
- Financial/credit work requires unique source and request keys plus append-only evidence; retries must be replay-safe.
- The app already supports feature/environment flags for course presentation. The lean plan extends that pattern to offers and generative actions.
- Repository planning files are intended to be updated in the same session as implementation evidence so status does not drift from reality.

## Work Completed

## Tasks Finished

- [x] Audited the current pricing, tier promises, feature breadth, course readiness, billing boundaries, generative limits, and production aggregates from scratch.
- [x] Compared the 50–70 day full build with current demand evidence and selected a smaller safe launch.
- [x] Froze the lean monthly pricing and allowance contract.
- [x] Created the controlling lean plan with explicit launch gates and evidence-based expansion triggers.
- [x] Replaced the 216-point execution tracker with a dependency-ordered 114-point lean tracker.
- [x] Created a separate course/YouTube production tracker with conservative states for PRE, C01, and FD01.
- [x] Marked the old full blueprint as deferred reference rather than deleting its useful architecture.
- [x] Confirmed no product-marketing context file exists at .agents/product-marketing-context.md or .claude/product-marketing-context.md.
- [x] Preserved unrelated worktree files and excluded historical pricing drafts from the rewrite.

## Files Modified

| File | Changes | Rationale |
|---|---|---|
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Added controlling 25–35 day monthly-only plan | Prevent overbuilding while preserving a safe paid foundation |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Replaced 216-point full tracker with 114-point lean tracker | Make progress measurable against the approved immediate scope |
| `docs/planning/prismarium-course-production-tracker.md` | Added separate curriculum/video board | Let courses start now and avoid tying value to constant publishing |
| `docs/planning/prismarium-membership-credits-development-plan-2026-08-06.md` | Reclassified as deferred expansion blueprint and linked current sources | Preserve future design work without letting it delay launch |
| `.claude/handoffs/2026-08-06-155729-lean-membership-launch-ready.md` | Added this resume document | Allow the next conversation to begin at the first implementation packet |

No application code, database migration, Stripe object, environment variable, or deployment changed in this documentation pass.

## Decisions Made

| Decision | Options Considered | Rationale |
|---|---|---|
| Use a lean 25–35 day launch | Cosmetic price-only change; full 50–70 day platform build; lean safe core | A copy-only change would sell promises the app cannot enforce, while the full build is not justified by current paid evidence |
| Reader/Student/Scholar/Adept allowances are 10/30/100/300 | Current query limits; token packs first; “unlimited” tiers | Clear value progression with finite, measurable provider exposure |
| Launch Student at $15 founding and Scholar at $39 | Keep current prices; start Student at $19; full annual matrix | Low paid-entry barrier plus a materially differentiated complete plan |
| Represent $19 Student as inactive future offer | Automatic timed cutover; omit future offer entirely | Enables a later explicit evidence-based change without engineering an automatic cohort system now |
| Tie $15 founding to an uninterrupted founding subscription | Permanent account badge; complex cross-tier preservation | Existing subscriptions keep their Price while continuous; terminal lapse loses it after new founding Checkout closes, and plan switching is deferred |
| Gate the economics of every paid tier and default Adept to hold when evidence is thin | Gate only Adept; launch all stated allowances untested | Full-use costs can invalidate Student or Scholar too; a small usage sample cannot prove heavy-user economics |
| Monthly only, no packs or rollover | Full monthly/annual/packs/rollover wallet | Removes billing and ledger edge cases that demand has not earned |
| Meter The Working and Seven Lenses first | Meter everything including Deep Search/image; retain query counters | These tools can prove the credit loop while riskier/unreliable bypasses stay closed |
| Use an explicit course-release allowlist and one configured Student launch slug | Infer release from 29 database `published` rows; build switching now | Prevents accidental broad access while keeping switching out of scope until before course two |
| Keep courses optional and production parallel | Make courses required; delay content until membership is complete | Supports tool-only users and starts the accessibility/teaching path now |
| Avoid an “everything on YouTube is always free” promise | Promise all future content free; hide YouTube | Preserves accessible public courses without constraining future creator/member formats or imposing cadence pressure |

## Pending Work

## Immediate Next Steps

1. Read the lean plan and live tracker, then mark only `LEAN-L0-01` as `in_progress`. State that its boundary is read-only evidence collection.
2. Execute `LEAN-L0-01`: inventory production/deployed schema, effective RLS/grants, migration trees, exact Stripe mode/catalog/subscription state, unsafe routes, backup location, and rollback prerequisites. Produce a dated privacy-safe report. Do **not** create/update Stripe objects or mutate production.
3. Update the tracker with evidence and Jen's review. If accepted, unlock `LEAN-L0-02` (adversarial authorization baseline) and run `LEAN-L0-04` only according to recorded dependencies and authority.
4. In the parallel content stream, start `COURSE-PRE-01` and `COURSE-PRE-02`: confirm PRE's teaching promise, then complete a spoken learner run-through with pacing/confusion notes.

## Blockers/Open Questions

- [ ] No blocker prevents the read-only `LEAN-L0-01` preflight.
- [ ] Every paid tier remains subject to the economics gate. `LEAN-L5-04` may enable, hold, or revise Student, Scholar, or Adept; Adept defaults to hold if heavy-use evidence is insufficient.
- [ ] Student's future move from $15 to $19 remains a later business decision; do not implement an automatic timer.
- [ ] C01 versus FD01 release order remains open until the PRE retrospective or an explicit earlier decision.
- [ ] The actual `student_launch_course_slug` remains open. It must be chosen from the explicit member-release allowlist before Student sales; no database row order or `published` status may choose it automatically.
- [ ] Live Stripe/product state must be re-verified in L0; a stored production database identifier is not proof of a healthy paying subscription.

## Deferred Items

- Annual plans: defer until monthly retention and customer demand justify them.
- Add-on credits/packs: defer until repeated legitimate exhaustion or tool-only demand is observed.
- Credit rollover and multi-bucket/debt accounting: defer until reset behavior causes demonstrated harm.
- Student switching: required before the second paid course opens, not before the initial single-course launch.
- Deep Search public metering: defer until its cache, reservation, failure, and cost behavior are safe.
- Signed-in interactive Week 1: defer until funnel evidence shows public preview/video is insufficient.
- Image generation: separate future cost/safety/product decision.
- Completion record/certificate: defer until completion evidence is reliable and non-accredited language is reviewed.
- Advanced billing/course downgrade lifecycle: defer until real customer behavior requires it.
- Full expansion architecture: preserved in the deferred blueprint, not silently included in lean estimates.

## Context for Resuming Agent

## Important Context

The user explicitly approved this as the plan and asked for documentation synchronization so the *next conversation can begin implementation*. Do not reopen the entire pricing debate or restart discovery unless new evidence invalidates a frozen decision. Begin with `LEAN-L0-01`, not with pricing UI, Stripe product creation, credit schema, or a broad refactor.

The production evidence behind the scope decision was deliberately small and should be interpreted carefully: the audit observed 3 users, 2 admins, 1 course enrollment, 3 AI queries in the prior 30 days, and 29 published course records. No Student or Adept user was observed; one Scholar was an admin. The locally configured Stripe account was test mode with zero subscriptions/revenue, while one production database row contained stored Stripe customer/subscription identifiers. This supports caution, not a claim that live paid state is conclusively zero. L0 must establish the exact truth read-only.

Current advertised/app behavior is stale and internally inconsistent: Reader is described around 5 queries/25 Journal pages while a main limiter is effectively 1 lifetime and Journal enforcement is 50; Student is $15/5 queries; Scholar is $29/25; Adept is $49/50; paid course distinctions are weak. Do not publish the new prices until the safe catalog, billing projection, credits, and UI gates agree.

The production database's 29 `published` course records are not proof that 29 courses should be released to members. The lean catalog must explicitly allowlist free and paid releases and name exactly one initial Student course. C01 and FD01 currently have public previews but neither becomes the paid launch course until the business decision is recorded.

L1 establishes PRE as the sole entry in the server-owned free-course allowlist. L2 must extend that same access authority with paid releases and the Student slug; do not create a second catalog or use database `published` as an interim shortcut.

The prior audit identified high-risk boundaries: broad own-row `users` updates, customer-writable enrollment/cache/usage paths, client-supplied raw Stripe Price/mode, a webhook using session authority and ignoring mutation failures, unknown Price defaulting to Scholar, no webhook inbox/idempotency, mixed/unrecorded AI quotas, and an unmetered image route. Treat these as hypotheses to re-prove in L0, not permission to mutate production immediately.

Course creation is not blocked. Prior targeted course/parser/presentation testing passed, and PRE/C01/FD01 public presentation exists. However, do not equate fixtures and previews with an editorially finished course or published video. The course tracker intentionally marks the teaching/video stages conservatively.

## Assumptions Made

- Only one paid course will be released during the initial lean launch, so Student switching can safely wait until before course two.
- Reader keeps 50 active Journal pages. Reader credits follow UTC calendar months; paid credits follow verified Stripe monthly periods; no launch allowance rolls over.
- A paid/legacy account returning to Reader above 50 active Journal pages retains and can edit all work; nothing is auto-deleted/archived, but new/restore-active saves stay blocked until the user archives below 50. Any rejected course save preserves the input.
- Paid activation expires any remaining Reader grant and issues the full paid allowance. `cancel_at_period_end` preserves it through period end; terminal paid end issues the current Reader grant only when that UTC-month Reader source key has never existed.
- Monthly reset without rollover is acceptable for initial validation when it is described clearly.
- The Working and Seven Lenses can be brought behind one accounting adapter before Deep Search and image generation.
- Public course previews and YouTube provide the initial accessibility path; membership value does not depend on a recurring upload schedule.
- Adept may be hidden at launch without invalidating the Reader/Student/Scholar offer.
- Initial full-use provider-COGS ceilings are $0.50 per monthly-active Reader account, $2.25 Student, $5.85 Scholar, and $10.35 Adept; paid tiers also target at least 70% contribution margin after payment processing, AI, and marginal infrastructure. The Reader global protective breaker defaults to $50 per UTC month until Jen explicitly changes it.
- The cost gate needs 7 consecutive shadow days and 30 successful samples across at least 3 test accounts, with at least 5 each for Working, expansion, standard, and long at default/maximum permitted sizes; failures/retries are separate and the costliest permitted full-use mix is modeled.
- The repository is on branch `develop`, and all new planning/handoff files are currently untracked until the user chooses to commit them.

## Potential Gotchas

- The worktree was already dirty. Preserve user-owned/unrelated files, including `app/c01-parser-preview-desktop.png`, `app/c01-parser-preview-mobile.png`, `home-full.png`, and unrelated untracked documents.
- Do not read, rewrite, or treat `docs/audits/pricing-audit-2026-08.md` or `docs/planning/pricing-proposal-2026-08.md` as controlling sources; they were explicitly excluded from this reset.
- `docs/analysis/` and `docs/marketing/homepage-pricing-section-draft-2026-08-05.md` are pre-existing untracked work and must not be overwritten casually.
- The old full blueprint contains annuals, packs, rollover, signed-in Week 1, and a 216-point tracker model. Its top banner now says deferred; deeper detail remains intentionally intact as future reference.
- Multiple migration directories make file inspection insufficient to infer deployed truth. Compare read-only first and use only forward reconciliation later.
- Never expose raw Stripe Price IDs or let the browser choose plan amount/mode/action cost.
- Do not call an AI tier “unlimited.” The approved language is a finite credit allowance with ordinary transparent safety controls.
- Do not promise that every future YouTube/creator item will always be free or that videos will arrive on a fixed cadence.
- Do not enable Deep Search or image generation merely to make the feature table look fuller.
- Keep Stripe Portal plan switching disabled for the lean launch; payment methods, invoices, and cancellation are in scope, but safe upgrades/downgrades are deferred.
- The $50 Reader breaker uses UTC calendar months, counts committed plus in-flight estimated Reader provider cost atomically, pauses only Reader generation with clear messaging, preserves non-generative/paid use, and requires audited server-only overrides.
- Production writes, public sales, Stripe catalog changes, and deployment were not authorized by this documentation turn; follow packet gates and seek the required authority.

## Environment State

## Tools/Services Used

- Local PowerShell/git: repository inspection and worktree verification.
- Supabase production connection: prior read-only aggregate/schema inspection only; no write in this documentation pass.
- Stripe API/account configuration: prior read-only mode/catalog/subscription inspection only; no object changed.
- Targeted course/parser/presentation tests: 36 tests were reported passing during the audit, including 24 independently rerun by the primary agent. No application tests were required for the documentation-only synchronization.
- Session handoff scripts: scaffolded and validated this document.

## Active Processes

- None started for this handoff. No development server, watcher, migration, or deployment process is intentionally left running.

## Environment Variables

Relevant names only; never copy their values into plans or evidence:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PRISMARIUM_YOUTUBE_CHANNEL_URL`
- `NEXT_PUBLIC_PRISMARIUM_PRE_PLAYLIST_URL`

## Related Resources

- [Lean membership launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [Live lean implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Course and YouTube production tracker](../../docs/planning/prismarium-course-production-tracker.md)
- [Deferred full expansion blueprint](../../docs/planning/prismarium-membership-credits-development-plan-2026-08-06.md)
- [Course launch presentation](../../app/src/lib/courses/launch-presentation.ts)
- [Current subscription UI](../../app/src/components/SubscriptionTab.tsx)
- [Current Checkout route](../../app/src/app/api/stripe/create-checkout-session/route.ts)
- [Current Stripe webhook route](../../app/src/app/api/stripe/webhook/route.ts)

---

**Security reminder:** This handoff contains names and aggregate observations only. Re-run the handoff validator after every material edit and never add credentials, tokens, raw customer records, or personally identifying data.
