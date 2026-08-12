# LEAN-L0-04 stale-sales and unmetered-route closure

**Date:** August 6, 2026  
**Status:** Complete — locally verified application containment; not deployed  
**Scope:** Reversible, server-only fail-closed guards. No Stripe, Supabase, Vercel, staging, or production mutation.

## Outcome

Stale Checkout and every confirmed customer-reachable unmetered AI, image, or
provider-cost entry point now stop at a centralized application guard before
Stripe, provider, database, storage, or expensive parsing work. All actions are
disabled when configuration is absent. A future packet may reopen only an exact
action token; there is no wildcard or truthy shortcut.

Checkout has a second independent boundary. The `checkout` action must be
enabled and the submitted Price ID must exactly match the server-only
`PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS` list. The route no longer resolves tiers
from legacy `NEXT_PUBLIC_STRIPE_PRICE_ID_*` variables, accepts no arbitrary
payment mode, and validates the offer before creating Supabase or Stripe
clients. Unknown, malformed, unconfigured, and legacy-only Price mappings all
receive the same configuration-opaque 503 response.

The shared disabled response is:

- HTTP 503 with `Cache-Control: no-store` and `Retry-After: 3600`;
- `{ "error": "This action is temporarily unavailable.", "code": "ACTION_TEMPORARILY_UNAVAILABLE" }`;
- no environment names, allowlist contents, Price IDs, provider details, or
  credentials.

## Server-only configuration

| Variable | Default | Semantics |
|---|---|---|
| `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS` | Empty / all disabled | Comma-separated exact action tokens. Unknown tokens and `*` enable nothing. |
| `PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS` | Empty / no supported Price | Exact server-only Price IDs; effective only when `checkout` is also enabled. |

Only empty examples were added to `app/.env.example`. No actual local, Vercel,
staging, or production environment value was changed.

## Route inventory and disposition

| Route or group | Effective caller boundary before L0-04 | Classification | L0-04 disposition |
|---|---|---|---|
| `POST /api/stripe/create-checkout-session` | Signed-in customer; browser supplied Price and mode | Stale sale | Default-closed `checkout` guard plus exact server Price allowlist; legacy public tier mapping removed. |
| `POST /api/working/generate` | Signed-in customer | Unmetered generation | Guarded as `working_generation`. |
| `POST /api/parallax/query` | Signed-in customer | Unmetered generation | Guarded as `seven_lenses_generation`. |
| `POST /api/parallax/lens/[lensId]` | Signed-in customer | Unmetered generation | Guarded as `seven_lenses_expansion`. |
| `POST /api/parallax/ai-search` | Signed-in customer | Unmetered Deep Search | Guarded as `deep_search_generation`. |
| `POST /api/ai/gpt`, `/api/ai/claude`, `/api/ai/gemini` | Signed-in customer; directly callable even without an active UI caller | Generic provider bypass | Independently guarded as `gpt_proxy`, `claude_proxy`, and `gemini_proxy`. |
| `POST /api/practitioner/tarot/generate` | Signed-in customer and active Tarot UI | Unmetered image generation plus storage/database writes | Guarded as `tarot_image_generation`; OpenAI client construction moved behind the guard. |
| `POST /api/covers/generate` | Admin UI caller, but route itself accepted any signed-in customer | Customer-reachable image generation | Guarded as `cover_image_generation`. |
| `POST /api/chapters/generate-names` | Signed-in customer and Table of Contents caller | Customer-reachable text generation | Guarded as `chapter_name_generation`. |
| `POST /api/metadata/extract` | Any signed-in customer | Customer-reachable metadata generation and database update | Guarded as `metadata_extraction`. |
| `POST /api/process-document` | Admin UI caller, but route relied only on middleware and trusted caller `userId` | Customer-reachable R2/OCR/AI/embedding/image work | Guarded as `document_processing`; R2 client construction moved behind the guard. |
| `POST /api/process-media` | Admin UI caller, but route relied only on middleware and trusted caller `userId` | Customer-reachable R2/transcription/AI/image work | Guarded as `media_processing`; R2 client construction moved behind the guard. |
| AI-enhanced branch of `POST /api/import-sacred-text` | Signed-in admin and Library callers | Optional customer-reachable AI metadata work | `useAI !== false` is guarded as `sacred_text_ai_metadata` before auth, remote parsing, or provider work; explicit `useAI: false` imports remain available. |
| `POST /api/documents/generate-metadata` and `/api/documents/rescan-all-metadata` | Explicit in-handler admin role check before provider work | Already admin-only | Left unchanged to preserve curator workflows. Role authority repair remains L0-03. |
| `/api/concepts` AI-relevance imports | Public read route; imported scoring helpers are unused; writes have an in-handler admin check | No active provider call on the public path | Left unchanged. |
| Portal, webhook, subscription sync, usage reporting, deterministic Working assembly, cover scraping | No new Checkout sale or active generative provider bypass in this packet | Out of scope | Left unchanged for their owning packets. |

## Verification

From `app/`:

| Check | Result |
|---|---|
| `npm.cmd run test:commercial-availability` | 8/8 passing. Covers default closure, exact-token behavior, Checkout dual authorization, runtime 503 response, and source ordering for all guarded routes. |
| `npx.cmd tsc --noEmit` | Pass. |
| Focused ESLint on the new policy/wrapper/test and rewritten Checkout route | Pass with zero findings. |
| `git diff --check` | Pass; only line-ending normalization warnings from the existing Windows checkout. |
| `npm.cmd run build` | Pass on Next.js 16.0.10: compiled, typechecked, generated 136/136 static pages, and completed build traces. |
| Name-only local configuration check | Both new variables are absent from the current process, `.env.local`, `.env.local.staging`, and `.env.local.local-supabase`; no values were printed. |

A broader lint attempt against entire legacy route bodies reported 24 existing
`no-explicit-any` errors and 10 existing unused-variable warnings. The new
policy, wrapper, tests, and rewritten Checkout route are clean, TypeScript
passes globally, and the production build succeeds; unrelated route-body lint
cleanup was not folded into this containment packet.

## Rollback and reopening

The change is application-code-only and reversible by reverting the guard
patch. Operational reopening should instead wait for the owning billing or
metering packet, then add only the exact verified action token. Checkout also
requires an exact server-only Price allowlist. Leaving either variable absent
or empty remains safe.

This packet does not claim deployed containment. Staging/production verification,
environment changes, deployment, and kill-switch rehearsal belong to
`LEAN-L0-05` and require explicit approval. L0-02 remains accepted; its
production/staging adversarial probe path is permanently retired.
