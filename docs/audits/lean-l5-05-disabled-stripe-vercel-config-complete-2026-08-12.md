# LEAN-L5-05 disabled Stripe/Vercel configuration — complete

**Date:** August 12, 2026  
**Status:** Complete for the disabled configuration unit only  
**L5-05 credit at completion of this unit:** 0/5 points; no canary identity or live payment story ran  
**Stripe target:** Live account fingerprint `d2eba286ce46`  
**Vercel target:** Production environment for `digital-grimoire-96dg`

## Authorized scope

Jen separately authorized the disabled Stripe/Vercel configuration unit, accepted Stripe's automatic safe-default status for the first live Portal configuration, authorized one dedicated disabled webhook with an unused staged secret, and finally authorized deletion/recreation of only failed endpoint fingerprint `ce2d2f147ee0`. The active webhook secret was explicitly excluded.

## Safe Portal configuration

Portal configuration fingerprint `691ce8320201` was retrieved after creation and passed the exact safe contract:

- active and explicitly accepted as the account default;
- customer/profile updates disabled with zero allowed fields;
- invoice history and payment-method updates enabled;
- cancellation enabled at period end with no proration;
- subscription pause disabled; and
- subscription updates and plan switching disabled with zero allowed fields.

`PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID` is stored as a Sensitive Production variable. `PRISMARIUM_BILLING_OPERATIONS_ENABLED` remains absent, no deployment followed the environment change, and no Portal Session was created.

## Disabled dedicated webhook

The first marker-owned endpoint fingerprint `ce2d2f147ee0` was verified live-mode, exact, and disabled before deletion. Only that endpoint was deleted. Its replacement fingerprint is `3151d3c79a74` and independent readback confirms:

- live mode;
- status `disabled`;
- host `prismarium.xyz` and path `/api/stripe/webhook`;
- exactly `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`; and
- the expected marker and replacement lineage.

The replacement signing secret was sent process-to-process to Vercel and stored as Sensitive Production variable `PRISMARIUM_STRIPE_WEBHOOK_SECRET_STAGED`. No secret was written to a repository file or emitted in evidence. The existing `STRIPE_WEBHOOK_SECRET` remains present with its original age and was not overwritten. The staged name is unused by the deployed application, and the replacement endpoint remains disabled.

## Closed-gate verification

Vercel Production continues to omit the canary identity, paid-sales, enabled-offer, member-course-release, Student-launch, metered-action, billing-operation, and commercial-action variables. The four encrypted lean Price mappings remain present. No deployment or migration occurred.

Production runtime readback returned:

- safe catalog `200`;
- paid sales false;
- zero public offers;
- zero member-released courses;
- no Student launch course slug;
- zero enabled metered actions; and
- logged-out Checkout, Portal, and Working POSTs all `401`.

No Customer, Subscription, Checkout Session, invoice, payment, refund, cancellation, identity, course release, credit grant/action, or metered action was read or mutated. No webhook event was sent.

## Disposition

The disabled Stripe/Vercel configuration unit is complete and inert. Jen later accepted it with the closed deployment/database evidence as the [no-charge production-readiness completion](lean-l5-05-no-charge-production-readiness-complete-2026-08-12.md). `LEAN-L5-05` is therefore `done` at 5/5, Phase L5 is 19/21, and total progress is 112/114 (98.2%). No canary or public launch occurred. `LEAN-L5-06` remains `not_started`; live payment, Checkout activation, sales, course release, billing operations, production credits, metered routes, lifecycle cleanup, webhook activation/cutover, further deployment/migration, public flags, and live activation remain closed.
