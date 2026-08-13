# LEAN-L0-02 adversarial authorization baseline

**Date:** August 6, 2026  
**Status:** Accepted — combined production catalog and rollback-only local runtime evidence  
**Scope:** Baseline evidence only. No permission repair, route closure, production mutation, Stripe mutation, or real-customer probe.

## Outcome

A reusable, privacy-safe authorization suite now exercises the required
customer boundaries with two synthetic non-admin users. The suite ran against
the isolated local Supabase stack and completed **48 probes: 11 secure passes,
37 security failures, 0 inconclusive**, followed by **`cleanup_residue = 0`**.

These results validate the harness and reproduce the unsafe patterns already
confirmed in the accepted production catalog. The local database has 54 public
tables and 7 `SECURITY DEFINER` functions, while the production preflight found
68 and 17 respectively, so local output is not represented as a deployed-schema
runtime test. Jen accepted the combined evidence as sufficient for L0-02 on
August 6, 2026; no further staging or production adversarial probe is required.

## Target decision and safety checks

| Candidate | Check | Disposition |
|---|---|---|
| Configured staging profile | URL and anon/service credentials are distinct from both the declared production project and default app profile | Correctly separated, but unavailable |
| Configured staging project | Read-only account lookup lists it as `INACTIVE`; Jen intentionally shut it off | Leave it off; L0-02 does not require staging |
| Local Supabase | Docker-backed stack on loopback; 13/13 required table surfaces present; seven expected tables have RLS disabled | Safe for harness validation only |
| Production | Catalog evidence is accepted; the one approved connection attempt failed before SQL execution | Do not retry adversarial production probing |

Docker Desktop was started for the local path, then the project-only Supabase
containers were stopped with their local volume preserved and Docker Desktop
was shut down. No staging or production row, Auth user, policy, grant, function,
Stripe object, Vercel setting, or deployment was changed.

## Fixture lifecycle

The SQL suite:

1. Refuses any `prismarium_target` other than `local` or `staging`.
2. Starts one transaction and takes a transaction-scoped advisory lock.
3. Creates two random `example.invalid` Auth users and synthetic dependent rows.
4. Switches to the actual `authenticated` and `anon` PostgreSQL roles with a
   synthetic JWT subject.
5. Records only surface names, operations, row counts, SQLSTATE categories, and
   pass/fail status. It suppresses raw errors, UUIDs, emails, and payloads.
6. Rolls the entire transaction back.
7. Checks every fixture surface after rollback and reports
   **`cleanup_residue = 0`**.

The first development run exposed disposable UUIDs in console setup output and
contained two invalid fixture values. Neither run persisted data. Both issues
were corrected before evidence was accepted; the final run printed no fixture
identifiers and had zero inconclusive probes.

## Local harness results

| Category | Probes | Secure passes | Security failures | Result |
|---|---:|---:|---:|---|
| Cross-account profile access | 2 | 2 | 0 | Fixture A could neither read nor update fixture B |
| Enrollment/access/progress authority | 2 | 0 | 2 | Customer could self-enroll with forged completion/progress and rewrite it |
| Shared search cache | 1 | 0 | 1 | Customer could insert a shared synthetic cache result |
| Usage/provider authority | 2 | 2 | 0 | Direct writes were rejected locally |
| Pre-credit job authority | 1 | 1 | 0 | Non-admin cover-job credit write was rejected |
| Course curriculum boundary | 4 | 4 | 0 | Preview columns were readable; `courses.content` and `course_texts.details` were denied |
| Seven RLS-disabled tables | 7 | 0 | 7 | Customer inserts succeeded on every named table |
| Actual read-only definer RPC calls | 10 | 0 | 10 | Five aggregate/index RPCs executed as both authenticated and anonymous roles |
| Own protected `users` fields | 5 | 0 | 5 | Tokens, tier, Stripe references, subscription dates, and role were writable |
| `SECURITY DEFINER` EXECUTE grants | 14 | 2 | 12 | Six of seven local definer functions were executable by both API roles; the graph import function was denied |
| **Total** | **48** | **11** | **37** | **0 inconclusive; 0 fixture residue** |

### Important usage-policy nuance

The local `api_usage` insert policy remains permissive, but the real
authenticated insert was rejected because its non-definer summary trigger then
attempted a write the customer role could not perform. That is effective denial
in this local runtime, not a sound authority boundary. L0-03 repair verification
must preserve this distinction between policy exposure and end-to-end behavior.

## Files and command

- Suite: `app/tests/sql/lean-l0-02-authorization-baseline.sql`
- Local-only runner: `app/scripts/run-lean-l0-02-baseline.ps1`
- Operator guidance: `app/tests/sql/README.md`
- Package command: `npm.cmd run test:authorization-baseline:local` from `app/`

Final local execution evidence:

```text
target=local
probes=48
secure_passes=11
security_failures=37
inconclusive=0
cleanup_residue=0
```

## Acceptance decision

Jen accepted L0-02 from two complementary evidence sources:

1. The accepted L0-01 production catalog proves the deployed policies, grants,
   RLS-disabled tables, protected-column grants, and executable definer surface.
2. The rollback-only local suite proves the customer-role harness and reproduces
   the material unsafe behaviors with 48 conclusive probes and zero residue.

The proposed production rollback test added risk and operational complexity
without changing the known repair scope. It is permanently retired and must not
be retried. Its rejected pre-SQL connection attempt remains documented only as
historical evidence in
`docs/audits/lean-l0-02-production-rollback-test-review-2026-08-06.md`.

L0-02 is `done` for 2 points. L0-03 remains independently gated from production
by the restore-tested backup requirement; L0-04 is the next execution packet.
