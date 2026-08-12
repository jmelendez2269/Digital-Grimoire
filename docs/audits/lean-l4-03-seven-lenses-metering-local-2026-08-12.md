# LEAN-L4-03 Seven Lenses metering — local evidence

**Date:** August 12, 2026
**Scope:** Local implementation and controlled provider fixtures only
**Result:** `LEAN-L4-03` acceptance boundary satisfied locally

## Acceptance result

Seven Lenses short and medium responses now resolve to the server-owned `seven_lenses.standard` quote at two credits; long resolves to `seven_lenses.long` at three. The browser submits only the question, exact seven lens weights, the response-length choice, and a UUID request ID. It never supplies a price, balance, plan, provider budget, or metering mode.

The response lifecycle is now:

1. create the addressable convergence-response UUID before provider work;
2. authenticate and require verified email;
3. resolve entitlement and the fixed server quote;
4. enter L4 controls and, in enforce mode, reserve the exact L3 credits;
5. retrieve context and run provider calls under a 90-second deadline and request abort signal;
6. insert the complete user-owned `convergence_responses` row through the service client;
7. commit/release and settle privacy-safe usage through the shared adapter;
8. only then emit synthesis and the durable `/api/parallax/history/<id>` reference to the SSE client.

Before step 8, the stream contains status only. A provider success that cannot be persisted is not customer-visible success and releases the hold. A completed UUID retry reopens the exact owned row with zero additional provider, persistence, or credit work. If the connection disappears without a definitive SSE outcome, the client retains the UUID so retry can recover the same lifecycle instead of inventing a new charge.

## Provider and telemetry boundary

- Lens-summary and synthesis attempts aggregate input/output units and bounded request identifiers into one L4 usage event.
- OpenRouter-reported completion cost is summed when every attempt supplies it. OpenRouter documents that current completion responses include detailed usage and billed `cost`; missing or mixed-provider cost deliberately falls back to the action's conservative fixed quote rather than recording an optimistic zero.
- Failed multi-call attempts record at least the conservative fixed quote because later provider work may fail before returning its own usage.
- The active route no longer calls the legacy query-bearing `logParallaxQueryUsage` path. Operational metering stores the input fingerprint and aggregate provider facts, not the question, synthesis, sources, or lens weights.
- The obsolete route-local `parallax/streaming.ts` implementation was removed. The separate history POST remains a non-generative saved-content endpoint and is no longer called after metered synthesis.

Provider reference: [OpenRouter usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting).

## Controlled verification

`npm run test:membership-metering` passed **22/22**:

- exact short/medium → standard and long → long action mapping;
- exact two- and three-credit server reservations;
- provider ID before generation, durable persistence before one commit, and addressable result URL;
- aggregate provider-reported cost plus conservative missing-cost fallback;
- exact completed replay without provider/retrieval/persistence/charge;
- provider, timeout, abort, empty-result, and persistence failure release exactly once;
- real pre-aborted request signal and an actually expiring deadline both release once;
- no question or synthesis in metering/store inputs;
- client UUID, cost copy, preserved question, no second Parallax history POST, and no client-owned cost field.

Regression checks passed:

- **48/48** membership catalog, entitlement, wallet, billing, webhook, Checkout, and server-authority tests;
- **9/9** commercial containment tests;
- focused ESLint with zero warnings or errors;
- global `tsc --noEmit`;
- Next.js 16 production build, **139/139** pages.

The React quality pass additionally verified typed SSE parsing, request cancellation on unmount, resilient local-history parsing, explicit button types/pressed state, visible errors, and 44px minimum cost-choice/submit controls.

## Browser boundary

The built app was started on isolated `127.0.0.1:3101` and checked at **375×812**. `/seven-lenses` loaded and correctly redirected the unauthenticated session to the sign-in surface; the page was nonblank and had no Next.js error overlay. The authenticated tool UI was not exercised because this checkout's `.env.local` points at the remote Supabase project and no approved test credential was available. No remote user was created or changed. The visible 2/3-credit and input-preservation contract is covered by the focused source test, lint, TypeScript, and production render build; `LEAN-L4-06` still owns the real authenticated browser/API/database/provider story for every enabled action.

## Rollback and unchanged gates

Rollback is immediate and data-preserving: leave either `seven_lenses_generation` commercially disabled or the L4 action modes `off` (both are the default), or use the global/per-action kill switches. Existing saved responses remain readable at zero credits.

No real provider call, customer credit, Stripe action, remote migration, deployment, environment change, production mutation, paid sale, course release, commit, push, or PR occurred. The unrelated course-parser and local Supabase configuration changes were preserved.

## Next packet

`LEAN-L4-04` may now integrate one-lens expansion at one server-owned credit. It must use a distinct request identity from the parent synthesis, replay exactly, and prove that expansion cannot double-charge the parent response.
