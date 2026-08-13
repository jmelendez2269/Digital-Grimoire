# LEAN-L5-04 internal shadow cost study — in-progress protocol

**Protocol locked:** August 12, 2026; amended with owner approval on August 12, 2026  
**Required evidence:** 30 successes across three independent execution batches; no calendar-duration requirement  
**Status:** Superseded by the [completed report](lean-l5-04-shadow-cost-study-complete-2026-08-12.md); retained as amended protocol history  
**Scope:** Marker-owned local accounts, localhost application/database, and synthetic prompts only

## Owner-approved protocol amendment — August 12, 2026

Jen determined that seven calendar days were disproportionate for a synthetic localhost cost study. The original Day 1 evidence remains immutable and counts as Batch 1. The superseding gate requires 30 successful integrated actions across three independent execution batches, three accounts, all four action classes, and every maximum-size class. Each new batch restarts the application, rotates local fixture credentials, creates fresh request IDs, and rechecks the localhost/client-bundle/zero-credit/zero-Checkout boundaries. Failure, timeout, abort, and retry evidence remains separate. This amendment changes evidence density and elapsed time only; it does not relax the sample count, action coverage, conservative economics thresholds, or any commercial/production gate.

## Gate status

At the amended-protocol stage, `LEAN-L5-04` remained worth zero completed points until all three batches, 30 successes, the separate resilience matrix, and the full economics/decision matrix passed; launch progress was **104/114 (91.2%)**. The [completed report](lean-l5-04-shadow-cost-study-complete-2026-08-12.md) now controls final status. Beginning or completing this study did not enable or modify production, public sales, paid offers, Checkout, Portal, billing operations, course release, production credits, production metered routes, deployment, migrations, or environment files.

The study runner refuses a non-loopback application or Supabase target. It composes process-local shadow configuration against `127.0.0.1`, enables only the three integrated route classes, excludes Checkout, sets metering to `shadow`, and verifies the active client bundle does not contain the hosted Supabase project reference before it submits local credentials. Shadow successes must create privacy-safe metering/usage rows but no credit reservation, debit, or commit.

## Predeclared success schedule

The amended study records **30 successful integrated actions across three independent batches** using three marker-owned, verified, non-admin Reader accounts. Batch 1 retains its five accepted runs; Batch 2 adds 13 and Batch 3 adds 12.

| Action | Three-batch successes | Required minimum | Size coverage |
|---|---:|---:|---|
| The Working | 8 | 5 | Default plus exact 4,000-byte canonical input in Batch 1 |
| One-lens expansion | 7 | 5 | Default plus a parent derived from an exact-maximum Seven Lenses request in Batch 2 |
| Standard Seven Lenses | 8 | 5 | Default plus exact 16,000-byte canonical input in Batch 2 |
| Long Seven Lenses | 7 | 5 | Default plus exact 16,000-byte canonical input and maximum response class in Batch 3 |
| **Total** | **30** | **30** | All three accounts participate in every batch |

The schedule is locked in `scheduleForStudyBatch()` and covered by tests. The runner accepts the original date-keyed Batch 1 file without rewriting it, writes later evidence to batch-numbered files, refuses duplicate batch evidence, and verifies all three accounts participate in every batch.

Provider failures, timeouts, aborts, and exact-UUID retries are a separate matrix. They do not count toward the 30 successes or action minimums. A batch is not accepted unless it has exactly its predeclared completed `shadow`/Reader successes, matching privacy-safe usage rows, zero new credit artifacts, and zero Checkout requests.

## Evidence boundary

Machine-readable batch evidence is append-only under `docs/audits/lean-l5-04-shadow-study/`. Batch 1 retains `2026-08-12.json`; later batches use `YYYY-MM-DD-batch-NN.json`. It records only:

- stable test-account labels, action code, input profile, and canonical byte count;
- quoted and charged credits, with charged credits required to remain zero;
- provider/model, aggregate input/output units, latency, and estimated billed provider cost;
- aggregate daily success and cost totals; and
- explicit local-only and closed-gate assertions.

It does not record prompts, responses, raw user IDs, provider request IDs, credentials, customer identifiers, or production values. Generated results and telemetry persist only in the isolated local stack during batch execution so the combined evidence can be audited consistently; exact marker-owned cleanup and zero-residue verification occur after the final report.

## Price snapshot and economics model

