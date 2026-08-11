# Handoff: Lean membership L0-03 backup gate ready

## Session Metadata

- Created: 2026-08-10 12:43:24
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `develop`
- Session duration: Multi-session membership planning, containment, and verification work

### Recent Commits (for context)

- `e73061e` Make course preview source assertions formatting-agnostic
- `08d6be2` Restore the previous member dashboard and spotlight the current course
- `a81f931` Ship Course Format V2 rollout: release presentation, course-polls, public graph/library views
- `64631fc` Graph: retire legacy Concepts surface
- `c7617a4` DB: make course graph migrations atomic

## Handoff Chain

- **Continues from:** [2026-08-06-190612-lean-membership-l0-04-ready.md](./2026-08-06-190612-lean-membership-l0-04-ready.md)
- **Supersedes:** That handoff's immediate execution state. L0-04 is complete; this handoff controls the L0-03 backup gate.

## Current State Summary

Jen reaffirmed the full 114-point lean membership program because metered AI must be available at launch. Verified progress is **8/114 points (7.0%)**: L0-01, L0-02, and L0-04 are done. No packet is currently in progress. The next dependency-order packet is **`LEAN-L0-03` — permission and server-authority hotfix**, worth 3 points, but its production execution is blocked by a fresh restricted logical backup with a successful disposable restore test. The next chat must begin with backup-gate readiness and an exact proposed setup only. It must not connect to or mutate production, start Docker, reactivate staging, create a sensitive backup artifact, or run a migration until Jen explicitly approves that exact setup.

## Codebase Understanding

## Architecture Overview

- Next.js runs on Vercel; Supabase supplies Postgres/Auth; Stripe supplies billing. A Vercel rollback cannot restore database state.
- `supabase/migrations` is the intended canonical migration tree, but it diverges from the deployed ledger and older `migrations/` trees. L0-03 must use one new forward-only canonical migration, never replay drifted history.
- The accepted L0-01 catalog and L0-02 local runtime evidence prove unsafe customer authority. L0-03 repairs that authority; it does not repeat the retired L0-02 production/staging adversarial probe.
- L0-04 added default-closed application guards around stale Checkout and customer-reachable provider-cost routes. That work is locally verified but not deployed; its independent kill switches must remain available during database repair and later rollout.
- Production currently has no verified restorable logical backup, no confirmed PITR window, and no accepted restore evidence.
- A valid backup artifact may contain customer data and database definitions. It must never enter the repository, logs, handoffs, or ordinary shared storage.

## Critical Files

| File | Purpose | Relevance |
|---|---|---|
| `docs/planning/prismarium-membership-implementation-tracker.md` | Canonical packet and point status | L0-03 is next but backup-gated; progress is 8/114 |
| `docs/audits/lean-l0-01-read-only-preflight-2026-08-06.md` | Production catalog and backup readiness evidence | Defines exact backup prerequisites and unsafe production surfaces |
| `docs/audits/lean-l0-02-authorization-baseline-2026-08-06.md` | Accepted authorization baseline | Defines repair targets without requiring another production adversarial test |
| `docs/audits/lean-l0-02-production-rollback-test-review-2026-08-06.md` | Retired production probe record | Controlling prohibition against retrying L0-02 production/staging probes |
| `docs/audits/lean-l0-04-stale-sales-unmetered-closure-2026-08-06.md` | Application containment evidence | Preserve independent Checkout/generation kill switches |
| `app/tests/sql/lean-l0-02-authorization-baseline.sql` | Rollback-only authorization suite | May be used in an approved disposable restored environment; production remains refused |
| `app/scripts/run-lean-l0-02-baseline.ps1` | Local suite runner | Local-only harness; do not rebuild a production runner |
| `supabase/migrations/20260219210102_remote_schema.sql` | Historical remote schema snapshot | Useful catalog context, not safe migration history to replay |
| `supabase/migrations/20260810000000_improve_pre_reading_context.sql` | New unrelated reading-context migration in the dirty tree | User-owned work; preserve it and account for its timestamp before naming L0-03 migration |
| `app/src/lib/commercial-availability-policy.ts` | L0-04 server-only action policy | Keep fail-closed behavior independent of database rollback |
| `app/src/lib/commercial-availability.ts` | Shared runtime guard response | Preserve during L0-03 |

## Key Patterns Discovered

- Customer sessions should receive safe row reads and narrowly scoped self-service writes only; billing, roles, credits, authoritative usage, enrollment entitlement, and shared cache mutation belong to server/service paths.
- Revoking broad table or function privileges must be paired with verification that legitimate service-role, webhook, admin, trigger, and application paths still work.
- PostgreSQL functions do not automatically become private because they are `SECURITY DEFINER`; default `PUBLIC` execution must be revoked and deliberate grants restored.
- Schema repair must be forward-only with separately reviewed reversal SQL. Do not edit already-deployed migrations or trust an undifferentiated local schema replay.
- Backup readiness is evidence, not merely successful dump creation: timestamp, size, SHA-256, restricted location, retention, owner, disposable restore, row-count checks, and authorization smoke checks are all required.

