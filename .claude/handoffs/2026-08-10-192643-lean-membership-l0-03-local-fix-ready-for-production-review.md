# Handoff: Lean membership L0-03 local fix ready for production review

## Session Metadata
- Created: 2026-08-10 19:26:43
- Project: C:\Projects\Digital-Grimoire
- Branch: develop
- Session duration: About 7 hours, including backup verification, implementation, and local testing

## Recent Commits (for context)
  - e73061e Make course preview source assertions formatting-agnostic
  - 08d6be2 Restore the previous member dashboard and spotlight the current course
  - a81f931 Ship Course Format V2 rollout: release presentation, course-polls, public graph/library views
  - 64631fc Graph: retire legacy Concepts surface
  - c7617a4 DB: make course graph migrations atomic

## Handoff Chain

- **Continues from**: [2026-08-10-124324-lean-membership-l0-03-backup-gate-ready.md](./2026-08-10-124324-lean-membership-l0-03-backup-gate-ready.md)
  - Previous title: Lean membership L0-03 backup gate ready
- **Supersedes**: None

> Review the previous handoff for full context before filling this one.

## Current State Summary

L0-03 now has a written database-permission hotfix, a guarded rollback, server-side authority changes, and repeatable local tests. The local database proved the full sequence: insecure baseline, forward fix, exact rollback, and forward restoration. A separate clean production-branch copy at `C:\tmp\Digital-Grimoire-main-prod` now contains an exact nine-file L0-03 candidate: seven server files, one source regression test, and the one database migration. That candidate excludes course work and L0-04 containment, and passed 3/3 focused tests, TypeScript, a 136/136-page production build using fake local build-only environment placeholders, and diff checks. It is not committed, pushed, or deployed. The implementation tracker remains at 8/114 with L0-03 marked `verifying`, because production and staging have not been changed. The next task is to present the exact release sequence and obtain a fresh yes/no approval before any production mutation.

## Codebase Understanding

## Architecture Overview

The browser/session Supabase client is intentionally limited by row-level security (RLS), while trusted server routes use the service-role client for authorized writes. Billing synchronization, Stripe webhooks, usage tracking, TTS preferences, search caching, and embedding persistence all need that trusted server authority before database grants are tightened. The database migration removes broad API-role mutation privileges, preserves intended shared reads, enables RLS on shared tables, and limits sensitive `SECURITY DEFINER` functions to the service role. Production migration history differs from the local canonical tree, so the release must apply exactly this one reviewed SQL file; a broad migration replay or ordinary `db push` could include unrelated course migrations.

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `supabase/migrations/20260810210000_lean_l0_03_permission_hotfix.sql` | Forward database hotfix | The one SQL change intended for production review |
| `supabase/snippets/lean_l0_03_permission_hotfix_rollback.sql` | Guarded emergency reversal | Requires exact confirmation variables and stays outside migration history |
| `app/tests/sql/lean-l0-03-permission-hotfix.sql` | SQL acceptance tests | Verifies catalogs, RLS, service authority, triggers, shared reads, and no residue |
| `app/scripts/run-lean-l0-03-permission-hotfix.ps1` | Local end-to-end database runner | Proves forward, rollback, and restoration behavior |
| `app/tests/permission-server-authority.test.ts` | Server-source regression tests | Prevents protected writes from drifting back to session authority |
| `docs/audits/lean-l0-03-permission-hotfix-local-2026-08-10.md` | Local verification evidence | Records commands, results, scope, and limits |
| `docs/audits/lean-l0-03-backup-restore-gate-2026-08-10.md` | Backup/restore gate evidence | Records the production backup and successful restore rehearsal |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Lean plan tracker | Shows L0-03 `verifying`, 8/114, and production unchanged |

## Key Patterns Discovered

- Authenticate the request with the normal session client, then perform protected server writes with `createServiceClient()`.
- Keep public/shared reads available while revoking mutation privileges from `anon` and `authenticated`.
- Make production rollback guarded and explicit; never place the rollback in the forward migration chain.
- Treat the dirty worktree as user-owned. Select release files intentionally and never stage unrelated course files or pending course migrations.

## Work Completed

## Tasks Finished

