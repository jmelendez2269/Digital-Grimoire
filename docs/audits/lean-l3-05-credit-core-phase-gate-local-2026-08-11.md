# LEAN-L3-05 credit-core phase gate local verification

**Date:** August 11, 2026<br>
**Packet:** `LEAN-L3-05`<br>
**Result:** PASS — authoritative credit formulas, cached and ledger state, adversarial RLS/ACL boundaries, real concurrent overspend protection, exact settlement, and cleanup satisfy the Phase L3 gate<br>
**Environment:** local Supabase/PostgreSQL and local Docker concurrency only; no remote database, provider, Stripe, Vercel, or production access

## Scope

This is a verification-only phase gate. It adds no runtime database function,
migration, application route, UI caller, action quote, or metering flag. The
runner reapplies the reviewed L3-01 through L3-04 chain and tests two independent
stories:

1. a rollback-only three-account matrix covering a committed debit, live hold,
   append-only adjustment, fully released request, and billing-blocked zero
   account; and
2. twenty real simultaneous PostgreSQL sessions competing for a Reader 10
   balance, followed by exact settlement of every successful hold and deletion
   of the exact fixture.

For every fixture account, the gate independently calculates:

`available = active unexpired grant + adjustments - committed debits - active reservations`

It separately proves `reserved = active reservations`, sums the complete ledger
deltas, compares both authorities with the cached account and version, and
rejects expired, detached, unreserved, or already-settled pending rows.

## Artifacts

| Artifact | Purpose |
|---|---|
| `app/tests/sql/lean-l3-05-phase-gate.sql` | Rollback-only authoritative formula, adjustment, settlement, and adversarial RLS/ACL matrix |
| `app/tests/sql/lean-l3-05-concurrency-setup.sql` | Exact local Reader concurrency fixture and current monthly grant |
| `app/tests/sql/lean-l3-05-concurrency-verify.sql` | Overspend, formula, ledger, non-negative, and explained-pending verification |
| `app/tests/sql/lean-l3-05-concurrency-settle.sql` | Exact release-once settlement and zero-pending verification |
| `app/tests/sql/lean-l3-05-concurrency-cleanup.sql` | Exact fixture deletion and residue proof |
| `app/scripts/run-lean-l3-05-phase-gate.ps1` | Guarded local dependency, 20-session, settlement, and cleanup orchestrator |

## Verified boundaries

The combined gate passed **20/20 boundaries**.

The rollback-only invariant and authorization matrix passed **16/16**:

1. RLS is enabled and forced on all five authoritative credit/usage tables;
2. no customer-facing table policy exists;
3. `anon` has no table read or mutation privilege;
4. `authenticated` has no table read or mutation privilege;
5. `service_role` has only the table operations required by the L3 contract;
6. all six L3 lifecycle/wallet functions are service-only;
7. a real authenticated table read is denied;
8. a real authenticated cached-balance write is denied;
9. an authenticated user cannot call the wallet function for another user;
10. an authenticated user cannot invoke reserve directly;
11. the active-grant/adjustment/commit/pending formula is exact for every fixture account;
12. a trusted append-only adjustment is included in that formula;
13. cached balances and versions equal complete ledger deltas and ordering;
14. every live pending reservation has one reserve event, no settlement, an active grant, and a future expiry;
15. all fixture pending reservations settle once and none remains; and
16. no ledger snapshot is negative.

The real concurrency story added four phase-closing boundaries:

17. twenty simultaneous one-credit requests against Reader 10 produce exactly ten reservations and ten safe insufficiency results;
18. the post-race active-grant formula, cache, ledger, and ten pending holds agree with no negative snapshot;
19. all ten winning holds release exactly once, restoring available `10`, reserved `0`, and leaving zero unexplained pending rows; and
20. exact fixture deletion leaves zero residue.

The concurrency account progressed from grant version `1`, to ten reserve events
at version `11`, to ten release events at version `21`. Its final authoritative,
cached, and ledger balances were all available `10` and reserved `0`.

## Checks

| Check | Result |
|---|---|
| `app/scripts/run-lean-l3-05-phase-gate.ps1` | PASS; reviewed chain + 16/16 matrix + 20-session race + settlement |
| Rollback-only fixture residue | 0 |
| Concurrency cleanup residue | 0 |
| PowerShell parser | PASS |
| Packet trailing-whitespace/final-newline checks | PASS |
| `npx.cmd tsc --noEmit` | PASS |
| `npm.cmd run test:membership-wallet` | PASS, 4/4 regression tests |

No production build was required because L3-05 adds only local SQL, PowerShell,
package-script, documentation, and test artifacts; it changes no application or
runtime database code.

## Safety and sequencing

- No production migration, deployment, environment change, Stripe/provider
  call, customer mutation, paid sale, real metered action, commit, push, or PR
  occurred.
- The rollback story left no fixture rows. The concurrency story settled every
  reservation before exact fixture deletion and also left no rows.
- The local Supabase stack was left running.
- Phase L3 is complete locally, but no L3 migration is approved for production
  by this result and the safe wallet route still has no UI caller.
- `LEAN-L4-01` is next. It must introduce the shared adapter, server-owned cost
  catalog, privacy-safe telemetry, abuse controls, and off/shadow/enforce flags
  before any generative route may reserve credits.
- Production billing deployment, Portal/canary proof, and paid activation remain
  independently closed under `LEAN-L5-05`.

## Rollback

There is no L3-05 runtime migration to reverse. Before deployment, exclude all
L3 migrations and callers from any manifest that has not received separate
approval. The local gate fixtures are already rolled back or deleted. Preserve
append-only production credit evidence if the L3 chain is later deployed; never
repair a discrepancy by rewriting ledger history.
