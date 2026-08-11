# Handoff: Lean membership L1-02 complete; L1-03 ready locally

## Session Metadata
- Created: 2026-08-10 21:49:41 America/New_York
- Project: C:\Projects\Digital-Grimoire
- Working branch: `develop` (dirty with unrelated course work that must be preserved)
- Production main: `11ef501` (unchanged during L1 work)
- Milestone interval: approximately 32 minutes

## Handoff Chain

- **Continues from**: [2026-08-10-211758-lean-membership-l0-complete-l1-01-ready.md](./2026-08-10-211758-lean-membership-l0-complete-l1-01-ready.md)
- **Supersedes**: that handoff's L1-01-ready state; keep it for L0 production detail

## Current State Summary

L1-01 and L1-02 are complete locally. One server-only typed contract now controls PRE learner progress and week-save semantics, and a new authenticated PRE progress GET/PUT route plus forward-only service RPC/RLS migration passed static, build, and real local PostgreSQL tests. The tracker is at **20/114 points (17.5%)**; Phase L1 is **6/15 (40%)**. Production was not connected or changed, and no production authorization is active. L1-03 is next and is worth 3 points; completing it would bring the launch to 23/114 (20.2%).

## Codebase Understanding

## Architecture Overview

- The normative L1 contract is `app/src/lib/courses/learner-save-contract.server.ts`; later routes must import it rather than create another free-course list.
- Free learner persistence authority contains exactly PRE: `pre-how-to-hold-two-things-at-once`. Database `is_published`, title/tag guesses, and presentation release state never grant save access.
- `GET/PUT /api/courses/[id]/progress` authenticates and requires confirmed email, then resolves the exact PRE definition, cross-checks the database course tag, and requires the authenticated user's enrollment.
- Progress writes use a service-only atomic PostgreSQL function after route authorization. Direct customer mutation of `course_enrollments` remains revoked, owner-only reads remain under RLS, and the replay ledger is service-only with RLS and no customer policy.
- Versioned progress is resumable navigation state: current week/stage, never-shrinking visited weeks, revision, and server timestamp. It is not course completion.

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `app/src/lib/courses/learner-save-contract.server.ts` | L1 contract and PRE-only authority | Single normative contract for L1-02 through L1-05 |
| `docs/planning/lean-l1-01-v2-learner-progress-save-contract.md` | Plain-language contract guide | Defines identifiers, auth, errors, reload, and exclusions |
| `app/src/app/api/courses/[id]/progress/route.ts` | PRE progress GET/PUT | New server endpoint built by L1-02 |
| `app/src/lib/courses/learner-progress.server.ts` | Strict parsing and error mapping | Rejects forged/malformed commands and unsafe stored state |
| `supabase/migrations/20260810220000_lean_l1_02_learner_progress.sql` | Forward RLS/RPC/ledger migration | Local-only so far; never broad-push without review |
| `app/tests/sql/lean-l1-02-learner-progress.sql` | Transactional local DB story | Proves ownership, replay, revision, allowlist, and zero residue |
| `docs/audits/lean-l1-02-server-progress-local-2026-08-10.md` | L1-02 evidence | Exact results and limitations |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Score/status source of truth | 20/114; L1-03 next |

## Key Patterns Discovered

- Authenticate before allowlist lookup, service-client creation, and mutation work.
- The browser supplies a stable request UUID and expected revision, but the server supplies user ID, course UUID, revision, and timestamps.
- Identical request replay returns the original result; a reused ID with changed content fails. A stale revision also fails so one tab cannot silently erase another tab's save.
- Database checks repeat the exact PRE slug/tag/week boundary even though the route checks it first.
- Transactional SQL fixtures roll back and must prove zero residue.
- Explain terms at a middle/high-school level and make production approval a simple exact yes/no request.

## Work Completed

## Tasks Finished

- [x] Wrote and verified the L1-01 typed learner save/progress contract.
- [x] Established the exact PRE-only server free-course authority.
- [x] Added stable identifier validators, errors, replay/revision rules, reload behavior, and explicit scope exclusions.
- [x] Added the authenticated, confirmed-email, owned-enrollment PRE progress GET/PUT endpoint.
- [x] Added the forward service-only idempotency ledger/RLS/atomic progress migration.
- [x] Proved owner success, identical replay, changed replay denial, stale revision denial, non-PRE denial, unknown-week denial, cross-user hiding, direct customer-mutation denial, and zero fixture residue in local PostgreSQL.
- [x] Passed 14/14 focused tests, focused lint, global TypeScript, diff checks, and a 136/136-page production-style build.
- [x] Restored `supabase/config.toml` exactly and stopped/backed up the local Supabase stack.
- [x] Updated L1 evidence, tracker, score, and milestone memory.

## Files Modified

| File/group | Changes | Rationale |
|------------|---------|-----------|
| L1 contract source/test/guide/evidence | Added typed contract, PRE authority, eight tests, prose guide, and audit | Completes L1-01 |
| Progress route/helper/test | Added authenticated GET/PUT, strict parsing, safe errors, and six endpoint/migration tests | Implements L1-02 application boundary |
| L1-02 migration/SQL test/PowerShell runner | Added service-only atomic save, replay ledger, RLS/grants, eight-case local story | Implements and verifies database boundary |
| Membership tracker | Marked L1-01 and L1-02 done; advanced to 20/114 | Makes L1-03 next |

