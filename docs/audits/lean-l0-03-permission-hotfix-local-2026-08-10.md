# LEAN-L0-03 permission and server-authority hotfix — local evidence

**Evidence date:** August 10, 2026

**Packet state:** `verifying` — local implementation and reversal rehearsal pass; production execution requires Jen's separate explicit approval

**Production effect:** None. No production/staging connection, migration, deployment, Stripe change, Vercel change, or environment change occurred.

## Result

The forward-only permission repair and the paired server-authority changes pass locally. The accepted L0-02 authorization suite moves from **11 secure passes / 37 security failures** to **48 secure passes / 0 security failures**, with **0 inconclusive probes** and **0 fixture residue**.

The guarded emergency reversal was also rehearsed locally. It reproduced the accepted insecure baseline exactly at **11 / 37**, after which the forward SQL was reapplied and restored **48 / 0**. The local database finished in the secure forward state.

This evidence does not claim that production is repaired. L0-03 remains unearned at **8 / 114 total program points** until the separately approved production step and its required evidence are complete.

## Forward migration

`supabase/migrations/20260810210000_lean_l0_03_permission_hotfix.sql`:

- revokes API-role mutation privileges from `users`, `course_enrollments`, `api_usage`, and `search_cache`;
- removes customer update/enrollment/cache/usage policies that granted server-owned authority;
- enables RLS on the seven previously exposed shared reference tables, revokes their API-role mutations, and preserves explicit anonymous/authenticated reads;
- revokes `PUBLIC`, `anon`, and `authenticated` execution from the five aggregate/indexing definer RPCs and the two auth trigger functions when present;
- preserves `service_role` execution and gives those definer functions a fixed `pg_catalog, public` search path; and
- leaves deliberately public/service-only RPCs, including course-poll and course-graph functions, unchanged.

The migration is idempotent enough for the local forward-restoration rehearsal but exists only once in the canonical migration chain. The unrelated August 10 course-reading migrations were neither edited nor applied during this test.

## Server-authority paths

Authoritative writes now authenticate the request with the user/session client and persist through the server-only service client:

- Checkout Stripe-customer projection;
- Stripe subscription sync and webhook projection;
- shared Deep Search cache writes;
- authoritative API usage writes;
- server-owned embedding/indexing work, including `get_indexed_text_ids()`;
- validated TTS preference persistence; and
- existing enrollment creation/progress reads, which were already split between request authentication and service-owned mutation.

The L0-04 default-closed action and Checkout Price guards remain in place and passed their regression suite.

## Local SQL evidence

Command from `app/`:

```powershell
npm.cmd run test:permission-hotfix:local
```

| Gate | Result |
|---|---:|
| Forward L0-02 authorization probes | 48 secure / 0 failures / 0 inconclusive |
| Protected table catalog checks | 11 |
| Newly RLS-protected shared tables | 7 |
| Protected definer functions present in the canonical local schema | 6 |
| Service-owned mutation smoke paths | 4 |
| Auth-trigger profile creation | Pass |
| Shared reference reads | Pass |
| Forward fixture residue | 0 |
| Reversal L0-02 reproduction | 11 secure / 37 failures / 0 inconclusive |
| Reversal fixture residue | 0 |
| Forward restoration | 48 secure / 0 failures / 0 inconclusive |
| Restoration fixture residue | 0 |
| Final runner result | `LEAN-L0-03_LOCAL_RESULT: PASS` |

The local canonical schema contains six of the seven production-exposed named definer functions; `handle_user_update()` exists in the deployed/secondary migration evidence but not in this local canonical ledger. The forward migration discovers and secures it when present without inventing it when absent.

## Application verification

| Check | Result |
|---|---:|
| `npm.cmd run test:permission-server-authority` | 3 / 3 pass |
| `npm.cmd run test:commercial-availability` | 8 / 8 pass |
| `npx.cmd tsc --noEmit` | Pass |
| `npm.cmd run build` | Pass; 136 / 136 static pages generated |

A focused ESLint invocation completed with 17 existing `no-explicit-any` errors and four existing unused-variable warnings in legacy Stripe, usage-tracker, TTS, and embedding code. The new authority test and the newly added service-client lines introduced no reported lint item. TypeScript and the production build pass; the legacy lint debt was not expanded into this security packet.

## Reversal

`supabase/snippets/lean_l0_03_permission_hotfix_rollback.sql` is intentionally outside `supabase/migrations`. It requires both an explicit target and the exact `REVERSE-LEAN-L0-03` confirmation. It restores the known-insecure authority model and therefore exists only for a separately approved emergency rollback; a forward repair is preferred.

The local runner proves that the reversal is executable and that the forward SQL can restore the secure state. This is not authorization to run either file against production.

## Local environment and cleanup

- Docker Desktop was started only for this requested local test.
- A database-only Supabase stack was used; no API, Auth service, Studio, storage, or analytics service was required.
- Windows rejected the repository's ordinary local DB port, so the local test temporarily used port `15432`.
- The local ledger stopped before the two unrelated August 10 course-reading migrations. They were deliberately not applied.
- No production URL, credential, customer row, backup content, or fixture identifier is recorded here.

## Production gate

Do not apply L0-03 to production until Jen explicitly approves the exact reviewed production action. Before requesting that approval, review the final SQL diff, confirm the backup retention window remains valid, name the exact production command, and define the post-change catalog/advisor/smoke checks. L0-05 deployment and deployed-environment verification remain separate.
