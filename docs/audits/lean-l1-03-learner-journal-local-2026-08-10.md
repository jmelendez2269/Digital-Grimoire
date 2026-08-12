# LEAN-L1-03 local verification — authorized workbook/Journal saves

**Date:** August 10, 2026  
**Packet:** `LEAN-L1-03`  
**Result:** Passed locally  
**Production effect:** None

## Outcome

The app now has a PRE-only workbook save and reload boundary:

```text
GET /api/courses/pre-how-to-hold-two-things-at-once/journal
PUT /api/courses/pre-how-to-hold-two-things-at-once/journal
```

The route checks the signed-in server session and confirmed email first. It then
resolves the exact PRE allowlist entry, cross-checks the `PRE` course tag,
requires that learner's enrollment, and checks the requested week before any
save. The browser cannot grant access by sending a user ID, course UUID,
publication flag, revision, or server timestamp.

`GET` returns one non-cacheable reload snapshot containing the resolved course,
saved progress, ordered workbook pages, and a server load time. `PUT` creates or
updates one logical page per learner/course/week/source. Creates start at
revision 1. Updates require the owned page ID and current revision. Identical
request replay returns the original result; changed replay and stale revisions
fail without overwriting saved work.

## Canonical database reconciliation

The canonical schema had only the basic `journal_pages` table. Course workbook
columns existed in secondary migration trees, so L1-03 adds them forward with
`IF NOT EXISTS` and leaves old pages untouched. New server-owned fields record
the stable source key, workbook revision, and save time. A partial unique index
enforces one logical page per learner/course/week/source.

A service-only request ledger and atomic save function protect replay and
revision behavior. Authenticated customers retain ordinary owner Journal CRUD,
but cannot directly set the new source/revision/save-time fields. Owner RLS
continues to hide other learners' pages.

The 50-active-page rule is enforced by a database trigger, not a browser count:

- Reader page 50 is allowed and page 51 is blocked.
- Student, Scholar, Adept, admin, and supported legacy-paid states are unlimited.
- A downgraded account above 50 keeps and can edit every page.
- Nothing is deleted or automatically archived.
- Creating or restoring an active page is blocked at 50; archiving below 50
  opens one slot.
- Simultaneous requests serialize on the learner before counting active pages.

## Files

| File | Purpose |
|---|---|
| `app/src/app/api/courses/[id]/journal/route.ts` | Authenticated PRE GET/PUT save and reload endpoint |
| `app/src/lib/courses/learner-journal.server.ts` | Strict request/stored-state parsing and safe error mapping |
| `supabase/migrations/20260810230000_lean_l1_03_learner_journal.sql` | Forward schema reconciliation, grants, cap trigger, ledger, and atomic save |
| `app/tests/learner-journal-endpoint.test.ts` | Parser, endpoint boundary, error, migration, and ordinary-route checks |
| `app/tests/sql/lean-l1-03-learner-journal.sql` | Rollback-only authorization, persistence, replay, and plan-limit story |
| `app/scripts/run-lean-l1-03-journal.ps1` | Guarded local-only SQL runner |
| `app/src/app/api/journal/route.ts` | Maps database create-cap denial to a safe 403 response |
| `app/src/app/api/journal/[id]/route.ts` | Maps database restore-cap denial to a safe 403 response |

## Local PostgreSQL proof

The forward migration was applied only to the retained local
`supabase_db_Digital-Grimoire` Docker volume. The complete rerun proved:

| Check | Result |
|---|---|
| PRE workbook create at Reader active page 50 | Pass |
| Reader page 51 through service save and ordinary authenticated insert | Denied |
| Paid account above 50 | Allowed |
| Paid-to-Reader downgrade keeps all 52 fixture pages | Pass |
| Read and edit while over the Reader limit | Pass |
| Restore at/above 50, then restore after archiving below 50 | Denied, then allowed |
| Identical request replay | Original result returned once |
| Changed replay and stale revision | Denied |
| Unknown PRE week, non-PRE course, and missing enrollment | Denied |
| Cross-user customer read | Hidden |
| Direct customer write to server workbook metadata | Denied |
| Final owner/source/revision state | Exact |
| Synthetic fixture residue after rollback | 0 |

The first fixture attempt stopped on the known `psql` rule that variables are
not expanded inside dollar-quoted `DO` blocks. The migration had loaded, but no
fixture transaction committed. The harness was corrected to use
transaction-local settings, the idempotent migration was rerun, and the full
13-check story passed.

Windows reserves the normal local Supabase ports, so the repo config used local
5702x ports only during startup and was immediately restored.
`git diff --exit-code -- supabase/config.toml` passed. One failed startup used
the wrong CLI workdir and removed only its newly failed `supabase_db_supabase`
temporary volume; the retained `supabase_db_Digital-Grimoire` volume was listed,
started from backup, tested, stopped, and backed up again.

The Supabase CLI also made read-only linked-project health/version requests
while starting the local stack. It printed no credentials and performed no
remote SQL, migration, write, configuration change, or deployment.

## Application verification

- L1-03 focused tests: **7/7 passed**.
- L1-01 through L1-03 focused tests: **21/21 passed**.
- Local PostgreSQL acceptance checks: **13/13 passed**, with **0 residue**.
- Focused ESLint: **passed**.
- Global TypeScript: **passed**.
- Tracked diff and new-file whitespace checks: **passed**.
- Next.js production-style build: **passed**, **136/136 pages**, including
  `/api/courses/[id]/journal`.

The build used placeholder Supabase settings and made no database connection.
Existing warnings about middleware naming, Sentry naming, old browser-baseline
data, and placeholder fetch failures remain unrelated. A TypeScript command run
in parallel with the build briefly saw `.next/types` files while the build was
replacing them; the standalone post-build TypeScript rerun passed.

## Acceptance mapping

| Requirement | Evidence | Result |
|---|---|---|
| Authorized workbook save | Auth/email/PRE/enrollment/week route plus service-only atomic function | Pass |
| Course/week/source metadata and reload | Unique logical identity plus ordered full reload snapshot | Pass |
| Reader 50 active pages | Database trigger and both service/direct-write boundary tests | Pass |
| Paid unlimited | 52 active paid fixture pages including a PRE workbook page | Pass |
| Downgrade loses no work | All 52 pages remain readable; edits and archives work | Pass |
| Over-limit restore/create rule | Blocked at 50 or more; allowed after active count falls to 49 | Pass |
| Ownership and safe failure | RLS, strict parser, revision, replay, PRE/week/enrollment denials | Pass |

## Limits and next boundary

L1-03 supplies the server and database save/reload system. It does not connect
the V2 learner screen to saving/saved/error/retry states; that is L1-04. L1-05
still owns the final authenticated real-browser and new-session proof.

The migration has not been applied to production, the route has not been
deployed, and no production approval is active. Any later release needs a new
exact file-and-migration plan approved by Jen before a push, deploy, or live
database change.
