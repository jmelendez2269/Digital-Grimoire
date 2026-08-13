# LEAN-L4-04 lens expansion metering — local evidence

**Date:** August 12, 2026
**Scope:** Local implementation and controlled provider fixtures only
**Result:** `LEAN-L4-04` acceptance boundary satisfied locally

## Acceptance result

One-lens expansion now resolves only to the server-owned `seven_lenses.expand` quote at one Prism Credit. The browser supplies an owned durable parent-response UUID, the lens route identity, and a distinct UUID for the logical expansion request. It cannot supply query text, lens weights, response length, action code, price, balance, plan, or metering mode.

The server loads the authenticated user's exact `convergence_responses` parent before any credit hold. It derives the immutable generation inputs from that saved parent, verifies that the requested lens was active in the parent, and then enters the same shared adapter used by The Working and Seven Lenses synthesis. Parent synthesis and expansion use different action fingerprints and result-reference prefixes, so a parent request UUID cannot masquerade as or reopen an expansion.

The expansion lifecycle is:

1. authenticate and load the exact user-owned parent response;
2. validate the parent UUID, active lens identity, and distinct expansion request UUID;
3. create an addressable expansion UUID before provider work;
4. resolve entitlement, the fixed one-credit quote, and shared L4 controls;
5. reserve exactly one credit in enforce mode;
6. retrieve only the selected lens context and run its provider call under a 60-second deadline and request abort signal;
7. insert the complete child into `convergence_lens_expansions` through the service client;
8. commit/release and settle privacy-safe provider usage through the shared adapter;
9. only then return the expansion content to the client.

The child table keeps the settled parent immutable. Each child has its own UUID, owner, parent UUID, validated lens ID, response text, sources, and timestamps. RLS is forced; authenticated clients have read-only access to their own children, while writes remain service-only.

## Retry, failure, and telemetry boundary

- A completed expansion UUID reopens the exact durable child without retrieval, provider, persistence, reservation, or another charge.
- The card retains its UUID after an in-progress, replay, settlement-ambiguous, or network-disconnect outcome. It clears the UUID after definitive validation or released failure outcomes so a new attempt does not collide with a released request.
- Unmount or parent change aborts the request. Provider, timeout, abort, empty-result, and persistence failures release exactly once and never expose expansion content.
- The parent synthesis remains visible throughout every recoverable expansion failure.
- The active route no longer accepts query, weights, or response length and no longer writes query-bearing legacy usage telemetry.
- Provider request ID, input/output units, and reported cost are recorded when available; missing cost uses the conservative fixed expansion quote.

## Controlled verification

The L4-04 focused suite passed **9/9**:

- parent ownership and active-lens validation before any hold;
- exact one-credit reservation, durable child persistence, then one commit;
- exact completed replay with no provider or charge;
- parent synthesis request identity cannot replay as an expansion;
- different lenses retain distinct fingerprints and child UUIDs;
- provider, empty-result, and persistence failures release exactly once;
- real pre-aborted request and an actually expiring deadline release once;
- route/client contract exposes one credit and only parent/request UUIDs;
- migration ownership, parent, lens, RLS, and service-only write boundaries.

Regression checks passed:

- **31/31** shared metering, The Working, Seven Lenses synthesis, and expansion checks;
- **84/84** total membership and commercial checks across catalog, entitlement, Checkout, webhook, billing, wallet, metering, and route containment;
- focused ESLint with zero warnings or errors;
- standalone `tsc --noEmit`;
- `git diff --check` (line-ending conversion warnings only);
- Next.js 16 production build, **139/139** pages.

The React quality pass removed stale client props left by the legacy request body, kept transient request identity in refs, hoisted the ambiguous-code set, passed the expansion callback directly, and preserved teardown cancellation and accessible disabled/loading states.

## Browser boundary

The built app was started on isolated `127.0.0.1:3101` and checked at **375×812**. `/seven-lenses` correctly redirected the unauthenticated session to `/login?redirect=%2Fseven-lenses`; the sign-in surface was nonblank and had no Next.js error overlay. The public home route also rendered meaningful content without an overlay. The browser session and isolated server were closed.

No approved authenticated test credential was available, so no expansion, provider call, remote database write, or credit mutation was attempted. `LEAN-L4-06` retains the authenticated real-provider/API/database/credit story.

## Rollback and unchanged gates

Rollback remains immediate and data-preserving: leave either `seven_lenses_expansion` commercially disabled or `seven_lenses.expand` metering mode `off` (both are default closed), or use the global/per-action kill switches. Existing parent responses and durable expansion children remain readable.

No real provider call, customer credit, Stripe action, remote migration, deployment, environment change, production mutation, paid sale, course release, commit, push, or PR occurred. The unrelated course-parser and local Supabase configuration edits were preserved.

## Next packet

`LEAN-L4-05` may now fail closed Deep Search, image generation, and generic generation bypasses while proving ordinary search, Library, and Graph remain free and functional.
