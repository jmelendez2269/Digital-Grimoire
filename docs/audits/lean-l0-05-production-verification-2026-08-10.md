# LEAN-L0-05 production containment verification

**Evidence date:** August 10, 2026 (America/New_York)  
**Packet:** `LEAN-L0-05`  
**Result:** Complete  
**Verified points:** 3

## Approved boundary

Jen explicitly approved the exact 20-file production package and safe shutdown
checks documented in the [L0-05 runbook](lean-l0-05-production-runbook-2026-08-10.md).
The approval did not include a database change, Stripe change, production
environment change, staging activation, course work, or commercial-action
enablement. None of those excluded actions occurred.

## Application deployment

| Item | Evidence |
|---|---|
| Git commit | `11ef501` (`Contain stale checkout and provider routes`) |
| Files | Exactly 20 reviewed containment files |
| Git target | Production `main` |
| Vercel deployment | `dpl_Gd4NfN31M8MeapCQFQmYgnibRXr8` |
| Vercel status | `Ready` |
| Production aliases | `prismarium.xyz`, `www.prismarium.xyz` |
| Remote build | Commit `11ef501`; TypeScript and 136/136 pages passed |

The clean candidate also passed 8/8 commercial-containment tests, 3/3 L0-03
server-authority regression tests, global TypeScript, diff checks, and a
136/136-page production-style build before the push. The local build used only
fake localhost/build placeholders.

## Production configuration proof

Vercel production environment names were listed without reading values. Neither
`PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS` nor
`PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS` exists in production. The deployed
policy therefore evaluates every contained action as disabled and cannot match
a Checkout Price. No environment variable was added, changed, or removed.

## Core application smoke checks

| Request | Result |
|---|---:|
| `GET https://prismarium.xyz/` | 200 |
| `GET https://www.prismarium.xyz/` | 200 |
| `GET /explore` | 200 |
| `GET /api/library/catalog` | 200 |

Vercel inspection confirmed both public domains resolve to the Ready L0-05
deployment.

## L0-03 regression check

The privacy-safe production catalog summary was rerun after L0-05:

| Check | Result |
|---|---:|
| Unsafe API role/table mutation pairs | 0 |
| Customer-callable protected functions | 0 |
| Shared tables with RLS | 7 |
| Shared read policies | 7 |
| Shared read grants | 14 |
| Service-callable protected functions | 7 |
| Fixed function search paths | 7 |
| Required trusted table authority | `true` |

L0-05 therefore did not weaken the production database repair.

## Kill-switch rehearsal

Sixteen harmless, logged-out POST requests covered Checkout, subscription sync,
Working generation, Seven Lenses query/expansion, Deep Search, GPT/Claude/Gemini
proxies, Tarot/cover images, chapter names, metadata, document/media processing,
and AI sacred-text import. All 16 returned 401 at production middleware before
the route handler. The explicit non-AI sacred-text request also reached the same
existing login boundary and returned 401.

This outer authorization result is safe but cannot directly exercise the inner
503 response. No saved logged-in browser session existed. A production test
user was not created, credentials were not requested, and authentication was
not bypassed because the retired L0-02 production-fixture boundary remains in
force.

The inner default-closed switch is accepted from the combined evidence:

1. Vercel proves commit `11ef501` is the deployed source;
2. production proves both enabling variable names are absent;
3. the exact 20 committed files match the locally reviewed candidate;
4. eight runtime/source-order tests prove absent configuration returns the
   opaque non-cacheable 503 before request parsing, authentication, Stripe,
   provider, storage, or database work; and
5. the logged-out production matrix proves an even earlier authorization wall
   blocks strangers across every route.

This limitation is explicit: an authenticated production request did not
observe the inner 503. Later packets may verify authenticated reopening only
after they have an approved test identity, billing/metering authority, and an
exact action token.

## Error scan and rollback

The new deployment window contained zero error-level log entries and zero HTTP
500 log entries. No rollback was needed. The previous known deployment remains
identifiable by application commit `179f270`, but restoring it would reopen the
old unmetered paths and must not be done casually. The L0-03 database repair is
independent and remains live regardless of an application rollback.

## Point result

All risk-proportionate L0-05 evidence is complete without secrets, customer
payloads, PII, production fixtures, provider spend, Stripe activity, or database
mutation. The packet moves to `done`, earns 3 points, completes Phase L0 at
14/14 points, and raises total launch progress from 11/114 (9.6%) to
**14/114 (12.3%)**.
