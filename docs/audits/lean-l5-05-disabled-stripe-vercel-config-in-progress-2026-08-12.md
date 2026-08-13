# LEAN-L5-05 disabled Stripe/Vercel configuration — paused on staged webhook secret

**Date:** August 12, 2026  
**Status:** Superseded by the [completed configuration report](lean-l5-05-disabled-stripe-vercel-config-complete-2026-08-12.md)  
**Authorization:** Jen explicitly authorized the disabled Stripe/Vercel configuration unit, then accepted the safe Portal default and authorized one disabled staged webhook without overwriting the active webhook secret  
**L5-05 credit:** 0/5 points; no canary identity or live payment story ran

## Outcome so far

The exact live Stripe account fingerprint `d2eba286ce46` was verified from the clean linked release worktree. One marker-owned live Billing Portal configuration was created. Its privacy-safe fingerprint is `691ce8320201`, and its feature contract is safe:

- active;
- customer/profile updates disabled with zero allowed update fields;
- invoice history enabled;
- payment-method updates enabled;
- cancellation enabled at period end with no proration;
- subscription pause disabled;
- subscription updates and plan switching disabled with zero allowed update fields.

Stripe automatically returned this first live Portal configuration as `is_default: true`. Jen explicitly accepted this exact safe default status. `PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID` is now stored as a Sensitive Production variable. `PRISMARIUM_BILLING_OPERATIONS_ENABLED` remains absent, no deployment followed the variable change, there is no eligible paid membership row, and no Portal Session was created.

A dedicated marker-owned live webhook endpoint was also created for `https://prismarium.xyz/api/stripe/webhook`, restricted to the three subscription events, and immediately disabled. Its privacy-safe fingerprint is `ce2d2f147ee0`. The attempt to write its one-time signing secret to Vercel failed before the staged variable was created. The active legacy `STRIPE_WEBHOOK_SECRET` was not overwritten. Stripe's API does not return the endpoint secret after creation, and the automated browser found no authenticated Stripe Workbench session from which to reveal it.

## No-change checks after the stop

- The dedicated endpoint exists but remains disabled with the exact URL and three-event allowlist.
- The existing legacy `STRIPE_WEBHOOK_SECRET` Production value was not overwritten.
- The proposed unused `PRISMARIUM_STRIPE_WEBHOOK_SECRET_STAGED` variable is absent.
- `PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID` is the only new Vercel Production variable; it is Sensitive and inert without billing operations or a new deployment.
- No deployment or migration occurred.
- No Customer, Subscription, Checkout Session, invoice, payment, refund, cancellation, identity, course release, credit, or metered action was read or mutated.
- The four existing encrypted lean Price mapping names remain present.
- Paid-sales, public-offer, course-release, Student-launch, canary, billing-operation, metered-action, and commercial-action variables remain absent.

## Safety correction

Production already has a legacy `STRIPE_WEBHOOK_SECRET` spanning Development, Preview, and Production. An attempted command that would have overwritten its Production target was rejected before execution. The guarded helper was changed to stage the future dedicated endpoint secret under a new unused Sensitive Production variable, leaving the active legacy secret untouched. The original nested Windows Vercel command failed during the one-time secret write; its corrected transport was then proven by safely storing the Portal ID.

## Owner decision required

Choose one of these explicitly before continuation:

1. Authorize deletion and recreation of only the marker-owned disabled endpoint fingerprint `ce2d2f147ee0`, immediately disable its replacement, and retry the corrected process-resident staged-secret write. The active webhook secret remains untouched. This is the narrowest automatable recovery.
2. Authenticate an owner-controlled Stripe Workbench session and reveal this endpoint's signing secret there for process-only staging, avoiding endpoint replacement.

Until that decision, every identity, sales, Checkout, course-release, billing-operation, production-credit, production-metered-route, cleanup, payment, and public-release gate remains closed.

## Resolution

Jen authorized deletion/recreation of only endpoint fingerprint `ce2d2f147ee0`. The exact disabled target was deleted, replacement fingerprint `3151d3c79a74` was created and immediately disabled, and its one-time secret was stored under the unused Sensitive Production variable `PRISMARIUM_STRIPE_WEBHOOK_SECRET_STAGED`. The active webhook secret remained untouched. See the [completed report](lean-l5-05-disabled-stripe-vercel-config-complete-2026-08-12.md).