## Work Completed

## Tasks Finished

- [x] Accepted L0-01 production/schema/Stripe preflight for 3 points.
- [x] Accepted L0-02 authorization baseline for 2 points: 48 local probes, 11 secure passes, 37 security failures, 0 inconclusive, and 0 residue.
- [x] Permanently retired further L0-02 staging/production adversarial probing.
- [x] Completed and verified L0-04 for 3 points with default-closed Checkout and provider-cost route containment.
- [x] Re-ran L0-04 verification on August 9: 8/8 focused tests, global TypeScript, 136/136-page production build, and diff check passed.
- [x] Reaffirmed that AI is required for launch, so the 114-point lean program remains the controlling execution plan.
- [x] Identified L0-03's backup gate as the immediate next boundary and preserved it from accidental production execution.

## Files Modified

| File or group | Changes | Rationale |
|---|---|---|
| `app/src/lib/commercial-availability-policy.ts`, `app/src/lib/commercial-availability.ts` | Added default-closed server action and Checkout Price allowlist guards | L0-04 containment before billing/metering is ready |
| Checkout and confirmed customer-reachable provider-cost API routes | Added guard calls before side effects | Prevent stale sales and unmetered spend |
| `app/tests/commercial-availability.test.ts` | Added 8 focused policy and source-ordering tests | Proves fail-closed behavior |
| `docs/audits/lean-l0-04-stale-sales-unmetered-closure-2026-08-06.md` | Added accepted L0-04 evidence | Records scope, route inventory, verification, and rollback |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Recorded 8/114 and L0-03 backup gate | Maintains canonical progress |
| `.claude/handoffs/2026-08-10-124324-lean-membership-l0-03-backup-gate-ready.md` | Added this clean next-chat boundary | Prevents unsafe or repetitive production work |

There are additional user-owned course reading-context changes and a new migration in the dirty worktree. They are unrelated to this handoff and must be preserved.

## Decisions Made

| Decision | Options Considered | Rationale |
|---|---|---|
| Continue the 114-point lean program | Course-only launch with AI disabled; lean membership with metered AI | Jen confirmed AI is essential to the launch product, so credit/metering phases remain necessary |
| Start a new chat for L0-03 | Continue this long planning thread; clean handoff | L0-03 is a distinct high-risk production boundary and benefits from an unambiguous context reset |
| Split L0-03 into backup readiness, backup/restore, migration review, and production execution gates | Treat one approval as authorization for the whole packet | Each stage has different data-handling and production risk; approval must be exact and bounded |
| Do not reactivate staging or start Docker implicitly | Restore into existing staging; automatically use local Docker; propose exact disposable target first | Jen previously shut staging off and questioned Docker use; either requires explanation and exact approval |
| Preserve L0-02 acceptance | Retry production adversarial fixtures; use catalog plus disposable restored-environment verification | The retired probe added risk without changing repair scope |

## Pending Work

## Immediate Next Steps

1. Read this handoff, tracker, L0-01 backup prerequisites, and L0-02 accepted failures. Confirm no external process or connection is started.
2. Perform local read-only readiness checks only: available dump/restore clients, repository migration state, destination requirements, estimated artifact sensitivity, and possible disposable restore targets. Do not print credentials or values.
3. Present Jen one exact backup-and-restore proposal naming the tool, production source, restricted destination outside the repository, encryption/access approach, retention/owner, disposable restore target, cleanup method, expected duration, and exact commands/actions. Explain whether Docker or staging would be needed.
4. Stop for explicit approval of that exact setup. Approval of backup creation does not authorize the L0-03 migration.
5. After approved backup creation and successful restore evidence, draft the forward-only L0-03 migration and reversal SQL locally, review affected legitimate paths, and request a separate exact production-migration approval.

## Blockers/Open Questions

- [ ] No verified restorable production database backup exists.
- [ ] The restricted backup destination, owner, retention, and disposal process have not been selected.
- [ ] The disposable restore target has not been selected. Intentionally inactive staging must not be reactivated without approval; Docker must not be started without explaining why and receiving approval.
- [ ] A production database connection method for `pg_dump`/Supabase dump has not been approved or validated.
- [ ] L0-03 production execution lacks explicit approval and must remain blocked even after the backup gate passes.

## Deferred Items

- L0-05 deployment, production verification, and rollback rehearsal wait for L0-03 and require separate approval.
- L1–L5 membership, credits, metering, customer UI, cost study, and canary remain in the accepted 114-point program but are not part of the backup gate.
- Do not change Stripe, Vercel environment variables, Checkout enablement, generation enablement, or production application deployment during L0-03 backup readiness.
- Do not fold unrelated course reading-context changes into the L0-03 migration.

## Context for Resuming Agent

## Important Context

