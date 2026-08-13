# LEAN-L2-03 read-only Stripe catalog verification

**Evidence date:** August 11, 2026  
**Execution time:** 2026-08-11 15:18:59 UTC  
**Scope:** The Stripe account configured by `app/.env.local`; account, Product, and Price reads only  
**Result:** HOLD — test account inspected; exact lean catalog is not configured  
**Packet state:** `blocked`; no points earned

## Approval and boundary

Jen approved read-only LEAN-L2-03 verification of the configured Stripe account, Products, and Prices. The approval explicitly excluded customer/subscription access, Stripe mutation, environment-variable changes, deployment, database changes, and production changes.

The verifier performed only:

- `accounts.retrieve`;
- `products.list`;
- `prices.list`.

It did not call customer, subscription, webhook, Checkout, invoice, or payment resources. External mutations: **0**.

## Privacy repair

The previous `verify-stripe-prices.ts` was not executed because it printed raw account/email/Product/Price data, used legacy `NEXT_PUBLIC_` identifiers as authority, and contained a hard-coded account identifier. It was replaced locally with a read-only verifier that emits only aggregate counts, expected offer attributes, and 12-character SHA-256 fingerprints.

The retained account fingerprint for audit comparison is `52564493b5d0`. No raw account, Product, or Price ID; product name/description; metadata value; key material; customer data; or subscription data appears in this artifact.

## Configured account result

| Check | Result |
|---|---|
| Account mode | Test |
| Products | 8 total; 8 active |
| Prices | 8 total; 8 active |
| Recurring Prices | 5 |
| New server-owned offer variables | 0/4 configured |
| External mutations | 0 |

The four required server-owned variables are absent:

- `PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY`;
- `PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY`;
- `PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY`;
- `PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY`.

No variable was created, changed, or populated.

## Exact offer checks

An exact candidate means active Product, active Price, matching test mode, USD, exact amount, recurring monthly interval with count 1, and licensed usage.

| Offer | Required | Configured | Exact candidates | Disposition |
|---|---:|---:|---:|---|
| `student_founding_monthly` | $15/month | No | 3 | Ambiguous; no server-owned mapping |
| `student_standard_monthly` | $19/month | No | 0 | Missing |
| `scholar_monthly` | $39/month | No | 0 | Missing |
| `adept_monthly` | $69/month | No | 0 | Missing |

The three $15 candidate fingerprints are `5f81c477c3dc`, `6910742141a3`, and `f1184e3bb931`. Candidate existence does not establish offer identity; ambiguity must fail closed.

## Legacy browser-visible mappings

All three legacy test mappings still exist and are active monthly USD Prices:

| Legacy variable | Price fingerprint | Amount |
|---|---|---:|
| `NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT` | `a6f9e273aaa4` | $5.00 |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR` | `3e7f04f3dbe6` | $9.99 |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT` | `f1184e3bb931` | $15.00 |

These are not lean launch authority and remain excluded by the default-closed catalog and Checkout guards.

## Verification checks

| Check | Result |
|---|---:|
| Safe verifier tests | 6/6 pass |
| Focused ESLint | Pass |
| TypeScript `tsc --noEmit` | Pass |
| `git diff --check` | Pass |
| Authorized Stripe read | Completed; intentional nonzero HOLD result |

## Why the packet is blocked

LEAN-L2-03 requires exact server configuration and verified account mode, Product, currency, amount, monthly interval, active state, and offer mapping for each Price. The inspected account is test mode, all four authoritative variables are absent, $15 is ambiguous, and the other three required amounts have no exact candidate. The packet therefore cannot be marked `done`.

Unblocking requires separate exact decisions and approvals for:

1. the target launch account/mode and approved credential path;
2. selection of one unambiguous founding Student Price;
3. creation of any missing immutable monthly Prices, if Jen chooses to create them;
4. setting the four server-only Price variables in the explicitly named environment;
5. a new read-only verification run against that exact configuration.

None of those actions was authorized or performed here. Paid sales, course release, Checkout, and metered actions remain closed.
