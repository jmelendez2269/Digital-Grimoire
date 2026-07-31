# Staging SQL integration tests

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
