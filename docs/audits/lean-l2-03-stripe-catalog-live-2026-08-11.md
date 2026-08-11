# LEAN-L2-03 live Stripe catalog configuration and verification

**Evidence date:** August 11, 2026  
**Final verification time:** 2026-08-11 16:24:07 UTC  
**Scope:** Linked Vercel Production environment and its configured live Stripe account; Products and Prices only  
**Result:** PASS — exact live monthly catalog configured and verified  
**Packet state:** `done`; 3 points earned

## Approval and boundary

Jen approved the live-production target, reuse of one approved $15 founding Student Price, creation of the missing immutable $19/$39/$69 monthly Prices, four server-only Production mappings, and final read-only verification. Customer and subscription access, deployment, database changes, remote migrations, sales-flag changes, and production application release remained excluded.

The live catalog operation used only:

- `accounts.retrieve`;
- `products.list`;
- `prices.list`;
- `prices.create` for the three missing approved Prices.

No Product was created or changed. No Price was updated, archived, or deleted. No customer, subscription, webhook, Checkout, invoice, or payment resource was accessed. The creation command required a live key and explicit `--apply`, used deterministic idempotency keys, reused exact candidates, and failed closed on ambiguity.

## Live preflight

Process-only Vercel Production injection from a clean linked directory proved the command was using the live account rather than `app/.env.local`. The privacy-safe account fingerprint was `d2eba286ce46`.

Before configuration, the live catalog contained 6 active Products and 9 Prices, including 6 active Prices and 9 recurring Prices. The legacy Student mapping was an active exact $15 monthly Price. No exact $19, $39, or $69 monthly candidate existed.

## Authorized configuration

| Offer | Monthly amount | Action | Price fingerprint |
|---|---:|---|---|
| `student_founding_monthly` | $15 | Reused the existing approved legacy Student Price | `2bc999c417ea` |
| `student_standard_monthly` | $19 | Created once | `6d74ff201292` |
| `scholar_monthly` | $39 | Created once | `499ad4155254` |
| `adept_monthly` | $69 | Created once | `fc321e2da502` |

The following server-only names now exist as `Sensitive` variables scoped only to Vercel Production:

- `PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY`;
- `PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY`;
- `PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY`;
- `PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY`.

Vercel confirmed each name and scope without returning its value. Because Sensitive values are intentionally not readable through the CLI, the exact just-written mapping values were also injected into one verification process and compared against the live Stripe catalog without printing raw identifiers.

## Final verification

The final catalog contained 6 Products, all active, and 12 Prices, including 9 active and 12 recurring Prices. Each configured offer passed all checks:

- live account and live Price mode;
- active Product and active Price;
- USD and exact amount;
- recurring monthly interval with count 1;
- licensed usage;
- exact server-owned mapping.

All four offer results were `verified`. Raw account, Product, and Price identifiers were not emitted; only 12-character SHA-256 fingerprints were retained.

## Local verification

| Check | Result |
|---|---:|
| Privacy-safe catalog verifier tests | 6/6 pass |
| Idempotent live Price configurator tests | 3/3 pass |
| TypeScript `tsc --noEmit` | Pass |
| Live catalog and exact mapping verification | 4/4 offers verified |

## Remaining launch closure

This packet configures catalog authority only. It did not deploy the local membership implementation, run the L2-02 migration remotely, enable the paid-sales flag, release the approved Student course, create Checkout Sessions, or grant membership. The currently deployed application does not receive these new Production variables until a separately approved deployment. Paid features therefore remain default closed.
