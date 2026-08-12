# LEAN-L4-02 The Working metering — local acceptance evidence

**Date:** August 11, 2026
**Scope:** Local application implementation and controlled provider fixture
**Status:** Accepted locally; production activation remains closed

## Outcome

The Working is the first and only customer generative route connected to the
shared L4 metering adapter. Its server-owned launch quote is one Prism Credit.
The route still requires the independent default-closed commercial-action gate
and a non-`off` server metering mode, so this packet does not activate the route
locally or in production.

A successful generation now means all of the following have occurred in order:

1. Server session authentication and verified-email validation.
2. Membership entitlement resolution and the fixed `working.generate` quote.
3. Atomic L4 controls and, in `enforce`, one L3 credit reservation.
4. Deterministic palette assembly, optional semantic Haiku resolution, and
   Haiku ritual synthesis under one 55-second provider deadline.
5. A user-owned `workings` draft insert containing the server-generated
   palette, ritual, and model.
6. Credit commit and privacy-safe L4/usage settlement.

Provider success by itself is not chargeable. Provider, moderation, timeout,
abort, empty-result, or `workings` persistence failure releases once. The UI
retains the intention on every error and no longer sends the generated palette
or ritual to the separate `/api/working/save` endpoint.

## Replay and persistence boundary

The browser creates a UUID request ID and reuses it for ambiguous network or
in-progress retries. It also retains rather than rotates the ID after a rare
post-persistence settlement failure, preventing a second generation/charge
while the already saved draft is refreshed in `My Workings`. A completed duplicate is
validated against the same canonical input fingerprint, then the service-only
metering store loads its bounded `working:<uuid>` result reference. The route
loads that exact user-owned working through an allowlisted projection and
returns it without another provider call, persistence write, reservation, or
charge.

Known failed or released requests cannot be rebound to a different input. A
member-requested new generation uses a new request ID and remains a new action.

## Provider telemetry and privacy

Semantic fallback and synthesis both use `claude-haiku-4-5`. When fallback is
needed, their input/output units and estimated cost are aggregated into the one
L4 usage event; neither call is discarded. The fixed standard estimate is
$1 per million input tokens and $5 per million output tokens, versioned in the
Working provider helper from Anthropic's published Haiku 4.5 rate:
<https://www.anthropic.com/claude/haiku>.

Telemetry contains only provider/model, bounded provider request identity,
aggregate units, latency, outcome, estimated cost, and the durable result
reference. It does not contain intention, interpretation, palette, ritual,
email, Stripe identifiers, or arbitrary metadata.

## Customer interaction

- The form displays `Launch cost: 1 Prism Credit` before submission.
- The browser submits only the trimmed intention and a UUID request ID; it
  never submits cost, mode, plan, balance, provider, or model authority.
- Loading and disabled states remain visible, errors are announced with
  `role="alert"`, primary controls retain at least a 44-pixel target, and the
  textarea value is never cleared by a failure.
- Generation saves a private draft automatically. `I cast this` now calls only
  the existing owner-scoped cast route; `View saved draft` opens the already
  persisted record.

## Verification

- Metering and controlled Working provider fixture: **14/14 passed**.
  - Enforce success reserves, aggregates semantic plus synthesis usage,
    persists, and commits exactly once.
  - Completed replay returns the exact working with no provider or credit work.
  - Provider, moderation, timeout, abort, empty, and persistence failures each
    produce the expected privacy-safe outcome and one release.
  - Static client contract proves one-credit disclosure, UUID submission,
    input preservation, and no `/api/working/save` call.
- Commercial default-closed regressions: **9/9 passed**.
- Membership catalog, entitlement, Checkout, webhook, billing, and wallet
  regressions: **44/44 passed**.
- Targeted ESLint: passed.
- TypeScript `--noEmit`: passed.
- Next.js 16 webpack production build: passed in 215.6 seconds; **139/139**
  static pages generated.
- `git diff --check`: passed.

An automated dev-browser check was attempted but not counted as acceptance
evidence because a pre-existing unrelated Next.js process held `.next/dev/lock`
without a reachable listener. It was preserved rather than terminated. The
production build and client-contract test passed.

## Safety and exclusions

- No real Anthropic request, customer mutation, real credit reservation,
  Stripe operation, deployment, migration, environment change, paid sale,
  course release, commit, push, or pull request occurred.
- `working_generation` and all metering actions remain default closed without
  explicit server configuration. No `NEXT_PUBLIC_` metering or cost authority
  was added.
- Seven Lenses, lens expansion, Deep Search, image generation, and generic AI
  proxies remain disconnected from the adapter.
- The unrelated course-parser changes and local `supabase/config.toml` changes
  were not edited or included in this packet.

## Next gate

`LEAN-L4-03` may meter Seven Lenses at the fixed two/three-credit standard/long
quotes. Its streaming durable boundary must make persistence failure and
abort/error settlement explicit, replace query-bearing legacy telemetry, and
leave all later routes and production activation gates closed.