The next chat is **not authorized to execute the production permission migration**. Its first deliverable is an exact, privacy-safe backup-and-restore setup for Jen to approve. Do not infer authorization from `begin L0-03`, `continue`, or general approval of the 114-point plan. Backup creation reads the production database and creates a sensitive external artifact; it also needs exact approval after destination and restore target are known.

The L0-03 repair scope is already known from accepted evidence:

- prevent customers from updating protected `users` columns including role, tokens/credits, tier/subscription state, Stripe references, and entitlement dates;
- prevent direct customer creation/deletion or authoritative mutation of course enrollment/progress state;
- prevent customer/anonymous forging of `api_usage` and other authoritative usage evidence;
- prevent authenticated writes to shared `search_cache` unless routed through a deliberate service path;
- remove broad customer table privileges where policy-only protection is insufficient;
- revoke default `PUBLIC`/API execution from non-public `SECURITY DEFINER` functions while preserving trigger and deliberately public RPC behavior;
- verify legitimate service-role, webhook, admin, and application paths after repair.

Do not retry L0-02 production/staging adversarial fixture testing. Verification can use the approved disposable restored environment, source/catalog assertions, migration tests, and later L0-05 deployed checks. L0-02's production runner was deleted and must not be recreated.

The worktree is substantially dirty. User-owned course work currently includes `app/src/components/courses/CourseLearnerRenderer.tsx`, `app/src/lib/courses/course-book-presentation.ts`, `app/src/lib/parsers/course-markdown-parser.ts`, related tests, and `supabase/migrations/20260810000000_improve_pre_reading_context.sql`. Preserve all unrelated changes; do not clean, reset, stage, commit, rename, or rewrite them.

Recommended resume prompt:

> Resume from `.claude/handoffs/2026-08-10-124324-lean-membership-l0-03-backup-gate-ready.md`. Begin only the L0-03 backup-readiness gate: inspect local tools and existing evidence, then propose one exact restricted production backup and disposable restore-test setup for my approval. Do not connect to or mutate production, start Docker, reactivate staging, create a backup artifact, or execute any migration until I explicitly approve the exact setup. Preserve all unrelated course reading-context work.

## Assumptions Made

- Jen wants the complete 114-point lean plan because The Working and Seven Lenses must be safely available at launch.
- Jen's approval of the overall plan is not approval for any particular production, backup, Docker, staging, or migration operation.
- The intentionally shut-off staging project remains off.
- Docker Desktop remains off unless a later exact restore-test proposal is approved.
- The current working tree contains valuable user work from other sessions and must be treated as shared, not disposable.

## Potential Gotchas

- A database dump is read-only with respect to production but creates a highly sensitive copy; never treat it as a harmless diagnostic file.
- Do not store dumps, checksums containing sensitive paths, credentials, connection strings, or restored data inside the repository.
- `pg_dump` client/server version compatibility matters. Check versions without installing or starting services first.
- Supabase's physical backup/WALG metadata observed earlier did not prove a usable restore point; do not count it as satisfying this gate.
- Schema-only restore is insufficient. The evidence must cover definitions and enough data/row-count behavior to prove restoration, while keeping the disposable target restricted.
- The new unrelated `20260810000000` migration affects the next safe migration timestamp and possibly restored-schema state.
- L0-04 is locally verified but not deployed. Do not assume production Checkout/generation containment until L0-05 verifies deployment.
- No points are earned for backup readiness alone; L0-03 earns 3 points only when repair and acceptance evidence are complete.

## Environment State

## Tools/Services Used

- Git and local source inspection were used for this handoff.
- Local L0-04 tests, TypeScript, and production build passed on August 9.
- No production, Supabase, Stripe, Vercel, staging, Docker, or deployment action was taken while creating this handoff.

## Active Processes

- Do not assume Docker, Supabase, a development server, or a database client is running.
- Verify process state read-only before proposing any setup.

## Environment Variables

Relevant names only; never record values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Any dedicated database connection variable selected for the approved dump tool
- `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS`
- `PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS`

Do not print, copy into commands visible in reports, or store credential values in the handoff.

## Related Resources

- [Canonical membership tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Controlling lean launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [Accepted L0-01 preflight and backup gate](../../docs/audits/lean-l0-01-read-only-preflight-2026-08-06.md)
- [Accepted L0-02 authorization baseline](../../docs/audits/lean-l0-02-authorization-baseline-2026-08-06.md)
- [Retired L0-02 production proposal](../../docs/audits/lean-l0-02-production-rollback-test-review-2026-08-06.md)
- [Accepted L0-04 closure evidence](../../docs/audits/lean-l0-04-stale-sales-unmetered-closure-2026-08-06.md)
- [L0-02 SQL baseline suite](../../app/tests/sql/lean-l0-02-authorization-baseline.sql)
- [L0-02 local runner](../../app/scripts/run-lean-l0-02-baseline.ps1)
- [L0-04 policy](../../app/src/lib/commercial-availability-policy.ts)

---

**Security reminder:** Validate this handoff before use. It must contain no credentials, connection strings, backup contents, customer data, or sensitive destination details.
