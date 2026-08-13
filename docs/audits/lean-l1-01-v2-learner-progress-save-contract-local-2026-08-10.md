# LEAN-L1-01 local verification — V2 learner progress and week-save contract

**Date:** August 10, 2026  
**Packet:** `LEAN-L1-01`  
**Result:** Passed locally  
**Production effect:** None

## Outcome

One normative server-only TypeScript contract now defines the V2 learner progress and week-save boundary. A plain-language companion explains the same rules without creating a second source of authority.

The contract:

- uses the exact PRE slug as the sole server-owned free-course allowlist entry;
- treats database publication as preview/content state, never save/access authority;
- separates the stable slug, server-resolved database UUID, and editorial `PRE` tag;
- validates positive course-owned week numbers and stable lowercase source keys;
- defines resumable week/stage progress without inventing course completion;
- defines Journal course/week/source metadata, revisions, and request replay behavior;
- requires a server-verified, email-confirmed user with an owned enrollment;
- names stable failure codes and safe retry rules;
- makes a non-cacheable server snapshot authoritative after refresh/new session while preserving newer unsaved browser input;
- explicitly excludes billing effects, retained completed-course access, slot release, certificates, and a generalized completion lifecycle.

## Files

| File | Purpose |
|---|---|
| `app/src/lib/courses/learner-save-contract.server.ts` | Normative constants, types, semantics, allowlist, and identifier validators |
| `app/tests/learner-save-contract.test.ts` | Runtime and source-boundary regression tests |
| `docs/planning/lean-l1-01-v2-learner-progress-save-contract.md` | Plain-language implementation guide tied to the normative source |

## Existing-system findings

- The current `/api/reading-progress` endpoint stores text-level state and is not the new V2 course progress contract.
- Existing course access helpers can guess “free” from titles, tags, or slug prefixes. L1-02/L1-03 must use the exact new PRE authority for learner persistence instead of those guesses.
- Some current course fetch/list paths mix `is_published` with presentation. The new contract forbids using publication as persistence/access authority.
- The old learner page has partial reading/Journal behavior, while the V2 renderer does not yet implement durable progress/workbook reload. That implementation remains correctly assigned to L1-02 through L1-04.
- Journal workbook columns appear in noncanonical/secondary migration trees. L1-03 must reconcile the canonical database shape forward rather than assume those files represent production.

No existing route, database table, migration, environment variable, Stripe object, Vercel deployment, or production record was changed by this packet.

## Verification

Run from `app/`:

```powershell
npx.cmd tsx --conditions=react-server --test tests/learner-save-contract.test.ts
npx.cmd tsc --noEmit --pretty false
```

Run from the repository root:

```powershell
git diff --check -- app/src/lib/courses/learner-save-contract.server.ts app/tests/learner-save-contract.test.ts docs/planning/lean-l1-01-v2-learner-progress-save-contract.md
```

Results:

- Contract tests: **8/8 passed**, 0 failed, 0 skipped.
- Global TypeScript check: **passed**.
- Diff/whitespace check: **passed**.

## Acceptance mapping

| Requirement | Evidence | Result |
|---|---|---|
| Course/week identifiers | Typed identities, week validator, sections 1–2 | Pass |
| Progress semantics | `LearnerProgressStateV1`, progress command, section 3 | Pass |
| Week-save semantics and Journal metadata | Week command/state, section 4 | Pass |
| Authorization | Exact server-only PRE allowlist and ordered server checks | Pass |
| Errors | Stable typed codes and HTTP/retry table | Pass |
| Reload behavior | Typed snapshot and section 6 | Pass |
| Publication never grants access | Machine-readable false rule plus test | Pass |
| Explicit exclusions | Typed exclusion tuple, prose, and test | Pass |

## Next boundary

`LEAN-L1-02` may now implement the server progress endpoint and forward-only RLS/schema support. It is local work until a later production proposal is reviewed. This L1-01 result does not authorize a production database or deployment change.