Current primary-source inputs were verified on August 12, 2026:

- Anthropic Claude Haiku 4.5 standard API pricing: **$1 per million input tokens and $5 per million output tokens**, matching the Working cost calculator. [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- The configured Seven Lenses model is `qwen/qwen3-next-80b-a3b-instruct`. OpenRouter currently shows list pricing beginning around **$0.09 per million input tokens and $1.10 per million output tokens**; the application uses the response's billed `usage.cost` when complete and otherwise falls back to the higher fixed action quote. [OpenRouter model pricing](https://openrouter.ai/qwen/qwen3-next-80b-a3b-instruct/pricing)
- US Stripe standard domestic-card processing is **2.9% + $0.30** per successful charge. [Stripe Payments pricing](https://stripe.com/us/pricing)
- Stripe Billing pay-as-you-go pricing is **0.7% of Billing volume**. [Stripe Billing pricing](https://stripe.com/us/billing/pricing)
- Current Vercel marginal starting rates include **$0.0000006 per Function invocation**, **$0.128 per active CPU hour**, and **$0.0106 per provisioned GB-hour**. [Vercel pricing](https://vercel.com/pricing)

The tier model therefore starts payment fees at `monthly price × 3.6% + $0.30`, then subtracts conservative provider and marginal infrastructure costs. Student, Scholar, and Adept must each stay at or below the plan's **15% provider-cost ceiling** and at or above **70% contribution margin** before founder labor and content-production cost. The final report must model both high-percentile observed use and the costliest permitted full-use mix. Adept defaults to `hold` if heavy-use evidence is insufficient.

Reader has no revenue denominator. Its final decision compares conservative monthly usage to the predeclared **$50 UTC-month global subsidy/breaker budget**, while preserving paid generation and all non-generative reading, search, Graph, Journal, course, and saved-result access.

## Current fixture state

Three exact marker-owned local Reader accounts (`shadow-a`, `shadow-b`, and `shadow-c`) and one synthetic source fixture were created on the isolated Supabase stack at `127.0.0.1:58021`. The accounts received only the normal local Reader grant needed to satisfy metering foreign keys. No provider request, reservation, debit, Checkout request, billing operation, production credit action, or production route change occurred during protocol/fixture setup.

## Batch 1 — August 12 UTC

[The original Day 1 machine evidence](lean-l5-04-shadow-study/2026-08-12.json) is accepted unchanged as Batch 1:

- five integrated `shadow`/Reader successes across all three accounts: Working 2, standard 1, expansion 1, and long 1;
- eight quoted credits and **zero charged credits**, with no new credit reservation or transaction;
- **$0.012760** aggregate estimated provider cost, or **$0.001595 per quoted credit** for this batch's mix;
- exact configured models: Anthropic `claude-haiku-4-5` and OpenRouter `qwen/qwen3-next-80b-a3b-instruct`;
- default Working cost $0.004753 and exact-4,000-byte Working cost $0.004618; the maximum raw intention still resolved deterministically to the same bounded palette, so it did not expand provider input;
- standard cost $0.001414, expansion cost $0.000309, and long cost $0.001666; and
- zero Checkout requests, local-only application/auth/database targets, no raw IDs/provider IDs/prompts/responses in evidence, and no port 3017 listener after shutdown.

The first attempted run occurred inside the network-restricted sandbox and produced one local `provider_error` Working lifecycle at the conservative $0.05 fallback quote. It is retained append-only under `excludedHarnessAttempts`, but it counts as neither a success nor a deliberate failure/abort/retry test. The accepted retry used scoped approval for synthetic Anthropic/OpenRouter calls. Two intermediate browser-login harness failures occurred before route submission and created no metering or provider row.

Batch 1 is directional only. If every monthly credit cost as much as Batch 1's highest successful per-credit observation ($0.004753), provider cost would be approximately $0.14 for Student, $0.48 for Scholar, and $1.43 for Adept—well below their ceilings—but no tier decision is permitted from one batch, one maximum-size action class, or five successes.

## Completion result

The [completed report](lean-l5-04-shadow-cost-study-complete-2026-08-12.md) records 30/30 successes across all three batches, 32/32 separate resilience tests, conservative full-use and 5× stress economics, `enable` decisions for Reader/Student/Scholar/Adept, exact marker-owned local cleanup, and unchanged production/commercial gates. L5-05 remains `not_started` unless separately authorized.
