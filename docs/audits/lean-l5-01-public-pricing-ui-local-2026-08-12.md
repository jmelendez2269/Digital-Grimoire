# LEAN-L5-01 public pricing UI — local evidence

**Date:** August 12, 2026  
**Packet:** `LEAN-L5-01`  
**Result:** `done` locally — 3 / 3 points  
**Launch progress after acceptance:** 96 / 114 (84.2%)

## Scope and safety boundary

This packet adds the public `/pricing` surface and proves that it renders only the customer-safe projection of the existing server-owned membership catalog. It does not enable a paid offer, release a member course, expose Checkout, change a production or local environment file, call Stripe or an AI provider, mutate customer or credit data, deploy, commit, push, or open a pull request.

The retained worktree already contained unrelated course-parser and Supabase changes. They were not edited by this packet.

## Implemented contract

- Added a dynamic server-rendered `/pricing` page. It calls `getSafeMembershipCatalog()` directly and passes the safe projection to the pricing renderer; there is no client-owned plan, price, release, or availability configuration.
- Added a pure `getPublicPricingEntries()` projection. Reader is always present. A paid plan appears only when its plan and exact new-Checkout offer are both public in the shared catalog.
- Added the approved C01 customer title, **How Humans Know What They Know**, beside its existing approved slug in the catalog projection.
- Rendered exact price, monthly credit allowance, course-access rule, and 50-versus-unlimited active Journal rule for every visible plan.
- Presented courses and independent research tools as parallel paths. Public previews and available YouTube resources remain public, and the copy makes no publishing-cadence promise.
- Rendered only server-enabled generative action costs. When none are enabled, the page says they are safely closed.
- Added `/pricing` to the exact public-route allowlist, guest navigation, footer, page metadata, and sitemap.
- Kept all paid calls to action on account creation. No Checkout link, raw Price, or duplicate-subscription path was added.

## Catalog visibility proof

The focused catalog test covers three configurations:

| Configuration | Public plan cards |
|---|---|
| Default closed | Reader only |
| Launch configuration with Adept `hold` | Reader, Student founding, Scholar |
| Launch configuration with Adept `enable` | Reader, Student founding, Scholar, Adept |

The inactive Student standard offer never appears. The renderer contains no `$19`, `student_standard_monthly`, raw Stripe Price, or Checkout endpoint.

## Browser evidence

### Default-closed catalog

- Anonymous `/pricing` initially exposed a real boundary defect: middleware redirected it to `/login`. Adding `/pricing` to the exact public allowlist fixed the route without widening any descendant or API prefix.
- At 375×812, the page rendered Reader, the paid-membership-closed notice, optional-course and public-learning copy, the closed generative-action state, and all three account/course links with no horizontal overflow or Next.js error overlay.
- At 1440×1000, Membership was visible in header and footer navigation, Reader remained the only plan, paid plan names were absent, and there were zero Checkout links, no overflow, and no error overlay.

Evidence:

- [375×812 default-closed screenshot](lean-l5-01-pricing-mobile-2026-08-12.png)
- [1440×1000 default-closed screenshot](lean-l5-01-pricing-desktop-2026-08-12.png)

### Local launch configuration

A process-local fixture supplied exact launch tokens without editing `.env.local` or any external state. At 1440×1000 the page rendered:

- Reader — $0, 10 monthly credits, public/free course paths, up to 50 active Journal pages;
- Student — $15/month founding, 30 monthly credits, **How Humans Know What They Know**, unlimited active Journal pages;
- Scholar — $39/month, 100 monthly credits, all currently released member courses, unlimited active Journal pages;
- Adept absent while its decision was `hold`;
- optional-course/tool-only positioning and honest YouTube wording;
- zero Checkout links, no overflow, and no error overlay.

Evidence: [launch-config screenshot](lean-l5-01-pricing-launch-config-2026-08-12.png).

## Verification

- `npm run test:commercial-availability`
- `npm run test:membership-catalog`
- `npm run test:membership-entitlement`
- `npm run test:membership-checkout`
- `npm run test:membership-billing`
- `npm run test:membership-wallet`
- `npm run test:membership-metering`
- `npx tsx --test tests/public-discovery.test.ts tests/public-browse-access.test.ts`
- Result: **90 / 90 focused commercial, membership, metering, and public-access tests passed**.
- Targeted ESLint passed for every changed TypeScript/TSX file.
- `npx tsc --noEmit` passed.
- `npm run build` compiled, type-checked, and generated **139 / 139** pages; `/pricing` is a dynamic server-rendered route.
- The build retained pre-existing informational warnings for the Next.js middleware convention, Sentry client convention, Baseline browser data, and dynamic Supabase-backed routes. None blocked the build or originated in this packet.

## Acceptance

`LEAN-L5-01` satisfies its 3-point acceptance contract locally. The shared catalog controls every visible plan and action cost; Reader/Student/Scholar and conditionally Adept project exact launch terms; deferred offers remain hidden; the named Student course, all-course distinction, Journal limits, optional-course/tool-only path, and YouTube wording are explicit and responsive.

`LEAN-L5-02` is next. Paid sales, member-course release, Checkout UI, billing operations, production credit actions, production metered routes, the seven-day shadow-cost gate, and production canary remain independently closed.
