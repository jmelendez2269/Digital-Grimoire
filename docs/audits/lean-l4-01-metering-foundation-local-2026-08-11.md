# LEAN-L4-01 shared metering foundation — local verification

**Date:** August 11, 2026
**Target:** Local application and isolated local Supabase/PostgreSQL only
**Result:** PASS
**External state:** No deployment, remote migration, environment change, provider call, Stripe call, customer mutation, paid sale, course release, or route activation

## Outcome

`LEAN-L4-01` now provides one server-only execution path for authenticated,
verified-email generation:

`auth → entitlement → fixed quote → atomic controls → credit reserve (enforce only) → provider → durable persistence → credit commit/release → metering/usage settlement`

All action modes default to `off`. `shadow` runs controls, provider work,
durable persistence, and privacy-safe cost telemetry without reserving or
charging credits. `enforce` additionally links the exact L3 reservation and
will not complete until that reservation is committed on success or released
on failure. No existing route imports the adapter in this packet.

## Fixed launch catalog and controls

The server catalog is versioned `lean-launch-v1`. Its initial in-flight
provider estimates use the launch plan's conservative Reader ceiling of $0.05
per credit and are versioned `lean-reader-guardrail-v1`; they are protective
estimates, not claims about current provider prices.

| Action | Credits | In-flight estimate | Launch behavior after L4-01 |
|---|---:|---:|---|
| `working.generate` | 1 | $0.05 | Default `off`; L4-02 integration next |
| `seven_lenses.expand` | 1 | $0.05 | Default `off`; L4-04 owns integration |
| `seven_lenses.standard` | 2 | $0.10 | Default `off`; L4-03 owns integration |
| `seven_lenses.long` | 3 | $0.15 | Default `off`; L4-03 owns integration |
| `deep_search.fresh` | 3 | $0.15 | Default `off`; remains beta-disabled |
| `image.generate` | Not offered | — | Hard unavailable even if misconfigured |

Each quote also fixes request bytes, per-action concurrency, velocity window,
and hold duration. Configuration is exact and fail-closed:

- `PRISMARIUM_METERING_MODE`: global `off`, `shadow`, or `enforce`; absent is `off`.
- `PRISMARIUM_METERING_ACTION_MODES`: exact `action=mode` overrides.
- `PRISMARIUM_METERING_GLOBAL_KILL_SWITCH`: exact global kill switch.
- `PRISMARIUM_METERING_ACTION_KILL_SWITCHES`: exact action-code kill list.
- `PRISMARIUM_READER_MONTHLY_PROVIDER_BUDGET_USD`: exact decimal budget; absent defaults to `$50`.

Malformed values close every action rather than selecting a permissive
fallback. The adapter derives the request fingerprint and byte count from
canonical server input; callers cannot submit a price, mode, plan, limit,
fingerprint, or cost-breaker decision.

## Reader cost breaker and privacy model

The forward migration adds a forced-RLS `ai_metering_requests` lifecycle and an
append-only `reader_cost_breaker_overrides` audit. Service-only functions share
a global advisory lock while evaluating the Reader budget. For the current UTC
month, the breaker sums:

- the fixed estimate for each live in-flight Reader request; plus
- the completed estimated provider cost for every attempted Reader generation.

Paid plans do not enter this calculation. The key is an exact UTC month, so the
counter resets at the next month boundary. A temporary additive override is
accepted only through a service function and records actor, reason, amount,
effective range, expiry, and creation time. Customer roles have no table or
function authority.

`ai_usage_events` now supports shadow attempts through a privacy-safe metering
request link while retaining the L3 reservation link for enforce mode. The
new lifecycle and usage rows contain only user/request references, hashes,
action/plan/mode, fixed quote versions, provider/model/request ID, units,
latency, outcome, error class, estimated cost, timestamps, and a bounded
durable result reference. They contain no prompt, response, email, Stripe ID,
or arbitrary metadata column.

## Existing route inventory and later integration boundary

