# Handoff: Lean membership L0-03 complete; L0-05 in progress

## Session Metadata
- Created: 2026-08-10 19:54:56
- Project: C:\Projects\Digital-Grimoire
- Branch: develop
- Session duration: About 8 hours across backup, local repair, approval, and production verification

## Recent Commits (for context)
  - e73061e Make course preview source assertions formatting-agnostic
  - 08d6be2 Restore the previous member dashboard and spotlight the current course
  - a81f931 Ship Course Format V2 rollout: release presentation, course-polls, public graph/library views
  - 64631fc Graph: retire legacy Concepts surface
  - c7617a4 DB: make course graph migrations atomic

## Handoff Chain

- **Continues from**: [2026-08-10-192643-lean-membership-l0-03-local-fix-ready-for-production-review.md](./2026-08-10-192643-lean-membership-l0-03-local-fix-ready-for-production-review.md)
  - Previous title: Lean membership L0-03 local fix ready for production review
- **Supersedes**: The previous handoff's production-review boundary; L0-03 is now complete

> Review the previous handoff for full context before filling this one.

## Current State Summary

`LEAN-L0-03` is complete in production. Jen explicitly approved the exact nine-file release; commit `179f270` was pushed to `main`, Vercel deployment `dpl_DjhKbo1TiLWPtST7w32M3FJkP7tA` reached Ready and serves both Prismarium domains, and exactly one reviewed database permission file was applied. Read-only catalogs proved unsafe API table pairs changed 22 to 0 and exposed protected functions changed 7 to 0 while seven RLS/read policies, shared reads, and trusted service authority remain. Live HTTP checks passed, migration version `20260810210000` is recorded applied, no rollback was needed, and unrelated course/L0-04 work was excluded. Verified progress is now 11/114 (9.6%). `LEAN-L0-05` is in progress and worth 3 points. A clean 20-file candidate now exists on local branch `agent/l0-05-containment`; 11/11 combined safety tests, TypeScript, diff checks, and a 136/136-page build pass. Production switch names are absent, so the candidate defaults closed. The exact runbook is ready for a new approval; L0-05 has not been pushed or deployed.

## Codebase Understanding

## Architecture Overview

The safe release order is trusted application code first, database privilege removal second, and migration-ledger repair only after read-only acceptance passes. GitHub `main` triggers Vercel production deployment. The linked Supabase migration ledger has known drift, so ordinary `db push` is unsafe; one reviewed SQL file was executed through `supabase db query --linked --file`, then only its version was marked applied. L0-04 is a separate default-closed application containment layer that remains local and must be deployed/rehearsed under L0-05.

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `docs/audits/lean-l0-03-production-verification-2026-08-10.md` | Production evidence | Records approval, deploy, database counts, HTTP checks, ledger, exclusions, and rollback status |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Program source of truth | Shows 11/114 and L0-05 in progress |
| `supabase/migrations/20260810210000_lean_l0_03_permission_hotfix.sql` | Production permission repair | Applied and recorded in production |
| `docs/audits/lean-l0-04-stale-sales-unmetered-closure-2026-08-06.md` | Local L0-04 evidence | Controls L0-05 deployment scope |
| `app/src/lib/commercial-availability-policy.ts` | Fail-closed L0-04 policy | Not yet deployed; must be included deliberately in L0-05 |
| `app/tests/commercial-availability.test.ts` | L0-04 acceptance tests | Eight local tests currently pass |
| `docs/audits/lean-l0-05-production-runbook-2026-08-10.md` | Exact L0-05 boundary | Lists 20 files, safe sequence, HTTP matrix, stop conditions, and exclusions |

## Key Patterns Discovered

- Never infer additional production permission from approval of a previous exact package.
- Explain technical actions at a middle/high-school level and use simple yes/no production questions.
- Deploy trusted server authority before revoking customer-role writes.
- Use read-only aggregate catalogs in production; never revive retired adversarial customer fixtures.
- Preserve the dirty `develop` tree and build production packages in the clean `C:\tmp\Digital-Grimoire-main-prod` copy.

## Work Completed

## Tasks Finished

- [x] Published the exact nine-file L0-03 commit `179f270` to production `main`.
- [x] Verified Vercel Ready status, commit, aliases, remote TypeScript, and 136/136 pages.
- [x] Verified public-domain homepage availability before database mutation.
- [x] Measured the expected insecure production baseline using aggregate catalogs only.
- [x] Applied exactly one reviewed L0-03 SQL file in its transaction.
- [x] Proved customer mutation/function exposure is zero and trusted reads/service authority remain.
- [x] Passed post-database live HTTP checks and recorded only migration `20260810210000` applied.
- [x] Added production evidence and updated progress to 11/114 (9.6%).
- [x] Preserved all unrelated course work and did not deploy L0-04.

## Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| Seven L0-03 server files in commit `179f270` | Moved protected writes to trusted service authority | Keeps legitimate application writes working after database locks |
| `app/tests/permission-server-authority.test.ts` in commit `179f270` | Added source regression coverage | Prevents authority drift |
| `supabase/migrations/20260810210000_lean_l0_03_permission_hotfix.sql` in commit `179f270` | Added and applied forward repair | Removes unsafe customer authority |
| `docs/audits/lean-l0-03-production-verification-2026-08-10.md` | Added privacy-safe production evidence locally | Supports L0-03 completion without exposing secrets/customer data |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Marked L0-03 done and L0-05 in progress | Recalculated verified points and next dependency |

## Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Used a clean production copy and exact file staging | Push dirty develop tree; exact clean package | Prevented course and L0-04 work from entering production |
| Used one-file database query plus one-version ledger repair | Broad `db push`; replay history | Avoided unrelated pending migrations and known ledger drift |
| Verified before ledger repair | Mark first; verify first | Kept incomplete/failed work from being recorded as accepted |
| Did not automatically run rollback | Automatic reversal; stop and reassess | The rollback intentionally restores insecure permissions and needs separate approval |

## Pending Work

## Immediate Next Steps

1. Show Jen the completed L0-05 runbook, customer-visible effect, stop conditions, and 3-point result, then ask a new simple yes/no production-approval question.
2. If approved, stage and commit exactly the 20 files from local branch `agent/l0-05-containment`, push to production `main`, and wait for Vercel Ready before verification.
3. Run the safe 503 kill-switch matrix, core 200 smoke checks, L0-03 catalog regression check, and error-log scan. Do not change environment values or the database.

## Blockers/Open Questions

- [ ] Decide whether L0-05 should deploy all default-closed L0-04 routes in one release or split Checkout from provider-cost routes; use the existing audit and dependency graph, not guesswork.
- [ ] Define a safe kill-switch rehearsal that proves default closure without enabling a paid or provider-cost action.
- [ ] Obtain explicit production approval for the final L0-05 package.

## Deferred Items

- L0-04 production deployment and environment rehearsal are deferred until exact L0-05 approval.
- Stripe catalog, Checkout reopening, billing, credits, and AI metering remain later packets.
- Unrelated course reading-context and presentation work remains user-owned and untouched.

## Context for Resuming Agent

## Important Context

The user wants explanations at roughly a middle/high-school level. Define terms and ask short yes/no production questions. L0-03 is live and complete; do not rerun it or treat its approval as permission for L0-05. Production application commit is `179f270`; deployment `dpl_DjhKbo1TiLWPtST7w32M3FJkP7tA` is Ready and serves both Prismarium domains. Production catalogs after repair are: unsafe API table pairs 0, API-executable protected functions 0, seven RLS tables, seven read policies, fourteen shared read grants, seven service-executable protected functions, seven fixed search paths, and trusted table authority true. HTTP checks after repair: homepage 200, Explore 200, Library catalog 200, unauthenticated subscription sync 401, unauthenticated TTS 401. Migration list shows local/remote `20260810210000` matched.

The dirty `develop` worktree still contains valuable course work and the full locally verified L0-04 changes. Never clean, reset, or stage it wholesale. The clean production clone `C:\tmp\Digital-Grimoire-main-prod` is on local branch `agent/l0-05-containment`, based on production `179f270`, with exactly 20 unstaged L0-05 files. L0-04 was intentionally excluded from L0-03. L0-05 is worth 3 points; completion would move 11/114 (9.6%) to 14/114 (12.3%).

## Assumptions Made

- Jen's request to continue authorizes safe local/read-only L0-05 preparation, not a new production deployment or environment change.
- L0-02's production/staging adversarial test path remains permanently retired.
- The existing restore-tested backup remains retained through August 17, 2026.

## Potential Gotchas

- Production `/api/health` returns 401 because middleware protects it; use Vercel Ready plus public homepage/API checks.
- `supabase migration list --linked` must run from the repository root here; adding `--workdir supabase` failed to locate the project reference.
- Migration history still has unrelated historical drift; never use broad `db push` casually.
- L0-04 changes overlap some L0-03 route files. Build the next release relative to production `179f270`, not by copying whole dirty files blindly.
- Do not enable any commercial action merely to prove the default-closed kill switch.

## Environment State

## Tools/Services Used

- GitHub CLI and local Git published the exact production commit.
- Vercel CLI inspected build logs, deployment status, aliases, and the public domain.
- Supabase CLI used linked read-only catalog queries, one-file SQL execution, one-version migration repair, and migration-list verification.
- Curl checked only status codes; no customer payloads were printed.

## Active Processes

- None. No local Supabase, Docker, dev server, or watcher is running.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS`
- `PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Related Resources

- [L0-03 production evidence](../../docs/audits/lean-l0-03-production-verification-2026-08-10.md)
- [L0-03 local evidence](../../docs/audits/lean-l0-03-permission-hotfix-local-2026-08-10.md)
- [L0-03 backup evidence](../../docs/audits/lean-l0-03-backup-restore-gate-2026-08-10.md)
- [Lean implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [L0-04 local containment evidence](../../docs/audits/lean-l0-04-stale-sales-unmetered-closure-2026-08-06.md)
- [L0-05 production runbook](../../docs/audits/lean-l0-05-production-runbook-2026-08-10.md)

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
