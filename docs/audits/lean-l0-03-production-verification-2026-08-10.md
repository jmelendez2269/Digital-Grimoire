# LEAN-L0-03 production permission and server-authority verification

**Evidence date:** August 10, 2026  
**Packet:** `LEAN-L0-03`  
**Result:** Complete  
**Verified points:** 3

## Approved boundary

Jen explicitly approved the exact nine-file L0-03 release after reviewing its
scope and local results. The release excluded unrelated course work, pending
course migrations, L0-04 commercial-containment changes, Stripe configuration,
environment-variable changes, staging activation, and every other database
migration.

The approved order was:

1. deploy trusted server-write authority first;
2. verify the production application is healthy;
3. apply exactly one reviewed database permission file;
4. run read-only database and application checks; and
5. record only that migration as applied.

## Application deployment

| Item | Evidence |
|---|---|
| Git commit | `179f270` (`Secure database write authority`) |
| Git target | `main` |
| Changed files | Seven server files, one source regression test, one forward migration |
| Vercel deployment | `dpl_DjhKbo1TiLWPtST7w32M3FJkP7tA` |
| Vercel status | `Ready` |
| Production aliases | `prismarium.xyz`, `www.prismarium.xyz` |
| Remote build | Commit `179f270`; TypeScript and 136/136 generated pages passed |

Before the push, the clean production-branch candidate passed 3/3 focused
server-authority tests, global TypeScript, diff checks, and a 136/136-page
production build. The clean build used fake localhost/build-only placeholders;
no real credential was copied into the candidate.

## Database change

The linked project reference was confirmed as the intended production project.
Migration history was read before execution and showed the known historical
drift, including unrelated pending course migrations. The normal broad
`supabase db push` path was therefore not used.

Exactly this file was applied with the one-file linked query mechanism:

`supabase/migrations/20260810210000_lean_l0_03_permission_hotfix.sql`

The SQL executed inside its reviewed transaction and completed successfully.
After acceptance checks passed, migration version `20260810210000` alone was
marked applied. A final migration-list check showed matching local and remote
versions for that entry.

## Read-only production verification

No adversarial fixture, customer record, raw payload, identifier, or secret was
read or written during verification. Only aggregate database catalogs and
unauthenticated HTTP status codes were checked.

| Check | Before | After | Expected |
|---|---:|---:|---|
| API role/table pairs retaining protected mutation privileges | 22 | 0 | 0 |
| Shared reference tables with RLS enabled | 0 | 7 | 7 |
| Shared reference read policies | 0 | 7 | 7 |
| Shared read role/table grants | Not recorded | 14 | 14 |
| Named protected definer functions present | 7 | 7 | 7 |
| Protected functions executable by customer API roles | 7 | 0 | 0 |
| Protected functions executable by `service_role` | Not recorded | 7 | 7 |
| Protected functions with fixed search path | Not recorded | 7 | 7 |
| Required trusted server table authority | Not recorded | `true` | `true` |

## Live application checks after the database change

| Request | Result | Interpretation |
|---|---:|---|
| `GET /` | 200 | Production homepage available |
| `GET /explore` | 200 | Shared reference experience available |
| `GET /api/library/catalog` | 200 | Public catalog read path available |
| Unauthenticated `POST /api/stripe/sync-subscription` | 401 | Protected route rejects a stranger |
| Unauthenticated `GET /api/user/tts-preferences` | 401 | Protected route rejects a stranger |

The general `/api/health` path also returned 401 because production middleware
protects it; the public homepage and Vercel deployment status were used as the
health gates instead.

## Rollback and limits

No rollback was needed. If a later issue is traced to this packet, prefer a
forward repair. The guarded reversal remains outside migration history and must
not be used without a new explicit approval because it deliberately restores
the insecure pre-L0-03 permissions.

The restricted restore-tested backup remains under its documented retention
through August 17, 2026. L0-04 commercial containment is still locally verified
but not deployed; its deployment and kill-switch rehearsal belong to L0-05.

## Point result

All L0-03 acceptance evidence is now satisfied. The packet moves from
`verifying` to `done`, earns 3 points, and raises verified launch progress from
8/114 (7.0%) to **11/114 (9.6%)**.
