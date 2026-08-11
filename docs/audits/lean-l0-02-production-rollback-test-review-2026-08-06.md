# LEAN-L0-02 retired production rollback proposal

**Prepared:** August 6, 2026  
**Execution status:** Retired — do not retry  
**Controlling decision:** Jen accepted L0-02 from production catalog evidence plus the rollback-only local runtime suite. No staging or production adversarial probe is required.

## Retirement decision

This proposal is retained only as an audit record. It is not pending work, has
no active approval phrase, and must not be converted to another production
runner. The local production runner was deleted and the SQL suite again refuses
all targets except `local` and `staging`.

## Approved attempt result

Jen supplied the exact approval phrase. The wrapper verified that the linked
project, declared production URL, and cached session-pooler project identity all
matched without printing those identifiers. The direct endpoint was IPv6-only
and unreachable, so the official IPv4 session-pooler endpoint was selected.

The `psql` connection was rejected with password authentication failure before
the server accepted a session. Therefore:

- no SQL statement ran;
- `BEGIN` was never reached;
- no fixture or temporary object was created;
- no production row was read or mutated by the L0-02 attempt; and
- the wrapper did not retry or fall back to another credential.

Docker was used only for the ephemeral cached `psql` client and was shut down
after the rejection. Both the wrapper and SQL production branches were then
disabled. The credential failure is not a development blocker and does not need
to be corrected for L0-02 or L0-04.

## Purpose

Finish the adversarial authorization baseline against the exact deployed
database without retaining test data or touching a real customer. This packet
does not repair permissions, call application routes, invoke paid providers, or
change Stripe/Vercel configuration.

## Exact production activity proposed

One database-owner connection will execute the already locally validated
authorization suite with these additional production guards:

1. Confirm the repository's linked Supabase project matches the declared
   production Supabase URL without printing either project reference.
2. Require both `prismarium_target=production` and the exact approval phrase
   above. Missing or mismatched approval stops before `BEGIN`.
3. Set short transaction-local lock and statement timeouts and take the
   LEAN-L0-02 advisory lock.
4. Start one explicit transaction.
5. Create two random `example.invalid` Auth users plus only the synthetic rows
   required by the probes.
6. Switch to the real `authenticated` and `anon` database roles and exercise:
   protected own-user fields, the other synthetic account, enrollment/progress,
   shared cache, usage/provider/pre-credit surfaces, seven RLS-disabled tables,
   protected course columns, and relevant `SECURITY DEFINER` functions.
7. Record only category, operation, allowed/denied, row count, and SQLSTATE.
   UUIDs, emails, tokens, existing rows, and returned customer data are not
   printed.
8. Execute unconditional `ROLLBACK`.
9. In the same connection, query every generated fixture identifier and require
   `cleanup_residue = 0`.

Every mutating statement targets a generated fixture ID. The cross-account
tests use only the two generated users. No existing customer ID is selected,
updated, or deleted. Connection loss before the explicit rollback also causes
Postgres to roll back the open transaction.

## Expected temporary rows

- Two `auth.users` rows and their triggered `public.users` profiles.
- One synthetic course, text, and course-text association.
- At most one enrollment, cache, API-usage, provider-usage, and cover-job row.
- Synthetic rows across the seven known RLS-disabled taxonomy/knowledge tables.
- Transaction-local temporary context/results objects.

All are created after `BEGIN` and must disappear on `ROLLBACK`.

## Abort conditions

The run stops without retrying or repairing if:

- the linked/deployed target comparison is not exact;
- the approval phrase is missing;
- any prerequisite table/function differs from the accepted preflight;
- an unexpected SQL error makes a probe inconclusive;
- the connection cannot preserve one session for the entire transaction; or
- post-rollback cleanup is not exactly zero.

If cleanup is nonzero, no further packet work begins; the exact synthetic IDs
remain held only in process memory for owner-level cleanup and incident review.

## Final disposition

The proposed production path is permanently closed. L0-02 is accepted from the
combined evidence documented in
`docs/audits/lean-l0-02-authorization-baseline-2026-08-06.md`. Future agents must
not reset the database password, restore staging, create a Management API
variant, or request another production authorization probe for this packet.