| Route class | Current provider/result boundary | Required later packet behavior |
|---|---|---|
| The Working: `POST /api/working/generate` | Anthropic semantic fallback plus Haiku synthesis; generation response is separate from `POST /api/working/save` | L4-02 must fold the user-owned `workings` insert into the adapter persistence callback before commit |
| Seven Lenses: `POST /api/parallax/query` | OpenRouter-backed SSE; `convergence_responses` insert occurs near stream completion but currently suppresses persistence failure | L4-03 must make that insert a real durable boundary, replace query-bearing legacy usage logs, and settle abort/error paths |
| Lens expansion: `POST /api/parallax/lens/[lensId]` | OpenRouter response returned directly; no durable result row; legacy usage metadata includes a query excerpt | L4-04 must persist or define a durable parent-linked result before commit and remove private query telemetry |
| Deep Search: `POST /api/parallax/ai-search` | Retrieval plus OpenRouter synthesis with a mutable `search_cache` | L4-05 keeps fresh generation closed until cache identity/accounting and failure behavior are trustworthy |
| Image generation | Replicate/Google covers update `texts`; DALL-E tarot uploads then inserts a card, with non-durable fallbacks | L4-05 keeps all customer image generation closed; `image.generate` has no launch quote |
| Generic AI proxies | `/api/ai/gpt`, `/api/ai/claude`, and `/api/ai/gemini` return OpenRouter output without durable user-owned persistence | L4-05 keeps these generic bypasses closed |
| Content/admin generation | Chapter naming, metadata, imports, and document/media processing use separate default-closed guards or explicit admin checks | They are not customer metered actions and must not become a generic customer bypass |

This inventory is why L4-01 does not edit a route: The Working has the clearest
single-record persistence target and is selected for L4-02; the streaming,
cache, image, and generic paths need their own packet-specific boundaries.

## Verification

- Forward migration applied and reran idempotently on the isolated local stack.
- Rollback-only PostgreSQL story: **21/21** authorization, lifecycle, replay,
  plan, concurrency, velocity, Reader-cost, override, shadow/enforce,
  settlement, UTC reset, and privacy boundaries passed with zero residue.
- Real two-session Reader race at `$49.94 / $50.00`: exactly one `$0.05`
  request started and one returned `reader_budget_exceeded`; computed cost was
  `$49.99`, shadow credits remained `10 available / 0 reserved`, and cleanup
  returned zero residue. Combined local database gate: **22/22**.
- Metering application tests: **8/8** passed, including exact operation order,
  off/shadow/enforce, verified email, size/kill/control denials, success commit,
  provider/persistence release, privacy, and inert route wiring.
- Focused membership regression suite: **27/27** passed across catalog,
  entitlement, wallet, and metering.
- Targeted ESLint passed for all new TypeScript and its test.
- Global TypeScript passed with `npx tsc --noEmit`.
- `next build --webpack` compiled, typechecked, and generated **139/139** pages.
- `git diff --check` reported no whitespace errors.

The build retained pre-existing warnings about the middleware naming
deprecation, Sentry client configuration, baseline-browser mapping data, and
expected dynamic Supabase cookie access during static probing. None originated
in this packet.

## Files

- `app/src/lib/membership/metering-catalog.server.ts`
- `app/src/lib/membership/metering-store.server.ts`
- `app/src/lib/membership/metering-adapter.server.ts`
- `supabase/migrations/20260812040000_lean_l4_01_metering_foundation.sql`
- `app/tests/membership-metering.test.ts`
- `app/tests/sql/lean-l4-01-metering-foundation.sql`
- `app/tests/sql/lean-l4-01-concurrency-*.sql`
- `app/scripts/run-lean-l4-01-metering-foundation.ps1`

## Next gate

`LEAN-L4-02` may integrate only The Working at one credit through this adapter.
It must preserve the user's input on all failures, treat the `workings` row as
the durable success boundary, commit exactly once afterward, and release on
provider, moderation, timeout, empty-result, or persistence failure. Every
other route and all production/paid activation gates remain closed.
