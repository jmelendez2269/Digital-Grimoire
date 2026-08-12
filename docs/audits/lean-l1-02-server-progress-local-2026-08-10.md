# LEAN-L1-02 local verification — server-owned PRE progress

**Date:** August 10, 2026  
**Packet:** `LEAN-L1-02`  
**Result:** Passed locally  
**Production effect:** None

## Outcome

The app now has a server-owned V1 progress endpoint for the exact PRE course:

```text
GET /api/courses/pre-how-to-hold-two-things-at-once/progress
PUT /api/courses/pre-how-to-hold-two-things-at-once/progress
```

The route verifies the server auth session and confirmed email before course lookup, resolves PRE from the L1-01 allowlist, cross-checks the course tag, requires an owned enrollment, and uses the service client only after those checks. It never reads database `is_published` as access authority and never accepts a browser-supplied user ID or trusted course UUID.

The forward migration adds a service-owned idempotency ledger and one service-only atomic progress function. Customer API roles keep owner-only enrollment reads but cannot insert, update, or delete progress directly. The function validates PRE and its real week numbers again, locks the enrollment row, checks the expected revision, preserves the never-shrinking visited-week set, and handles identical versus changed request replays safely.

## Files

| File | Purpose |
|---|---|
| `app/src/app/api/courses/[id]/progress/route.ts` | Authenticated, non-cacheable GET/PUT endpoint |
| `app/src/lib/courses/learner-progress.server.ts` | Strict request/stored-state parsing and safe database-error mapping |
| `supabase/migrations/20260810220000_lean_l1_02_learner_progress.sql` | Forward RLS, ledger, grants, and atomic service-only save function |
| `app/tests/learner-progress-endpoint.test.ts` | Parser, endpoint-boundary, error, and migration source tests |
| `app/tests/sql/lean-l1-02-learner-progress.sql` | Transactional local database authorization/revision/replay story |
| `app/scripts/run-lean-l1-02-progress.ps1` | Guarded local-only SQL runner |

## Local database proof

Docker Desktop was started only for this check. Windows had reserved Supabase's normal 5432x port range, so `supabase/config.toml` was temporarily changed to unused 5702x ports for startup and immediately restored. `git diff --exit-code -- supabase/config.toml` passed after restoration.

The exact forward migration was applied to the local Supabase database. The test transaction then proved:

| Check | Result |
|---|---|
| Verified owner saves PRE progress even when the fixture row is not published | Pass |
| Identical request replay returns the original revision | Pass |
| Reused request ID with changed payload | Denied |
| Stale expected revision | Denied |
| Non-PRE course | Denied |
| Unknown PRE week | Denied |
| Other learner's enrollment through customer RLS | Hidden |
| Direct customer enrollment/progress mutation and RPC execution | Denied |
| Final revision/current week/visited weeks | Exact |
| Synthetic fixture residue after rollback | 0 |

The first test attempt exposed a psql-variable syntax error in the test harness after the local migration loaded. No acceptance story ran on that attempt. The harness was corrected to use transaction-local PostgreSQL settings, and the complete rerun passed. This was a local test-only issue; application code and production were unaffected.

The Supabase stack was stopped after verification. Its local Docker volume was backed up by the CLI; no local test process remains running.

## Application verification

Results:

- L1-01 + L1-02 focused tests: **14/14 passed**, 0 failed, 0 skipped.
- Focused ESLint: **passed**.
- Global TypeScript: **passed**.
- Targeted diff/whitespace check: **passed**.
- Next.js production-style build: **passed**, **136/136 pages**, including `/api/courses/[id]/progress`.

The build used local/build-only placeholder Supabase settings and an empty Sentry token. It made no deployment or external mutation. Existing warnings about the middleware naming convention, Sentry config naming, and outdated browser-baseline data remain unrelated to this packet.

## Acceptance mapping

| Requirement | Evidence | Result |
|---|---|---|
| Verified Reader can persist/retrieve PRE progress | Server auth/email/enrollment route plus atomic local DB save and typed GET projection | Pass |
| PRE-only free-course authority | Exact shared allowlist plus route and database tag/slug checks | Pass |
| Own progress only | Route derives user from auth; service query filters owner; customer RLS hides the second fixture | Pass |
| Anonymous failure | Route authenticates before allowlist, service creation, or RPC | Pass |
| Non-allowlisted course failure | Strict parser/route plus local database denial | Pass |
| Cross-user failure | Unknown identity fields rejected, auth-derived owner query, RLS cross-user check | Pass |
| Malformed failure | Strict version, UUID, slug, revision, stage, and sorted-week parser tests | Pass |
| Replay failure/success | Identical replay is idempotent; changed replay and stale revision fail | Pass |

## Limits and next boundary

This packet does not connect the V2 browser UI to the endpoint; that belongs to L1-04 after workbook saves exist. Its route boundary is covered by typed/source tests and its mutation/RLS behavior by a real local PostgreSQL story. L1-05 remains responsible for the final authenticated real-browser, new-session proof.

The migration has not been applied to production, the route has not been deployed, and no production approval is active. A later exact release proposal must identify this migration and the complete reviewed file list before any live change.

