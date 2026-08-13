# LEAN-L5-02 account billing UI — local evidence

**Date:** August 12, 2026  
**Packet:** `LEAN-L5-02`  
**Result:** `done` locally — 3 / 3 points  
**Launch progress after acceptance:** 99 / 114 (86.8%)

## Scope and safety boundary

This packet replaces the legacy profile subscription tab with a customer-safe account billing surface backed only by the existing service-owned membership projection. It does not enable a paid offer, release a member course, expose Checkout, enable a billing operation, configure Stripe Portal, call Stripe, change an environment file, deploy, run a remote migration, commit, push, or open a pull request.

The retained worktree already contained unrelated course-parser, Supabase, L5-01 pricing, and planning changes. They were preserved.

## Implemented contract

- The account tab reads `GET /api/membership/billing-summary` with `cache: "no-store"` and validates the response against an exact customer-safe key allowlist before rendering it.
- Current plan, exact monthly price, pricing cohort, Stripe-derived status, renewal/access/cancellation date, billing hold, and Portal availability all come from the server projection. The browser does not read `public.users`, legacy subscription fields, rate limits, or raw Stripe identifiers.
- Founding copy states that the current rate continues only while the subscription remains uninterrupted and that a terminal lapse does not preserve eligibility after the offer closes.
- Active renewal, scheduled cancellation, terminal access-through, Reader, billing-hold, loading, and recoverable-unavailable states have explicit presentation rules.
- The only paid-member action is the existing server-gated Portal route. It is rendered only when `portalAvailable` is true and is described narrowly as payment method, invoices, or cancellation; plan switching remains unavailable.
- Reader may see catalog availability, but paid members do not receive a new-subscription path. The component contains no Checkout, subscribe, upgrade, raw Price, public Stripe-key, or offer-code action.
- The old client-side `public.users` lookup, admin-as-Adept inference, query-limit display, Checkout-return/sessionStorage retry loop, global subscription scan trigger, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` Portal gate were removed.

## Safety and state evidence

The focused contract tests prove:

| State | Customer presentation |
|---|---|
| Active paid monthly | Exact plan, price, cohort, status, and renewal date |
| Cancel at period end | Exact scheduled-end date and saved-work preservation copy |
| Terminal paid history | Access-through date without paid-entitlement claim |
| Reader | No paid billing schedule or Portal action |
| Operations closed | No Portal button or request; current server-verified plan remains unchanged |
| Malformed or expanded response | Fails closed, including an unexpected raw Stripe-like field |

Source containment checks prove the account component has no `public.users` read, raw Customer/Subscription field, `/api/stripe/sync-subscription` call, `sessionStorage` heuristic, legacy rate-limit request, public Stripe-key check, Checkout call, or upgrade handler.

## Browser evidence

A marker-owned local-only, verified non-admin fixture rendered an active Student founding membership with cancellation scheduled for September 1, 2026. The verification harness first inspected the active client bundle and refused credential submission unless it contained a `127.0.0.1` Supabase URL and omitted the hosted project reference. The successful auth request stayed on the repository's local Supabase port.

At 375×812 and 1440×900, Chromium proved:

- Student, `$15/month`, Founding rate, Active, and the exact scheduled-end date;
- accurate uninterrupted-founding and scheduled-cancellation language;
- billing operations safely closed;
- `200` from the safe billing-summary endpoint;
- zero Checkout links, zero Portal requests, zero Next.js error overlays, and no horizontal overflow.

The global shell's pre-existing missing `/grid.svg` produced one unrelated `404` console message. There was no billing UI error. The global cookie dialog is visible in the captured images but does not change or obscure the asserted DOM contract.

Evidence:

- [375×812 account billing screenshot](lean-l5-02-account-billing-mobile-2026-08-12.png)
- [1440×900 account billing screenshot](lean-l5-02-account-billing-desktop-2026-08-12.png)

Both marker-owned fixture runs were deleted. Cleanup returned `residue: 0`, and the packet dev/browser processes were stopped. The pre-existing local Supabase containers were left unchanged and running.

## Verification

- `npm run test:commercial-availability`
- `npm run test:membership-catalog`
- `npm run test:membership-entitlement`
- `npm run test:membership-checkout`
- `npm run test:membership-billing`
- `npm run test:membership-wallet`
- `npm run test:membership-metering`
- `npx tsx --test tests/public-discovery.test.ts tests/public-browse-access.test.ts`
- `npx tsx --test tests/membership-billing-ui.test.ts`
- Result: **94 / 94 focused commercial, membership, metering, public-route, and billing-render tests passed**.
- Targeted ESLint: passed.
- TypeScript `--noEmit`: passed.
- `git diff --check`: passed.
- Production build: passed, **139 / 139 pages generated**.

## Gates retained

- Paid sales and every Checkout UI remain closed.
- Billing operations and the named live Portal configuration remain closed.
- No plan switching, reactivation action, or direct cancellation endpoint was added.
- No member course was released.
- No production credit or metered action was enabled.
- Production deployment/migrations, the eligible non-admin production canary, and public activation remain gated by `LEAN-L5-05`.
- Wallet and tool-cost customer states remain scoped to `LEAN-L5-03`.