- [x] Confirmed the production backup and restore rehearsal gate without changing the application schema.
- [x] Wrote the forward database permission migration and guarded rollback.
- [x] Moved protected server writes to service-role authority after request authorization.
- [x] Added repeatable local SQL and source-level regression tests.
- [x] Proved forward fix, rollback, and forward restoration on local Supabase.
- [x] Passed focused tests, TypeScript, and the production build.
- [x] Updated L0-03 audit evidence and the implementation tracker.
- [x] Preserved unrelated course work and left production/staging unchanged.

## Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `supabase/migrations/20260810210000_lean_l0_03_permission_hotfix.sql` | Added the forward permission hardening | Closes unintended database write access while retaining intended reads and trusted writes |
| `supabase/snippets/lean_l0_03_permission_hotfix_rollback.sql` | Added a guarded reversal script | Provides a controlled recovery path during the backup-retention window |
| `app/src/app/api/stripe/create-checkout-session/route.ts` | Uses trusted server authority for the billing-profile write | Keeps checkout working after API-role writes are revoked |
| `app/src/app/api/stripe/sync-subscription/route.ts` | Adds commercial-action guard and trusted subscription writes | Keeps synchronization authorized and default-closed |
| `app/src/app/api/stripe/webhook/route.ts` | Uses trusted server authority for webhook-driven subscription updates | Webhooks have no end-user database session |
| `app/src/app/api/parallax/ai-search/route.ts` | Uses trusted authority for cache writes | Preserves search caching after permission tightening |
| `app/src/app/api/user/tts-preferences/route.ts` | Uses trusted authority after user authentication | Preserves preference updates without broad table grants |
| `app/src/lib/usage-tracker.ts` | Uses trusted authority for usage counters | Keeps server-metered writes working |
| `app/src/lib/parallax/embeddings.ts` | Uses trusted authority for embedding persistence | Keeps background/server writes working |
| `app/tests/sql/lean-l0-03-permission-hotfix.sql` | Added SQL acceptance assertions | Makes database behavior independently verifiable |
| `app/scripts/run-lean-l0-03-permission-hotfix.ps1` | Added the local proof runner | Automates baseline, forward, rollback, and restoration checks |
| `app/tests/permission-server-authority.test.ts` | Added three regression checks | Protects the service-authority boundary |
| `app/tests/commercial-availability.test.ts` | Extended sync-subscription containment assertion | Verifies the route closes before protected work |
| `app/package.json` | Added two L0-03 test scripts | Makes the checks easy to repeat |
| `app/tests/sql/README.md` | Documented the local runner | Gives future agents the correct safe workflow |
| `docs/audits/lean-l0-03-permission-hotfix-local-2026-08-10.md` | Added verification record | Captures evidence and limitations |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Marked L0-03 as verifying | Accurately reflects local completion and production hold |

## Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Deploy trusted server code before tightening database permissions | Database first, code first, simultaneous | Code first avoids breaking current production writes during the change window |
| Apply exactly one reviewed SQL file | `supabase db push`, migration-history repair, exact SQL application | Broad migration commands could include unrelated course work or replay divergent history |
| Keep production tests read-only | Adversarial writes in production, catalog/source checks | L0-02 permanently retired destructive production permission tests |
| Do not count L0-03 complete yet | Complete after local proof, verifying until production proof | The tracker must distinguish local success from production state |

## Pending Work

## Immediate Next Steps

1. Show the user the exact nine-file L0-03 candidate and plain-language runbook: commit/push the server changes first, verify deployment health, apply only the L0-03 SQL file with `supabase db query --linked --file`, then run read-only catalog and application checks.
2. Ask a fresh yes/no production-approval question naming the exact scope. Do not commit, push, deploy, or modify the production database until the user explicitly approves that exact plan.
3. If approved, execute one step at a time, report after each safety check, and stop immediately if application deployment or read-only health checks fail before the database lock is applied.

## Blockers/Open Questions

- [x] Exact database mechanism selected: `supabase db query --linked --file` applies one reviewed SQL file and avoids broad migration replay.
- [x] Exact clean release set prepared in the separate production-branch copy; L0-04 and unrelated course changes are excluded.
- [ ] Obtain explicit production approval after presenting the final scope; the user's earlier "yes continue" authorizes preparation, not production changes.

