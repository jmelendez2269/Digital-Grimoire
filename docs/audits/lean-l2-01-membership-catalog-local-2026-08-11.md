# LEAN-L2-01 membership catalog — local verification

**Date:** August 11, 2026<br>
**Branch:** `agent/lean-membership-l0-l1`<br>
**State:** `done` — the server catalog and safe customer UI are locally proven, and Jen approved the exact paid Student launch course slug<br>
**Verified score:** 32/114 (28.1%)

## What exists locally

- `app/src/lib/membership/membership-catalog.server.ts` is the single server-only plan, offer, action-cost, course-release, and launch-flag catalog.
- It extends `FREE_LEARNER_COURSES` from the L1 learner contract rather than copying PRE's slug.
- It defines Reader 10 credits/50 active Journal pages; Student founding $15/30; inactive Student standard $19; Scholar $39/100; and cost-gated Adept $69/300.
- It defines the launch action costs: The Working 1, single-lens expansion 1, standard Seven Lenses 2, long Seven Lenses 3, fresh Deep Search 3 but beta-disabled, and image generation not offered.
- `app/src/app/api/membership/catalog/route.ts` returns only a safe, non-cacheable projection. It does not expose environment names or Stripe Price IDs and accepts no browser-supplied catalog input.
- `app/src/middleware.ts` explicitly permits only the safe catalog's exact public `GET`; other middleware behavior is unchanged.
- `app/src/components/membership/MembershipAvailability.tsx` validates and consumes that projection, shows paid offers only when the catalog marks both the launch and exact offer public, and fails closed on any fetch or shape error.
- `app/src/components/SubscriptionTab.tsx` renders the shared availability component. Its stale new-customer price cards, browser Price references, and Checkout action were removed; existing paid-account management remains separate.
- Existing Stripe projection paths use the same exact server Price resolver. Unknown, malformed, missing, or duplicate Price configuration grants nothing.
- `app/.env.example` records every server-only flag as blank, false, or hold by default.

## Default-closed behavior

With no configuration:

- Reader and PRE remain available through the already-proven free path;
- Student, Scholar, and Adept are unavailable;
- no paid offer is public;
- no paid member course is released;
- the Student launch course is `null`;
- no metered action is enabled;
- Adept is held;
- no Stripe Price resolves.

Paid launch additionally requires all of these exact server facts:

1. the global paid-sales flag is exactly `true`;
2. there is exactly one valid non-PRE member-released course;
3. that course exactly matches the approved Student launch slug;
4. an offer's exact code is enabled;
5. its server-only Stripe Price has a valid shape;
6. the offer accepts new Checkout;
7. Adept also has an exact `enable` cost decision.

Unknown or duplicate offer/action tokens close the affected set. Database publication, browser input, and public environment values are not catalog authority.

## Customer UI and browser evidence

The development-only `/dev/membership-catalog` route renders the exact component used by Profile → Subscription and returns `notFound()` outside development. A clean isolated Chromium session ran at 375×812 against local Next.js with an explicit abort rule for the configured remote Supabase host.

- `/api/membership/catalog` returned `200` with `Cache-Control: no-store` through the real middleware and route.
- The UI showed **Paid memberships are not open yet**, Reader 10 monthly credits, and the 50-active-Journal-page limit.
- No Student/Scholar/Adept price and no subscribe, upgrade, or Checkout action rendered.
- The document and viewport widths were both 375 pixels with zero horizontal scroll.
- The browser reported meaningful content, no uncaught page error, and no Next.js error overlay.
- The captured request log contained the local page/assets and catalog fetch, with no Supabase request.

[View the narrow default-closed catalog UI](lean-l2-01-membership-catalog-ui-375x812-2026-08-11.png).

## Student launch course decision

Jen approved `c01-how-humans-know-what-they-know` as the exact Student launch slug on August 11, 2026. The recommendation was based on this evidence:

- C01 is the Core Path and its production draft describes it as the grammar of synthesis for later courses.
- It has an eight-week production draft plus existing V2 learner evidence.
- The separate course-production board calls it the likely post-PRE path.
- FD01 is shorter and likely the gentler beginner door, but its board still requires source/cultural-context QA and an explicit order decision against C01.

This approval records catalog authority only. No environment value or release flag was set, and it does not authorize paid sales, Stripe changes, deployment, or production changes.

## Tests run after the final edits

- `npm run test:membership-catalog`: **8/8 passed**.
- `npm run test:permission-server-authority`: **4/4 passed**.
- `npm run test:commercial-availability`: **8/8 passed**.
- Focused ESLint for the catalog, safe API, middleware-integrated UI, development harness, and tests: **passed with zero errors**. Three pre-existing `SubscriptionTab` hook-dependency warnings remain.
- `npx tsc --noEmit`: **passed**.
- `npm run build`: **passed**, including `/api/membership/catalog`, the development-only verification route, and **137/137 generated pages**.
- `git diff --check`: **passed**.

The first catalog test attempt used an outdated guessed PRE slug. It failed safely, the fixture was corrected to the actual L1-owned slug, and the final run above passed. Product code did not change to satisfy the bad assumption.

## Rollback and external-state note

This packet has no schema or data migration. Local rollback is limited to removing the new catalog/API/UI/test and development-harness files, reverting the exact middleware exception, and reverting their package/example/documentation integrations. Blank flags already act as the kill switch.

No commit, push, PR update, deployment, preview promotion, remote migration, production/staging data change, Stripe operation, or remote environment-variable change occurred.

## Acceptance result

### Owner approval amendment — August 11, 2026

After reviewing the recommendation and completed UI/browser evidence, Jen approved `c01-how-humans-know-what-they-know` as the exact Student launch course slug. This closes the sole remaining owner gate recorded by the original local verification. The approval is a catalog decision only; all paid availability remains default closed.

All L2-01 acceptance evidence is complete. The packet earns 3 points, moving verified launch progress from 29/114 to 32/114 (28.1%).

All paid catalog paths remain default closed. `LEAN-L2-02` may now begin locally, but this approval does not authorize production, Stripe, remote migration, deployment, or environment-variable changes.
