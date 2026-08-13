# LEAN-L3-02 monthly grants local verification

**Date:** August 11, 2026<br>
**Packet:** `LEAN-L3-02`<br>
**Result:** PASS — service-only Reader and verified paid-period grant synchronization satisfies the local packet contract<br>
**Environment:** local Supabase/PostgreSQL only; no remote database, Stripe, Vercel, or production access

## Scope

The packet adds one service-only synchronization function. It accepts only a user ID and an explicit decision timestamp, then derives the plan, allowance, source, period, and expiry from locked server-owned state:

- absent or valid Reader billing state receives 10 credits once per UTC calendar month;
- verified active/trialing Student, Scholar, and Adept periods receive exactly 30, 100, and 300 credits;
- paid eligibility requires a known offer/cohort, monthly interval, exact Stripe identities, a current period, no hold, and L2-05 verified-event evidence;
- activation expires only the remaining Reader balance and then grants the full paid allowance;
- `cancel_at_period_end` preserves the current paid source through period end;
- renewal expires the prior remainder and grants the next period once, without rollover;
- terminal paid state returns to Reader only at the verified period end and only if that UTC-month Reader source was never issued;
- an older delayed billing projection cannot replace a newer active paid grant;
- ambiguous, held, unverified, future, or otherwise ineligible billing state returns a blocked result without a grant.

The function shares the L2 projector/reconciler's per-user advisory lock. It does not accept a browser-selected plan, amount, source key, event key, or expiry.

## Artifacts

| Artifact | Purpose |
|---|---|
| `supabase/migrations/20260812010000_lean_l3_02_monthly_grants.sql` | Service-only, projection-backed monthly grant synchronizer |
| `app/tests/sql/lean-l3-02-monthly-grants.sql` | Rollback-only Reader/paid lifecycle, replay, transition, and accounting verification |
| `app/scripts/run-lean-l3-02-monthly-grants.ps1` | Guarded local runner with dependency-aware L2-05 handling and migration rerun proof |

## Verified boundaries

The local PostgreSQL story passed **18/18 boundaries**:

1. only `service_role` can execute the synchronizer;
2. Reader receives exactly 10 credits for an August UTC source;
3. replay returns the existing Reader grant without another ledger event;
4. paid activation replaces a partially consumed Reader balance with the full Student 30;
5. the exact four-credit Reader remainder is expired, not carried into paid state;
6. `cancel_at_period_end` preserves the existing paid period grant;
7. renewal issues the next paid source once;
8. renewal leaves 30 available rather than rolling the prior 30 into 60;
9. an older delayed period cannot replace a newer active paid grant;
10. terminal state before the period end is blocked;
11. terminal state at the period end expires paid state and grants Reader;
12. a Reader source already used before same-month activation is not issued again at terminal return;
13. the first access in the next UTC month receives the new Reader 10;
14. a verified Scholar period receives exactly 100;
15. a verified Adept period receives exactly 300;
16. held and event-unverified paid projections receive no grant;
17. cached account balances and versions agree with append-only ledger deltas for every fixture;
18. source-key and replay behavior leaves one active grant and one source per eligible period.

The migration completed an immediate idempotency rerun. The verification transaction rolled back and reported **0 fixture residue** across Auth, membership, account, grant, and transaction tables.

## Checks

| Check | Result |
|---|---|
| `app/scripts/run-lean-l3-02-monthly-grants.ps1` | PASS; migration + rerun + 18/18 lifecycle boundaries; 0 residue |
| PowerShell parser for the local runner | PASS |
| Packet-local trailing-whitespace/final-newline check | PASS |
| `npx tsc --noEmit` | PASS |
| Repository-wide ESLint | Current worktree baseline remains non-passing from unrelated legacy/app files; this packet adds only SQL and PowerShell artifacts |

## Integration boundary

This packet supplies the authoritative synchronization primitive but enables no caller. L3-04 wallet reads and later metering paths must invoke it before trusting a balance. Until those gated callers exist, applying the migration creates no account or grant and changes no customer behavior.

## Safety and sequencing

- No production migration, deployment, environment change, Stripe call, customer/account mutation, real grant, metered action, paid sale, commit, push, or PR occurred.
- `LEAN-L2-06` remains blocked and unchanged. This migration is not part of the reviewed L2 production canary manifest.
- The runner checks whether the L2-05 verified-event fields already exist before applying that dependency, so it does not overwrite an existing L2-06 projector wrapper.
- The local Supabase stack was left running to avoid disrupting concurrent L2 work.
- L3-03 still owns atomic reserve, commit, release, and stale-reservation recovery. No metering route may spend these balances before that packet and the L3 phase gate pass.

## Rollback

Before deployment, rollback is to exclude this migration from the approved manifest. After deployment, revoke or omit every caller; the function itself creates no state until explicitly invoked by `service_role`. Preserve existing grant and transaction evidence rather than dropping or rewriting it.
