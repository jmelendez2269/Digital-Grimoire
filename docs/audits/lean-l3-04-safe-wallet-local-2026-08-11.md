# LEAN-L3-04 safe wallet local verification

**Date:** August 11, 2026<br>
**Packet:** `LEAN-L3-04`<br>
**Result:** PASS — the authenticated server path returns one strict customer-safe wallet while authoritative tables and lifecycle operations remain service-only<br>
**Environment:** local application tests and local Supabase/PostgreSQL only; no remote database, Stripe, provider, Vercel, or production access

## Scope

The packet adds a narrow `GET /api/membership/wallet` path. The route derives
its only identity from `auth.getUser()` and passes that ID to a server-only
loader. The loader calls `get_credit_wallet_v1` with a fixed twenty-item
history limit, validates every field at runtime, and reconstructs an allowlisted
response instead of forwarding arbitrary database JSON.

The service-only database projection serializes per account, recovers expired
pending holds, synchronizes the current monthly grant, verifies the cached
balance and pending total against the latest append-only ledger state, and then
returns:

- available, reserved, and total credits;
- the current plan allowance, validity window, and reset/expiry time;
- pending action code, credit amount, creation time, and expiry time; and
- up to twenty normalized recent wallet events with safe balance snapshots.

It omits user, grant, reservation, request, result, event, source, fingerprint,
reason, Stripe, provider, prompt, response, email, and arbitrary metadata
identifiers.

## Artifacts

| Artifact | Purpose |
|---|---|
| `supabase/migrations/20260812030000_lean_l3_04_safe_wallet.sql` | Service-only lifecycle-aware wallet projection |
| `app/src/lib/membership/membership-wallet.server.ts` | Strict runtime parser and service RPC adapter |
| `app/src/app/api/membership/wallet/route.ts` | Authenticated, no-store, current-user-only GET route |
| `app/tests/membership-wallet.test.ts` | Application scoping, field stripping, malformed-projection, and source-boundary tests |
| `app/tests/sql/lean-l3-04-safe-wallet.sql` | Rollback-only authorization, privacy, history, lifecycle, and mismatch story |
| `app/scripts/run-lean-l3-04-safe-wallet.ps1` | Guarded local dependency, migration-rerun, and SQL verification runner |

## Verified boundaries

The local database story passed **17/17 boundaries**:

1. the wallet function is executable only by `service_role`;
2. authenticated sessions cannot execute the function directly;
3. authenticated sessions cannot read authoritative credit tables;
4. authenticated sessions cannot update authoritative credit tables;
5. the first service request deterministically creates the current Reader grant;
6. available, reserved, and total balances are exact;
7. the Reader reset and expiry are the next UTC month boundary;
8. the root and nested response objects contain only explicit allowlisted keys;
9. internal IDs, hashes, source keys, reason codes, Stripe fields, and fixture identity are absent;
10. ambiguous billing state returns an unavailable zero wallet without a grant;
11. a live reservation appears with only safe pending fields;
12. ledger events are normalized into customer-facing history kinds and safe snapshots;
13. history is bounded by the server-owned limit;
14. release restores availability and appears as a credit return;
15. reading after reservation expiry recovers the stale hold and returns the corrected wallet;
16. invalid history limits fail closed; and
17. a cached-account/ledger disagreement fails closed instead of returning a false balance.

The fixture story ran inside one transaction, rolled back, and reported **0
cleanup residue**. Applying the migration a second time also passed.

## Application checks

| Check | Result |
|---|---|
| `npm.cmd run test:membership-wallet` | PASS, 4/4 tests |
| `npx.cmd tsc --noEmit` | PASS |
| Targeted ESLint for the new server module, route, and test | PASS |
| `npm.cmd run build` | PASS; 139/139 static pages and `/api/membership/wallet` compiled |
| PowerShell parser for the local runner | PASS |
| Packet trailing-whitespace and final-newline checks | PASS |
| Local SQL runner | PASS, migration + rerun + 17/17 boundaries + zero residue |

The application tests also prove that the route accepts no query/body user ID,
passes only `user.id`, strips unexpected database fields, rejects inconsistent
or overlong projections, and stops before privileged loading for invalid
identity or time.

## Safety and integration boundary

- No production migration, deployment, environment change, Stripe/provider
  call, customer mutation, paid sale, real metered action, commit, push, or PR
  occurred.
- The local fixture grants and reservations were rolled back. The local
  Supabase stack was left running.
- The safe GET route has no UI caller, and no action-cost catalog, generative
  route, or reserve/commit/release adapter is enabled.
- `LEAN-L2-06` remains complete under its accepted evidence; its independently
  closed production deployment, Portal/canary, and activation work remains in
  `LEAN-L5-05`.
- `LEAN-L3-05` remains the phase-closing invariant, concurrency, and adversarial
  RLS gate.

## Rollback

Before deployment, rollback is to exclude the L3-04 migration and application
files from an approved manifest. After deployment, the route can be disabled or
removed while leaving the service-only function inert. Do not weaken table RLS
or expose the function to `anon` or `authenticated`; lifecycle corrections must
continue through append-only compensating events.