All L1 files are currently untracked in the dirty `develop` worktree. Do not stage unrelated course work. No L1 commit, push, PR, deployment, or production migration was performed.

## Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Exact PRE slug is the only free save authority | Reuse broad title/tag guesses vs one server list | Fails closed and matches launch scope |
| Use atomic service-only RPC plus request ledger | Direct browser upsert vs server transaction | Preserves L0-03 authority and prevents races/replay duplication |
| Auth before course lookup | Validate course/body first vs identify user first | Keeps anonymous requests behind one consistent login wall |
| Keep completion/billing out of progress | Reuse old completed fields vs navigation-only state | Matches the explicit L1-01 exclusions |
| Use local integration SQL and defer real-browser auth flow | Create a broad browser fixture now vs keep L1 packet boundaries | L1-05 owns the final real-browser/new-session proof |

## Pending Work

## Immediate Next Steps

1. Begin L1-03 locally by reconciling the canonical `journal_pages` schema for course/week/source, revision, and replay metadata without trusting the secondary migration trees.
2. Implement authorized create/update/reload through the Journal API using the same PRE contract, auth ordering, owned enrollment, exact week check, and service-owned atomic behavior.
3. Prove the Reader 50-active-page rule, paid unlimited behavior, and paid/legacy-to-Reader over-limit rule: retain read/edit access, lose no work, block only create/restore until archived below 50.

## Blockers/Open Questions

- [ ] No blocker for local L1-03 discovery and implementation.
- [ ] Any production deployment or database migration requires a fresh exact approval; none is active.

## Deferred Items

- V2 browser saving/saved/error/retry UI remains L1-04.
- Authenticated real-browser PRE enrollment/save/new-session reload remains L1-05.
- Billing effects, retained completed-course access, membership slot release, certificates, and generalized completion remain explicitly outside this L1 contract.

## Context for Resuming Agent

## Important Context

- Speak simply, like a thoughtful middle/high-school teacher. Define technical words and explain risk in short sentences.
- **No production authorization is active.** L0-03 and L0-05 approvals were exact and exhausted; L1 work is local/unreleased.
- Score: **20/114 (17.5%)**. Phase L1: **6/15 (40%)**. L1-03 is 3 points; completion would be **23/114 (20.2%)**.
- Preserve every unrelated course file in the dirty `develop` worktree. The production clean clone remains separate at `C:\tmp\Digital-Grimoire-main-prod` and production main remains `11ef501`.
- The L1-02 migration is applied only to the backed-up local Docker volume. It is not in production or the production migration ledger.
- The database backup for L0-03 must still be retained through 2026-08-17.

## Assumptions Made

- A confirmed signed-in account with an owned PRE enrollment is eligible for PRE progress regardless of later paid-plan state; the contract intentionally has no billing effect.
- Owner-only route/source tests plus real local RPC/RLS integration satisfy L1-02; L1-05 remains the explicit end-to-end browser gate.
- L1-03 can build locally without production access.

## Potential Gotchas

- Windows reserves TCP ports 54255–54354, which includes Supabase's normal 5432x local ports. If the local stack must restart, temporarily use unused 5702x ports, start it, then immediately restore `supabase/config.toml` and confirm `git diff --exit-code -- supabase/config.toml`.
- The first L1-02 SQL attempt loaded the local migration but the test harness failed because psql variables were placed inside dollar-quoted blocks. The corrected harness uses transaction-local settings and the full rerun passed.
- `journal_pages` workbook columns appear in `migrations/` and `app/src/lib/supabase/migrations/`, not reliably in canonical `supabase/migrations/`; L1-03 must reconcile forward from verified schema rather than copy assumptions.
- Do not reuse `/api/reading-progress` for V2 course progress; it is text-level legacy state.
- Do not run broad `supabase db push` against production.
- The production-style build intentionally used placeholder settings. Expected pre-existing build warnings are recorded in L1-02 evidence.

## Environment State

## Tools/Services Used

- Node test runner through `tsx`, ESLint, TypeScript, and Next.js build.
- Local Docker/Supabase PostgreSQL 17 for transactional authorization tests.
- Git read-only status/diff checks to protect unrelated work.

## Active Processes

- Local Supabase containers are stopped; local data were backed up to the Docker volume.
- Docker Desktop remains running because stopping the whole application could disturb unrelated containers. No L1 test process remains.

## Environment Variables

- Build-only process overrides used names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_AUTH_TOKEN`, `NEXT_TELEMETRY_DISABLED`.
- No values are stored here. Production environment variables were not read or changed.

## Related Resources

- [Membership tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [L1-01 contract guide](../../docs/planning/lean-l1-01-v2-learner-progress-save-contract.md)
- [L1-01 local evidence](../../docs/audits/lean-l1-01-v2-learner-progress-save-contract-local-2026-08-10.md)
- [L1-02 local evidence](../../docs/audits/lean-l1-02-server-progress-local-2026-08-10.md)
- [Previous handoff](./2026-08-10-211758-lean-membership-l0-complete-l1-01-ready.md)

---

**Security Reminder**: Validate this file for completeness and accidental secret exposure before relying on it.
