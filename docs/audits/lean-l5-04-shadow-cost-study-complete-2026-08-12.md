# LEAN-L5-04 shadow cost study and tier economics gate — complete

**Completed:** August 12, 2026  
**Scope:** Three independent localhost execution batches, three marker-owned Reader accounts, synthetic prompts only  
**Result:** Success and resilience matrices pass; Reader, Student, Scholar, and Adept record `enable` economics decisions  
**Launch effect:** Cost evidence only. No offer, Checkout, billing operation, course release, production credit action, production metered route, deployment, migration, environment, or public-sales gate is enabled by this report.

## Owner-approved evidence gate

Jen replaced the original seven-calendar-day duration rule on August 12, 2026 with a denser evidence gate: 30 successful actions across three independent execution batches, three accounts, all four action classes, default and maximum-size coverage, a separate resilience matrix, and the unchanged conservative economics thresholds. The [amended protocol](lean-l5-04-shadow-cost-study-in-progress-2026-08-12.md) records the decision. The original [Day 1 evidence](lean-l5-04-shadow-study/2026-08-12.json) remains immutable and counts as Batch 1.

Each later batch restarted the local app, rotated the three fixture passwords, generated fresh request UUIDs, verified the browser bundle used loopback Supabase and excluded the hosted project reference, and required zero credit reservations/transactions and zero Checkout requests before evidence could be accepted.

## Accepted success evidence

| Batch | Evidence | Successes | Provider cost | Boundary result |
|---|---|---:|---:|---|
| 1 | [Original Day 1](lean-l5-04-shadow-study/2026-08-12.json) | 5 | $0.012760 | 3 accounts; exact 4,000-byte Working; 0 charged credits; 0 Checkout |
| 2 | [Batch 2](lean-l5-04-shadow-study/2026-08-12-batch-02.json) | 13 | $0.026413 | 3 accounts; exact 16,000-byte standard and maximum-derived expansion; 0 charged credits; 0 Checkout |
| 3 | [Batch 3](lean-l5-04-shadow-study/2026-08-12-batch-03.json) | 12 | $0.025107 | 3 accounts; exact 16,000-byte long maximum-response class; 0 charged credits; 0 Checkout |
| **Total** |  | **30** | **$0.064280** | **52 quoted credits; 0 charged credits; 0 Checkout** |

| Action | Successes | Required | Total provider cost | Maximum action cost | Maximum observed cost/credit |
|---|---:|---:|---:|---:|---:|
| The Working | 8 | 5 | $0.036499 | $0.005273 | $0.005273 |
| One-lens expansion | 7 | 5 | $0.002508 | $0.000499 | $0.000499 |
| Standard Seven Lenses | 8 | 5 | $0.012438 | $0.002768 | $0.001384 |
| Long Seven Lenses | 7 | 5 | $0.012835 | $0.003033 | $0.001011 |

Across the 30 accepted successes, observed provider cost was $0.001236 per quoted credit on average, $0.004753 at nearest-rank p95, and $0.005273 at the maximum. Latency was 13,132 ms at nearest-rank p95 and 15,338 ms at the maximum. The maximum-size cases cost $0.004618 for Working, $0.002768 for standard synthesis, $0.000499 for maximum-derived-parent expansion, and $0.003033 for long synthesis.

The maximum-size Working input resolves to the same bounded server palette as its default semantic input, so raw intention length did not inflate provider input. Standard and long maximum-size requests did exercise exact 16,000-byte canonical inputs.

## Excluded harness attempts

Two provider-error lifecycles are retained but excluded from the 30 successes and from the deliberate resilience matrix:

- the original network-restricted sandbox attempt used the Working $0.05 conservative fallback estimate; and
- the first Batch 3 attempt stopped on its first standard request with `PROVIDER_ERROR` and a $0.10 conservative fallback estimate.

Neither attempt charged a credit. Two earlier browser-login harness failures occurred before route submission and created no provider or metering row. Error fallback estimates are not treated as successful-generation COGS because no successful customer action or charged credit resulted.

## Separate resilience matrix

`npm run test:membership-metering` passed **32/32** controlled tests under the repository's `react-server` condition. The matrix separately covers:

- provider, moderation, empty-response, persistence, timeout, disconnect, and abort paths;
- exactly-once reservation release on failed enforce-mode actions;
- exact completed-request UUID replay without another provider call or credit charge;
- synthesis-versus-expansion request identity isolation;
- durable persistence before commit/content emission; and
- shadow execution without credit reservation or charge.

The initial raw `tsx --test` command was rejected by the repository's intentional `server-only` import guard before tests executed. It was replaced with the established `test:membership-metering` command and is not a product or resilience failure.