## Deferred Items

- Production application deployment and database mutation are deferred pending explicit approval.
- L0-05 end-to-end production smoke testing remains deferred until after an approved release.
- Unrelated course presentation, parser, test, and migration work remains user-owned and out of scope.

## Context for Resuming Agent

## Important Context

The user wants every technical explanation written at roughly a middle/high-school level. Define unfamiliar terms, explain what could go wrong in simple language, and ask short yes/no permission questions. Do not interpret casual phrases such as "continue" as approval for production. Before any production change, present the exact security-only package and ask something like: "I'm ready to deploy only the listed L0-03/L0-04 security files and apply the one reviewed database lock file. This excludes all course work. Do you approve this exact production change - yes or no?"

Production and staging are untouched. The local result is PASS: forward L0-02 suite 48/48 secure; L0-03 acceptance found 11 protected tables, 7 RLS tables, 6 named local definer functions, and 4 trusted service mutation paths; exact rollback reproduced 11 secure/37 failures; forward restoration returned to 48/48 secure; every phase left zero test residue. Source tests passed 3/3, commercial-containment tests passed 8/8, `npx tsc --noEmit` passed, and `npm run build` passed with 136/136 pages. Focused ESLint reported only existing legacy `no-explicit-any` and unused-variable findings, none introduced on new lines.

The production backup and restore rehearsal are documented and retained until August 17, 2026. Never use the ordinary linked `supabase db push` for this release: the repository contains unrelated pending course migrations and the production ledger diverges from canonical history. The safe one-file mechanism is `supabase db query --linked --file supabase/migrations/20260810210000_lean_l0_03_permission_hotfix.sql`. Never stage or discard the dirty worktree wholesale. Use only the clean candidate in `C:\tmp\Digital-Grimoire-main-prod`, which currently contains exactly nine L0-03 files and no L0-04 or course changes. The temporary local Supabase stack is stopped, Docker Desktop is stopped, original `supabase/config.toml` ports/line endings were restored, and local data volumes were preserved.

## Assumptions Made

- The user wants the assistant to prepare the production plan now but requires a separate explicit approval for production mutation.
- The existing dirty course files and course migrations are valuable user work and must remain untouched.
- The L0-04 containment code already present locally may be a required dependency of the L0-03 server release; this must be named in the approval scope, not silently included.

## Potential Gotchas

- A clean build from the current dirty tree does not prove a security-only release can be deployed by itself; inspect imports and include dependencies explicitly.
- Applying the database lock before trusted server code is live could break billing webhooks, subscription sync, TTS preferences, usage tracking, cache writes, or embeddings.
- `handle_user_update()` exists in production but not the local canonical schema. The migration intentionally handles it dynamically when present.
- The rollback is deliberately outside `supabase/migrations` and requires exact variables including `REVERSE-LEAN-L0-03`.
- Do not rerun retired adversarial fixtures against staging or production. Use read-only proof there.

## Environment State

## Tools/Services Used

- Local Supabase CLI and Docker Desktop were used for a database-only test stack on temporary port 15432.
- Node/npm ran focused tests, TypeScript checking, and the Next.js production build.
- A clean local production-branch copy at `C:\tmp\Digital-Grimoire-main-prod` was used to isolate the exact nine-file release. Its build used only fake localhost/build placeholder values, not real credentials.
- Production backup/restore tools and locations are documented in the backup gate audit; do not copy secret connection values into handoffs.

## Active Processes

- None. Local Supabase containers and Docker Desktop were stopped after testing.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Related Resources

- [Local L0-03 evidence](../../docs/audits/lean-l0-03-permission-hotfix-local-2026-08-10.md)
- [Backup and restore gate](../../docs/audits/lean-l0-03-backup-restore-gate-2026-08-10.md)
- [Lean implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Forward permission migration](../../supabase/migrations/20260810210000_lean_l0_03_permission_hotfix.sql)
- [Guarded rollback](../../supabase/snippets/lean_l0_03_permission_hotfix_rollback.sql)
- [SQL test runner](../../app/scripts/run-lean-l0-03-permission-hotfix.ps1)

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
