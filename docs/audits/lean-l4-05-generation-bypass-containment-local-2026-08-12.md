# LEAN-L4-05 generation-bypass containment

**Date:** August 12, 2026
**Status:** Complete locally; no deployment, environment change, provider call, or production activation
**Scope:** Fail-closed Deep Search, image, generic proxy, and mixed document/media generation containment while preserving zero-credit read, search, Graph, Journal, and saved-result reopen paths.

## Outcome

The commercial availability policy now has an explicit structural partition. Only Checkout and the three already integrated metered route classes can be reopened through exact server configuration. Eleven unmetered generation classes remain hard closed even if their exact legacy commercial token appears in `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS`:

- fresh Deep Search;
- GPT, Claude, and Gemini generic proxies;
- Tarot and cover image generation;
- chapter-name and metadata generation;
- document and media processing routes that include AI/provider-cost work; and
- the optional AI metadata branch of sacred-text import.

This closes the L0-04 reopening gap: an environment token alone can no longer turn an unmetered customer-reachable route back into a provider path. Reopening one of these actions now requires a reviewed code change that removes it from the hard-closed class and supplies the owning metering or admin-only boundary.

Fresh Deep Search remains present in the versioned catalog at the provisional three-credit hypothesis, but its metering quote is now `offered: false`. Even an `enforce` mode configuration therefore resolves it to `off`. Image generation remains non-offered with no credit quote. Neither action was connected to the shared metering adapter.

The ordinary concept-search route no longer imports dormant AI-relevance helpers. Its GET path remains a database-backed read/search path with no generation call. Library, Graph, Journal, history storage, and saved Seven Lenses reopen remain outside commercial-action gating.

## Current generation inventory

| Class | Routes or surfaces | L4-05 disposition |
|---|---|---|
| Integrated paid generation | `POST /api/working/generate`, `/api/parallax/query`, `/api/parallax/lens/[lensId]` | Still requires both an exact commercial action and the independent server-owned metering mode/kill-switch lifecycle. Default closed. |
| Fresh Deep Search | `POST /api/parallax/ai-search` | Hard closed in code; its legacy environment token cannot reopen it; provisional metering quote is non-offered. |
| Generic provider proxies | `POST /api/ai/gpt`, `/api/ai/claude`, `/api/ai/gemini` | Hard closed in code before auth, request parsing, or provider work. |
| Image generation | `POST /api/practitioner/tarot/generate`, `/api/covers/generate` | Hard closed in code before request parsing, provider construction, storage, or database mutation. |
| Customer-reachable text/metadata generation | `POST /api/chapters/generate-names`, `/api/metadata/extract` | Hard closed in code before auth, request parsing, or provider construction. |
| Mixed document/media processing | `POST /api/process-document`, `/api/process-media` | Hard closed before request parsing, R2, OCR/transcription, metadata, embeddings, images, or persistence. These are not classified as free reads merely because part of their work is non-AI. |
| Conditional sacred-text AI | AI branch of `POST /api/import-sacred-text` | Hard closed before auth, remote parsing, or provider work; explicit `useAI: false` import remains available. |
| Curator-only generation | `POST /api/documents/generate-metadata`, `/api/documents/rescan-all-metadata` | Retained behind an in-handler authenticated admin-role check that precedes request prompts, storage retrieval, and provider construction/calls. Not customer-public. |
| Zero-credit product surfaces | Library, ordinary concept search, Graph, Journal, search history, saved Seven Lenses reopen | No commercial generation guard added; no provider generation introduced. |

The API inventory was refreshed by tracing provider SDK calls and helper imports across every `app/src/app/api/**/route.ts`, then tracing current UI callers for Deep Search, Tarot, covers, chapter naming, uploads, sacred-text import, and curator metadata tools. The two admin-only curator routes are intentionally classified separately rather than being made customer-metered or blocking unrelated Library reads.

## Controlled verification

From `app/`:

| Check | Result |
|---|---|
| `npm.cmd run test:commercial-availability` | 12/12 passing. Covers the complete action partition, hard closure despite exact legacy tokens, opaque 503 guard behavior, guard-before-auth/parse/storage/provider ordering, admin-only exceptions, conditional non-AI import, and zero-credit surfaces. |
| `npm.cmd run test:membership-metering` | 31/31 passing. Includes Deep Search resolving to `off` even when its metering mode is configured `enforce`. |
| Full membership/commercial regression set | 87/87 passing across catalog, entitlement, Checkout, webhook, billing, wallet, metering, and commercial containment. |
| Focused ESLint | Pass on the changed policy, metering catalog, concept route, and containment/metering tests. |
| `npx.cmd tsc --noEmit` | Pass. |
| `git diff --check` | Pass; only the existing Windows line-ending normalization warnings were emitted. |
| `npm.cmd run build` | Pass on Next.js 16.0.10; compiled, typechecked, and generated 139/139 static pages. Existing baseline-browser-mapping, middleware naming, Sentry naming, and dynamic-cookie warnings remain non-fatal. |
| Mission-control audit | Zero missing indexes, unindexed published files, broken links, mirror drift, stale metadata, or unparseable metadata. The pre-existing zero-byte `radix_usage.txt` remains unrelated and untouched. |

## Safe browser and HTTP verification

The built app ran on isolated port 3102 at a 375×812 viewport with no credentials:

- `/library` rendered meaningful content and 154 ready Library entries;
- `/graph` rendered the Correspondences/Knowledge Graph interface;
- `/search` rendered Concept Search and its ordinary search input with no error overlay or blank page;
- `/journal` redirected cleanly to `/login?redirect=%2Fjournal`;
- representative logged-out POSTs to Deep Search, the GPT proxy, Tarot image generation, and document processing stopped at the outer authentication middleware with 401 before reaching any handler or provider; and
- server logs showed only expected missing-session middleware messages and no provider, retrieval, storage, or mutation attempt.

Controlled policy tests cover the inner boundary that a logged-out browser cannot reach: each hard-closed action returns the shared configuration-opaque, non-cacheable 503 even when its exact legacy action token is supplied. Source-order contracts prove the guard precedes authentication, request parsing, retrieval, storage, provider construction, provider calls, and mutations for the applicable routes.

The browser session and isolated server were closed after verification.

## Boundaries and next gate

This packet does not claim an authenticated real-provider, database, balance, concurrency, or kill-switch story. `LEAN-L4-06` owns those full stories for the actions that are actually offered and connected: The Working, Seven Lenses standard/long, and one-lens expansion.

No commercial or metering variable was changed. No migration was applied remotely. No provider, customer, credit, Stripe, Supabase, or Vercel mutation occurred. No action was enabled, deployed, committed, pushed, or opened as a pull request.

## Rollback and reopening

The containment is application-code-only. Reverting the policy partition and Deep Search `offered` flag would restore the earlier behavior, but operational environment changes alone cannot reopen the hard-closed routes. A future Deep Search, image, or document/media generation packet must add its authoritative metering or admin-only boundary, controlled failure/replay tests where applicable, and an explicit reviewed code change before configuration can expose it.
