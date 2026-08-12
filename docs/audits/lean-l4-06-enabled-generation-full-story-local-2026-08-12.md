# LEAN-L4-06 enabled-generation full-story local verification

**Date:** August 12, 2026
**Target:** local Next.js application and local `Digital-Grimoire` Supabase stack
**Result:** pass
**Scope:** authenticated Reader stories for every launch-offered generative action, plus replay, concurrency, failure return, controls, bypass containment, browser behavior, and exact cleanup

## Authorization and data boundary

Jen explicitly approved use of the existing marker-owned local Reader fixture from the earlier L1 work and approved sending only synthetic L4-06 prompts plus tagged local fixture context to the configured Anthropic and OpenRouter providers. No production/customer prompt, document, graph row, credential, identifier, or billing data was sent. No production database, Vercel setting, Stripe object, deployment, remote migration, paid offer, or public action flag changed.

The retained local account was confirmed as a verified, non-admin `user/free` Reader. Evidence uses its one-way fingerprint `449dd46d8048`; the raw user ID and temporary password are excluded. Three exact tagged graph fixtures supplied the provider context. Setup backed up the fixture's original local billing projection, temporarily exercised Reader allowance creation, and added a tagged local-only balance adjustment. Cleanup restored the original projection and removed every packet-owned row.

## Findings repaired during the gate

Two real full-story blockers were found and fixed before acceptance:

1. The Working's Anthropic calls passed `{ timeout: undefined }`. The current SDK rejects that request locally before any provider call. `workingProviderRequestOptions()` now omits the property unless a finite positive timeout exists, and a regression test locks the boundary.
2. Seven Lenses still wrapped the form in the obsolete lifetime-query `PremiumGate`. A legitimate Reader with the new 10-credit wallet therefore saw “Upgrade to Continue” instead of the metered controls. The page no longer calls `/api/parallax/rate-limit` or renders the legacy gate/display; action availability and cost now come from the metered flow.

After the timeout repair, the approved synthetic provider preflight completed with one assembled local component and a real `claude-haiku-4-5` response. The privacy-safe summary recorded 829 input units, 757 output units, 2,853 result characters, and `moderated=false`.

## Full-story matrix

All stories ran through an authenticated browser session into the real local Next.js routes, local PostgreSQL/RPC authority, configured external provider, durable result tables, and metering ledger. The server—not the browser—selected the quoted credits.

| Action | Success and durable result | Completed replay | Concurrent loser | Provider failure return | Kill switch | Insufficient balance |
|---|---|---|---|---|---|---|
| The Working | 1 credit committed; one owned Working saved | Same result, 0 additional credits | `METERING_CONCURRENCY_LIMIT` | `METERING_PROVIDER_FAILED`; hold released | Global and action kills returned `METERING_ACTION_KILLED` before metering | `METERING_INSUFFICIENT_CREDITS`; no provider or hold |
| Seven Lenses standard/medium | 2 credits committed; one owned parent response saved | Same response, 0 additional credits | SSE concurrency error | SSE provider-failure error; hold released | SSE killed error before metering | SSE insufficient-credit error; no provider or hold |
| Seven Lenses long | 3 credits committed; one owned parent response saved | Same response, 0 additional credits | SSE concurrency error | SSE provider-failure error; hold released | SSE killed error before metering | SSE insufficient-credit error; no provider or hold |
| One-lens expansion | 1 credit committed; one owned child saved against its owned parent | Same child, 0 additional credits | `METERING_CONCURRENCY_LIMIT` | `METERING_PROVIDER_FAILED`; hold released | Global and action kills returned `METERING_ACTION_KILLED` before metering | `METERING_INSUFFICIENT_CREDITS`; no provider or hold |

The initial four successful actions consumed exactly 7 credits and created four distinct durable references. Four real-provider concurrency winners then consumed another 7 credits; all four losers created no request row. The aggregate before control testing was therefore 8 completed successes, 8 committed reservations, 8 success usage events, 2 Workings, 4 parent responses, 2 lens-expansion children, 86 available credits, and 0 reserved credits.

Four invalid-provider stories produced four completed `provider_error` requests, four released reservations, and four privacy-safe `PROVIDER_ERROR` usage events without creating any extra result. Per-action and global kill-switch matrices each stopped all four action variants before reservation/provider work. After the tagged balance drain, all four variants returned the stable insufficient-credit outcome with no reservation or usage row. The final pre-cleanup aggregate contained 16 metering request rows: 8 successes, 4 provider failures, and 4 credit denials; there were 12 usage rows, no pending request, and no pending reservation.

Provider telemetry identified the actual successful paths as `anthropic / claude-haiku-4-5` for The Working and `ai-orchestrator / qwen/qwen3-next-80b-a3b-instruct` for the three Seven Lenses variants. Operational telemetry stored zero prompt, query, or content fields.

## Bypass and UI verification

With every exact legacy reopening token present, authenticated calls to all eleven structurally closed generation classes still returned opaque `ACTION_TEMPORARILY_UNAVAILABLE` responses: fresh Deep Search, GPT, Claude, Gemini, tarot generation, cover generation, chapter-name generation, metadata extraction, document processing, media processing, and AI sacred-text import. The two curator-only metadata generation routes returned `403` for the non-admin Reader. Ordinary authenticated reads and saved-result history remained available.

Real Chromium verified the member controls at 375×812 and 1440×900. The Working and Seven Lenses rendered without horizontal overflow or browser console errors. Seven Lenses displayed the normal “Analyze · 2 Prism Credits” control and no upgrade gate. A real zero-balance form submission rendered “You do not have enough Prism Credits for this analysis” while preserving the exact typed question. The Next.js development badge reflected existing development warnings and a pre-existing `/api/user/parallax-preferences` `404`; it was not a metering-route or browser-console failure.

## Cleanup and rollback

The server and browser session were stopped. `lean-l4-06-full-story-cleanup.sql` deleted the packet-owned Workings, parent responses, lens children, usage events, metering requests, transactions, reservations, grants, credit account, and exact tagged graph fixtures; it then restored the retained Reader's original billing projection and dropped the temporary backup schema.

The cleanup assertion returned `result=clean`, `residue=0`, and `account_retained=true`. A final independent read verified exactly one marker-owned fixture, `role=user`, `subscription_status=free`, original `student/canceled` billing projection, zero metering residue, zero result residue, and no backup schema. The ephemeral password file was deleted. No rollback of the L4 implementation was required; the default-closed server action flags remain the operational rollback.

## Automated verification

- Accumulated commercial and membership suite: **88/88 passed**.
- L4-06 focused ESLint: passed.
- Global TypeScript: `npx tsc --noEmit` passed.
- Production build: passed; **139/139** static pages generated.
- `git diff --check`: passed before documentation updates.
- A broader changed-file lint found 13 existing `ResponseStream.tsx` errors outside this packet's edited lines; the packet-local lint is clean and the production build/typecheck pass. This baseline is not represented as newly introduced or repaired by L4-06.

## Acceptance

`LEAN-L4-06` satisfies its local full-story acceptance boundary. Phase L4 is complete locally at 21/21 points. This evidence does not authorize production migrations, deployment, metered-action enablement, paid offers, course release, Checkout UI, billing operations, or live activation. Those remain governed by Phase L5, including the seven-day/30-success cost study and the separately approved production canary.