## Price and infrastructure inputs

The study uses the August 12 primary-source snapshot recorded in each evidence packet:

- Anthropic Haiku 4.5: $1/million input tokens and $5/million output tokens;
- OpenRouter `qwen/qwen3-next-80b-a3b-instruct`: observed list rates beginning around $0.09/million input and $1.10/million output, with response-reported billed cost preferred;
- Stripe US domestic card processing: 2.9% + $0.30;
- Stripe Billing pay as you go: 0.7% of Billing volume; and
- Vercel: $0.0000006/invocation, active CPU from $0.128/hour, and provisioned memory from $0.0106/GB-hour.

Payment fees are therefore modeled as `price × 3.6% + $0.30`. Marginal infrastructure deliberately overestimates active compute by applying the full maximum observed 13,132 ms one-credit runtime to one invocation, active CPU, and 2 GB provisioned memory for every consumed credit. This yields $0.000545 marginal infrastructure per credit. Actual active CPU time should be lower than wall latency, but the conservative figure is retained.

## Conservative full-use economics

The base case assigns every included credit the costliest observed successful provider cost per credit ($0.005273) plus the conservative infrastructure estimate. The stress case multiplies both provider and marginal infrastructure cost by **5×** while leaving payment fees unchanged.

| Tier | Price / credits | Base provider COGS | Base provider share | Base contribution margin | 5× provider COGS | 5× provider share | 5× contribution margin | Decision |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Student | $15 / 30 | $0.158190 | 1.05% | 93.24% | $0.790950 | 5.27% | 88.58% | `enable` |
| Scholar | $39 / 100 | $0.527300 | 1.35% | 94.14% | $2.636500 | 6.76% | 88.17% | `enable` |
| Adept | $69 / 300 | $1.581900 | 2.29% | 93.44% | $7.909500 | 11.46% | 83.32% | `enable` |

Base marginal infrastructure is $0.016345 Student, $0.054485 Scholar, and $0.163455 Adept. Payment fees are $0.84, $1.704, and $2.784 respectively. Every paid tier remains below its 15% provider-cost ceiling and above its 70% contribution-margin floor in both the base and 5× stress cases. Adept has the required maximum-input/maximum-response evidence and seven successful long actions, so the amended minimum evidence gate does not force a data-poor hold.

These decisions establish cost viability for the current allowances and action weights. They do not prove customer willingness to pay or optimal value-based price points.

## Reader subsidy and breaker decision

Reader records `enable` with the existing **$50 per UTC month global breaker preserved unchanged**. Full use of 10 credits costs $0.052730 in the base provider-only case and $0.263650 under 5× provider stress, both below the $0.50 per-active-Reader ceiling. The $50 breaker supports at least 948 fully utilized Reader months at the base case or 189 at the 5× stress case before pausing additional free generation. Paid generation and all non-generative reading, search, Graph, Journal, saved-result, and course access remain outside that pause.

## Decision and remaining launch gates

| Decision | Result | Meaning |
|---|---|---|
| Reader subsidy/breaker | `enable` | Keep 10 monthly credits and the $50 UTC-month breaker |
| Student 30 / $15 founding | `enable` | Cost gate passes; this does not open Checkout or sales |
| Scholar 100 / $39 | `enable` | Cost gate passes; this does not open Checkout or sales |
| Adept 300 / $69 | `enable` | Heavy-use and stress economics pass; this does not open Checkout or sales |

`LEAN-L5-04` is complete after exact marker-owned local cleanup and final verification. `LEAN-L5-05` remains independently `not_started`: production deployment/migrations, named live Portal configuration, an eligible non-admin production canary, Jen's public-flag approval, paid activation, rollback smoke, and the later 72-hour monitoring gate are not authorized or satisfied here.

## Cleanup

The hardened application API correctly denied direct service-role deletion from `ai_usage_events`, so cleanup switched to one asserted transaction as the owner of the isolated local database. A read-only preflight proved exactly three correctly marked accounts and zero same-email wrong-marker accounts. The transaction removed 32 metering requests, 32 usage events, three credit transactions/grants/accounts, the three public/auth account pairs, and the exact tagged source link/correspondence/intention. A final read-only query returned zero for every account and source-fixture residue category.

The local fixture rows are deleted and not recoverable through the app. The privacy-safe batch evidence and this report remain. No production or customer data was connected, read, changed, or deleted.

## Verification

- success-matrix tests: 4/4 passed;
- metering/resilience tests: 32/32 passed;
- focused ESLint: passed;
- global TypeScript `--noEmit`: passed;
- app listener on port 3017: stopped after each batch;
- all three accepted batches: zero charged credits and zero Checkout requests; and
- exact local marker cleanup: zero residue.
