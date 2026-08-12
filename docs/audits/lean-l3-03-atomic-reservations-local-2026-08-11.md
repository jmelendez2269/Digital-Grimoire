# LEAN-L3-03 atomic reservations local verification

**Date:** August 11, 2026<br>
**Packet:** `LEAN-L3-03`<br>
**Result:** PASS — service-only reserve, commit, release, stale recovery, and real concurrent overspend protection satisfy the local packet contract<br>
**Environment:** local Supabase/PostgreSQL and local Docker concurrency only; no remote database, provider, Stripe, Vercel, or production access

## Scope

The packet adds four service-only database operations:

- `reserve_credits_v1` recovers stale holds, synchronizes the current monthly grant, enforces request/fingerprint/action/quote idempotency, checks available balance, and atomically writes the reservation, cached balance, and reserve ledger event;
- `commit_credit_reservation_v1` settles a pending reservation exactly once at a named durable-result reference and rejects a conflicting replay;
- `release_credit_reservation_v1` restores the exact reserved amount once for a narrow allowlist of provider, timeout, abort, moderation, empty-result, persistence, or recovery reasons;
- `recover_stale_credit_reservations_v1` serializes one account and compensates every expired pending hold with an append-only release event.

All four operations reuse the L2/L3 per-user advisory lock. The reservation function accepts a service-derived action and quote, but no authenticated or anonymous session can execute it. L4 still owns the shared server action-cost catalog and route integration.

## Artifacts

| Artifact | Purpose |
|---|---|
| `supabase/migrations/20260812020000_lean_l3_03_atomic_reservations.sql` | Atomic service-only reserve, commit, release, and recovery functions |
| `app/tests/sql/lean-l3-03-atomic-reservations.sql` | Rollback-only idempotency, settlement, failure, stale, and ledger verification |
| `app/tests/sql/lean-l3-03-concurrency-*.sql` | Exact setup, invariant verification, and cleanup for the multi-session overspend story |
| `app/scripts/run-lean-l3-03-atomic-reservations.ps1` | Guarded dependency runner plus twenty simultaneous PostgreSQL clients |

## Verified boundaries

The combined local story passed **18/18 boundaries**:

1. all four operations are executable only by `service_role`;
2. the first reservation lazily synchronizes the current Reader grant;
3. reserve changes available, reserved, version, reservation, and ledger atomically;
4. exact pending request replay returns the original reservation without another charge;
5. a reused request ID with a different fingerprint/action/quote fails as a conflict;
6. insufficient balance returns safely without creating a request row or negative balance;
7. commit settles once at the durable-result reference;
8. a committed replay with another result reference fails as a conflict;
9. release after commit cannot refund spent credits;
10. persistence failure releases the exact reservation and restores availability;
11. release replay does not refund twice;
12. commit after release cannot spend restored credits;
13. an expired pending reservation is compensated and marked `expired`;
14. stale-recovery replay produces no second compensation;
15. client-invented release reasons are rejected;
16. every reservation has at most one commit-or-release settlement ledger event;
17. cached available/reserved balances and versions equal append-only ledger deltas;
18. twenty simultaneous one-credit requests against Reader 10 produce exactly ten reservations and ten safe insufficiency results.

The concurrency account finished with available `0`, reserved `10`, version `11`, ten pending reservations, ten reserve events, and no negative ledger snapshot. The exact fixture was then deleted and verified at **0 cleanup residue**. The separate lifecycle story ran inside one rollback transaction and also reported **0 fixture residue**.

## Checks

| Check | Result |
|---|---|
| `app/scripts/run-lean-l3-03-atomic-reservations.ps1` | PASS; migration + rerun + 17/17 lifecycle boundaries + 20-session concurrency boundary |
| Lifecycle rollback residue | 0 |
| Concurrency cleanup residue | 0 |
| PowerShell parser for the local runner | PASS |
| Packet-local trailing-whitespace/final-newline check | PASS |
| `npx tsc --noEmit` | PASS |
| Repository-wide ESLint | Current worktree baseline remains non-passing from unrelated legacy/app files; this packet adds only SQL and PowerShell artifacts |

## Integration boundary

No application route calls these functions. No action-cost catalog, provider call, wallet surface, or metering flag was enabled. L3-04 may expose a safe server-owned wallet read path; L4 must map each enabled action to an authoritative quote before calling reserve and must commit only after durable persistence.

## Safety and sequencing

- No production migration, deployment, environment change, provider/Stripe call, customer mutation, real grant, real reservation, metered action, paid sale, commit, push, or PR occurred.
- `LEAN-L2-06` remains blocked and unchanged. All three L3 migrations stay outside its reviewed production canary manifest.
- The dependency runner detects existing L2-05 verified-event fields and does not overwrite an L2-06 projector wrapper.
- The local Supabase stack was left running to avoid disrupting concurrent L2 work.
- L3-04 and L3-05 remain required before the credit core phase closes. L4 and every public metering path remain closed.

## Rollback

Before deployment, rollback is to exclude this migration from the approved manifest. After deployment, leave the inert service-only functions and append-only evidence in place while keeping every caller disabled. Corrections use compensating ledger entries; do not rewrite committed transactions.
