# LEAN-L3-01 credit core schema local verification

**Date:** August 11, 2026<br>
**Packet:** `LEAN-L3-01`<br>
**Result:** PASS — the local additive schema and rollback-only boundary story satisfy the packet contract<br>
**Environment:** local Supabase/PostgreSQL only; no remote database, Stripe, Vercel, or production access

## Scope

The packet adds the lean monthly credit foundation without granting credits or enabling a metered action:

- `credit_accounts` caches non-negative available and reserved balances with a monotonic version;
- `credit_grants` records one active Reader or verified-subscription monthly allowance with a globally unique source key, normalized-input fingerprint, validity window, and explicit expiry state;
- `credit_reservations` binds one user-scoped request ID and fingerprint to one server-derived action, quote, and grant;
- `credit_transactions` is an insert-only service ledger with constrained event shapes, unique event keys, ordered account versions, and one reserve/settlement event per reservation;
- `ai_usage_events` records privacy-safe provider attempt, units, latency, outcome, versioned cost, and fallback telemetry without prompt, response, email, or arbitrary customer metadata.

The migration creates no account rows, grants, reservations, transactions, or usage events. It does not add credit packs, purchases, rollover, debt, multi-grant allocation, or customer write policies.

## Artifacts

| Artifact | Purpose |
|---|---|
| `supabase/migrations/20260812000000_lean_l3_01_credit_core_schema.sql` | Additive five-table credit and usage schema, constraints, indexes, forced RLS, and exact service privileges |
| `app/tests/sql/lean-l3-01-credit-core-schema.sql` | Local-only rollback story for schema, authorization, idempotency, accounting, cross-user, privacy, and deferred-scope boundaries |
| `app/scripts/run-lean-l3-01-credit-core.ps1` | Guarded local runner that applies L2-02, applies and reruns the L3-01 migration, executes the rollback story, and requires zero residue |

## Verified boundaries

The local PostgreSQL story passed **18/18 boundaries**:

1. all five intended tables exist;
2. RLS is enabled and forced on every table;
3. `anon` and `authenticated` have no direct read or write authority;
4. `service_role` has only the operations required by each table;
5. the transaction ledger is service insert-only and other packet tables are not service-deletable;
6. monthly grant source keys are globally unique;
7. reservation request IDs are unique per user;
8. an account cannot retain two active monthly grants;
9. grant expiry must follow its validity start;
10. cached balances and snapshots cannot be negative;
11. a reservation cannot bind another user's grant;
12. transaction references and available/reserved deltas must match the event type;
13. ledger event keys are unique;
14. account versions are unique and ordered per account;
15. one reservation cannot record both commit and release settlements;
16. cached available/reserved balances equal the append-only ledger deltas in the exercised story;
17. usage attempts are unique, non-negative, and contain the required safe cost/outcome evidence;
18. pack, purchase, rollover, debt, allocation, prompt, response, and arbitrary metadata machinery is absent.

The migration also completed an immediate idempotency rerun. The test transaction rolled back and reported **0 fixture residue** across Auth, accounts, grants, reservations, transactions, and usage events.

## Checks

| Check | Result |
|---|---|
| `app/scripts/run-lean-l3-01-credit-core.ps1` | PASS; migration + rerun + 18/18 rollback boundaries; 0 residue |
| PowerShell parser for the local runner | PASS |
| Packet-local trailing-whitespace/final-newline check | PASS |
| `npx tsc --noEmit` | PASS |
| Repository-wide `npm run lint` | Existing baseline does not pass: 601 errors and 1,697 warnings across unrelated legacy/app files; the new SQL and PowerShell artifacts are not ESLint inputs |

## Safety and sequencing

- No production migration, deployment, environment change, Stripe call, customer/account mutation, paid sale, credit grant, metered action, commit, push, or PR occurred.
- `LEAN-L2-06` remains blocked and unchanged. This L3 migration is not part of the reviewed L2 production canary manifest and must not be included in an L2-only deployment.
- The local Supabase stack was already running and was left running to avoid disrupting concurrent L2 work.
- `LEAN-L3-02` owns monthly grant issuance and expiry behavior. `LEAN-L3-03` owns atomic reserve/commit/release functions and stale recovery. This packet supplies their constrained storage contract only.

## Rollback

The forward migration is inert until later service-only functions create credit state. Before deployment, rollback is to exclude this L3 migration from the approved manifest. After deployment, leave the empty additive tables and forced-RLS boundaries in place; disabling later grant/metering flags is safer than dropping accounting structures.
