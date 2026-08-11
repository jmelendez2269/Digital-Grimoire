# Staging SQL integration tests

## LEAN-L0-02 authorization baseline

`lean-l0-02-authorization-baseline.sql` captures the current customer-role
authorization baseline without repairing it. The suite creates two synthetic
non-admin users and all dependent rows inside one transaction, switches to the
real `authenticated`/`anon` database roles, records secure expectations versus
observed behavior, rolls back, and verifies zero fixture residue.

Run the harness against the isolated local Supabase stack from `app/`:

```powershell
npm.cmd run test:authorization-baseline:local
```

Local results validate the harness only when the local migration ledger differs
from the deployed ledger. They are not production evidence.

## LEAN-L1-03 learner workbook Journal saves

After starting the isolated local Supabase stack, run the forward-only Journal
migration and its rollback-only fixture story from `app/`:

```powershell
npm.cmd run test:learner-journal:local
npm.cmd run test:membership-billing-schema:local
```

The runner accepts only `local`, finds exactly one local Supabase database
container, and never accepts a database URL. It proves PRE ownership, week and
source identity, revision/replay behavior, owner-only reload visibility, the
50-active-page Reader boundary, paid unlimited pages, and the no-loss downgrade
rule. Its synthetic users, enrollments, courses, pages, and request rows roll
back, followed by a zero-residue check.

## LEAN-L0-03 permission hotfix

After the local migration stack includes
`20260810210000_lean_l0_03_permission_hotfix.sql`, run the complete forward,
reversal, and forward-restoration check from `app/`:

```powershell
npm.cmd run test:permission-hotfix:local
```

The runner is local-only. It requires exactly one running local Supabase
database container and never accepts a database URL. It proves:

- all 48 L0-02 probes change from 11 secure passes / 37 failures to 48 / 0;
- protected API-role table mutations and unintended definer-function execution
  are absent;
- shared reference reads, auth-trigger profile creation, and service-owned
  profile/enrollment/cache/usage writes still work;
- the reviewed reversal reproduces the 11 / 37 baseline locally;
- reapplying the forward SQL restores 48 / 0; and
- every fixture transaction leaves zero residue.

The reversal snippet is not part of the migration chain. Its production guard
exists for a separately approved emergency only; this runner supplies only the
`local` target.

For a live staging database that is confirmed distinct from production, use a
database-owner connection and the explicit staging guard:

```powershell
psql.exe "$env:PRISMARIUM_STAGING_DATABASE_URL" `
  --set=ON_ERROR_STOP=1 `
  --set=prismarium_target=staging `
  --file=app/tests/sql/lean-l0-02-authorization-baseline.sql
```

Never pass a production database URL. The SQL refuses targets other than
`local` and `staging`, suppresses raw error messages, prints no fixture IDs or
emails, and ends with `cleanup_residue = 0` when rollback succeeds.

## Course-path ballot

`course-path-polls.staging.sql` exercises the real PostgreSQL functions added by
`20260730000200_add_course_path_polls.sql`. It is intentionally a staging-only,
rollback-only test.

Run it from the repository root with a direct **staging database owner**
connection:

```powershell
psql.exe "$env:PRISMARIUM_STAGING_DATABASE_URL" `
  --set=ON_ERROR_STOP=1 `
  --set=prismarium_target=staging `
  --file=app/tests/sql/course-path-polls.staging.sql
```

Safeguards:

- The script refuses to start unless `prismarium_target` is exactly `staging`.
- It takes a transaction-scoped advisory lock and refuses to disturb an
  already-open staging ballot.
- All users, polls, votes, rate buckets, and any missing course fixtures are
  created inside one transaction.
- Existing PRE/C01/FD01 rows may have `is_published` changed temporarily to
  exercise publication gates; the final `ROLLBACK` restores their prior state.
- `ON_ERROR_STOP` makes psql exit on a failed assertion. Closing that connection
  rolls back the still-open transaction.
- The test never imports a course, promotes graph data, changes an enrollment,
  opens a production ballot, or deploys anything.

Use the database-owner connection because the test must seed transaction-local
fixtures, inspect ACLs, and temporarily switch to `anon`, `authenticated`, and
`service_role`. Do not provide a production database URL.

Coverage includes:

- service-only table/function privileges and RLS;
- admin authorization;
- exactly two distinct, published C01/FD01 options;
- the published PRE launch gate;
- open-ballot fail-closed behavior if PRE, C01, or FD01 is unpublished;
- live-result hiding before a browser votes;
- one mutable vote per browser;
- cross-poll rejection with its committed rate counter and safe sentinel;
- option locking after open;
- voter and network rate-limit rollback behavior;
- manual close, final totals, leader and tie outcomes;
- a separate editorial decision that may differ from the audience result;
- archived ballots remaining public as normalized closed results; and
- confirmation that polling never mutates course content/access/release fields.

Limitations:

- A single psql session cannot create a true simultaneous race. The test
  validates the atomic upsert paths, uniqueness constraints, and rollback of a
  rejected rate-limited call, while concurrent voting still belongs in a
  dedicated multi-connection load test.
- Cookie flags, HMAC generation, Server Action request handling, and homepage
  failure isolation are application concerns covered by the TypeScript/browser
  suites, not by this SQL test.
- The explicit `prismarium_target=staging` marker is an intentional operator
  guard, not cryptographic proof of database identity. The operator must supply
  only the staging URL.
