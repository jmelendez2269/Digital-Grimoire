# LEAN-L0-03 restricted backup and disposable restore evidence

**Evidence date:** August 10, 2026  
**Packet boundary:** `LEAN-L0-03` backup/restore prerequisite only  
**Production effect:** Logical export only. No application migration, application-schema/data DDL or DML, deployment, staging activation, Stripe change, or application configuration change occurred. Supabase's passwordless CLI flow initialized and used its platform-managed temporary database login role for the export.

## Result

The backup prerequisite for drafting and reviewing `LEAN-L0-03` is satisfied. Production execution remains separately approval-gated.

- Supabase CLI initialized and used its intended passwordless temporary login role through the linked production project; no application-owned role or authority was changed.
- The backup contains roles, the ordinary application schema, the explicitly requested managed `auth`/`storage` schemas, and data.
- Every retained file is non-empty, SHA-256 hashed, EFS encrypted, and stored outside the repository.
- A complete disposable restore succeeded using the exact production Supabase Postgres release.
- The restore container had networking disabled, published no host port, and was deleted after verification.

## Restricted artifact

| Item | Evidence |
|---|---|
| Logical location | `%LOCALAPPDATA%\Prismarium\RestrictedBackups\l0-03-20260810-182253` |
| Repository boundary | Outside `C:\Projects\Digital-Grimoire` |
| Access | Windows ACL restricted to the current Windows user and `SYSTEM` |
| Encryption | Windows EFS on the directory and every retained file |
| Owner | Current Windows user |
| Retention | Seven days; remove after August 17, 2026 unless a reviewed change/rollback window requires it temporarily |
| Total retained size | 262,723,418 bytes |

### File manifest

| File | Purpose | Bytes | SHA-256 |
|---|---|---:|---|
| `roles.sql` | Cluster/custom roles | 297 | `25873CEC56A2CC6514E204F420231777F85C03DA818CAA7090CDCDFA89776ECD` |
| `schema.sql` | Ordinary application schema | 268,555 | `DE2B9A6A9BB10BCE01BF2595FEDD27941B2329D241BF93DF69B2F18659F71A8F` |
| `managed-schema.sql` | Explicit production `auth` and `storage` definitions required by their dumped data | 94,921 | `9851B24FAC2EFC864B51243968274941BE7E640592CE6D986AB64AB68E2D1A83` |
| `data.sql` | Production logical data using `COPY` | 262,359,645 | `CE7A8168F21E5228A3421F1B642A0F3ADB7A5C398D5BE9ED91BED63BD4427CA0` |

The default Supabase schema dump omits platform-managed schemas, while the data export includes `auth` and `storage` rows. Their definitions were therefore exported explicitly so the managed data could be restored rather than discarded.

## Disposable restore

| Item | Evidence |
|---|---|
| Image | Cached `public.ecr.aws/supabase/postgres:17.6.1.021`, matching production `17.6.1.021` |
| Database authority | Image-local `supabase_admin` only |
| Network | Docker `none` |
| Published ports | None |
| Restore order | Roles; managed-schema reset; two production trigger-function dependencies; managed schemas; ordinary schema; data |
| Error behavior | `psql` `ON_ERROR_STOP=1` for every retained SQL file |
| Cleanup | Disposable container force-removed in a guaranteed cleanup block |

### Aggregate verification

No row values, identifiers, emails, prompts, filenames, or other customer payloads were emitted.

| Aggregate | Restored result |
|---|---:|
| Non-system schemas | 5 |
| Tables | 101 |
| Non-empty tables | 50 |
| Total rows | 64,990 |
| `public` tables / rows | 68 / 61,914 |
| `auth` tables / rows | 23 / 2,978 |
| `storage` tables / rows | 8 / 2 |

## Interpretation and limits

This proves the retained logical files can reconstruct the production roles, definitions, and dumped rows in an isolated database. It clears the restore-tested-backup prerequisite for local `LEAN-L0-03` migration drafting and review.

It does **not** authorize the production permission migration, deploy application code, reactivate staging, or replace a durable off-device backup program. EFS recovery on another computer also requires the Windows EFS certificate; this seven-day artifact is an immediate change-safety backup, not the long-term disaster-recovery design.
