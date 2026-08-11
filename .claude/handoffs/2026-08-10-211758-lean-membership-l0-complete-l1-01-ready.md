# Handoff: Lean membership Phase L0 complete; L1-01 ready for local work

## Session Metadata
- Created: 2026-08-10 21:17:58 America/New_York
- Project: C:\Projects\Digital-Grimoire
- Working branch: `develop` (dirty with unrelated course work that must be preserved)
- Clean production clone: `C:\tmp\Digital-Grimoire-main-prod`
- Production branch/commit: `main` at `11ef501`
- Milestone interval: approximately 1 hour 25 minutes

## Handoff Chain

- **Continues from**: [2026-08-10-195456-lean-membership-l0-03-complete-l0-05-in-progress.md](./2026-08-10-195456-lean-membership-l0-03-complete-l0-05-in-progress.md)
- **Supersedes**: that handoff's L0-05-ready state; keep it for historical detail

## Current State Summary

Lean Membership Phase L0 is complete. The L0-03 database permission repair was committed as `179f270`, deployed, migrated with only the named migration, and verified against the production database. The L0-05 containment was committed as `11ef501`, pushed only after the user's exact approval, deployed successfully, and verified without changing production environment variables, Stripe, course data, or the database. The score is now **14/114 points (12.3%)**, with **Phase L0 at 14/14**. No further production authorization is active. The next packet is L1-01, a local-only typed contract for learner progress and week saves, worth 3 points; completing it would bring the score to 17/114 (14.9%).

## Codebase Understanding

## Architecture Overview

- The Next.js application lives under `app/` and deploys through Vercel.
- Supabase PostgreSQL migrations live in `supabase/migrations/`; production migration work must use the exact reviewed file, not a broad database push.
- Server-only write authority is enforced through database grants, RLS, fixed function search paths, and the server service role.
- Stale commercial/provider routes now share a default-closed availability policy. An action is available only when its exact ID appears in the production allowlist; checkout additionally requires an allowed Stripe price ID.
- Production middleware requires authentication before the contained routes execute, so anonymous production checks observe a safe `401` outer wall. The inner kill switch was verified by deployed source, absent enabling variable names, and local runtime/source-order tests.

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `docs/planning/prismarium-membership-implementation-tracker.md` | Membership scorecard and packet acceptance criteria | Source of truth: L0 complete at 14/114; L1-01 is next |
| `docs/audits/lean-l0-03-production-verification-2026-08-10.md` | L0-03 production evidence | Records database before/after catalog results |
| `docs/audits/lean-l0-05-production-runbook-2026-08-10.md` | Approved L0-05 execution sequence | Now marked executed successfully |
| `docs/audits/lean-l0-05-production-verification-2026-08-10.md` | L0-05 production evidence | Records deployment, HTTP, containment, and error checks |
| `supabase/migrations/20260810210000_lean_l0_03_permission_hotfix.sql` | Exact permission repair | Already applied and recorded in production |
| `app/src/lib/commercial-availability-policy.ts` | Pure containment policy | Exact-action and checkout-price decision logic |
| `app/src/lib/commercial-availability.ts` | Server environment adapter | Reads allowlist variable names and returns safe unavailable responses |
| `app/tests/commercial-availability.test.ts` | Containment regression tests | Eight kill-switch/allowlist tests |
| `app/tests/permission-server-authority.test.ts` | L0-03 authority tests | Three database authority contract tests |

## Key Patterns Discovered

- Production changes are prepared in a clean clone so the user's unrelated dirty course work on `develop` is never swept into a production commit.
- Exact production approval applies only to the named packet and named file scope; it does not carry forward to later packets.
- A Vercel `Ready` status is necessary but not sufficient: verify domain aliases, core HTTP routes, error logs, and packet-specific behavior.
- For safe production containment, layered evidence is acceptable when directly reaching an inner route would require creating credentials or bypassing authentication.
- Explain unfamiliar technical terms at a middle/high-school level and phrase production approval as a clear yes/no choice with the exact effect and risk.

## Work Completed

## Tasks Finished

- [x] Deployed and verified L0-03 after exact approval.
- [x] Reduced unsafe API table permission pairs from 22 to 0 and API-executable protected functions from 7 to 0.
- [x] Verified 7 protected RLS tables, 7 read policies, 14 shared read grants, 7 service-executable functions, 7 fixed search paths, and valid service table authority.
- [x] Prepared and locally tested the exact L0-05 20-file containment scope: 11/11 tests, TypeScript, 136/136 production-style pages, and `git diff --check` passed.
- [x] Confirmed both L0-05 enabling production variable names were absent without reading or changing their values.
- [x] Deployed L0-05 only after exact approval and verified the deployment, both domains, four core HTTP routes, the 16-route anonymous auth wall, L0-03 database regressions, and zero error-level/HTTP-500 deployment log entries.
- [x] Updated the runbook, production evidence, tracker, and milestone memory.

## Files Modified

| File/group | Changes | Rationale |
|------------|---------|-----------|
| `app/.env.example` | Documented commercial action and checkout price allowlists | Makes the default-closed configuration explicit |
| `app/src/lib/commercial-availability-policy.ts` and `commercial-availability.ts` | Added pure policy and server adapter | One auditable gate for stale commercial/provider actions |
| `app/tests/commercial-availability.test.ts` | Added eight containment tests | Proves default denial and exact allowlisting locally |
| Stripe create-checkout and sync routes | Added containment guards | Prevents stale billing actions by default |
| Working generate; Parallax query/lens/AI search; GPT, Claude, and Gemini routes | Added containment guards | Prevents stale provider work by default |
| Tarot, cover, chapter-name, metadata, document/media processing, and sacred-text import routes | Added containment guards | Completes the approved 16-route guard scope |
| `docs/audits/lean-l0-05-production-runbook-2026-08-10.md` | Marked the approved sequence executed | Keeps planned and actual production work aligned |
| `docs/audits/lean-l0-05-production-verification-2026-08-10.md` | Added production evidence | Preserves auditable proof and the auth-layer limitation |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Closed L0 and advanced score to 14/114 | Makes L1-01 the next packet |

The 20 application files were committed from the clean production clone as `11ef501`. Do not copy or clean unrelated files from the dirty `develop` working tree.

## Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Deploy L0-03 with only the named SQL migration | Broad `supabase db push` vs exact file | Exact execution avoids unrelated migration drift |
| Keep L0-05 default-closed | Automatically revive routes vs explicit action allowlist | Safest containment until a later packet intentionally re-enables an action |
| Accept layered proof for inner `503` behavior | Create a production test account/bypass auth vs combine safe evidence | Avoided expanding authorization or altering production identity state |
| Start L1-01 locally with no production action | Treat earlier approval as ongoing vs packet-specific permission | User approval was only for L0-05 |

## Pending Work

## Immediate Next Steps

1. Inspect the existing learner progress, enrollment, course/week identifier, Journal, and reload behavior code without changing production.
2. Write the L1-01 documented typed contract. It must define course/week IDs, progress and week-save semantics, Journal metadata, authorization, errors, reload behavior, and a server-owned free-course allowlist whose sole entry is PRE.
3. Explicitly exclude billing effects, retained completed-course access, slot release, certificates, and a generalized completion lifecycle; validate the contract and update the tracker only when every acceptance item is covered.

## Blockers/Open Questions

- [ ] No blocker for local L1-01 discovery and contract work.
- [ ] Any later production deployment or mutation requires a fresh, exact yes/no approval from the user.

## Deferred Items

- Re-enabling any contained commercial/provider action is deferred to a separately reviewed packet and must include the exact action ID and, for checkout, exact allowed price IDs.
- Authenticated production observation of the inner `503` was intentionally deferred because it would require credentials or production identity changes outside the approved scope.
- Billing, retained access after completion, membership slot release, certificates, and generalized completion workflows are outside L1-01.

## Context for Resuming Agent

## Important Context

- Speak to the user like a thoughtful middle/high-school teacher: short sentences, define unfamiliar terms, explain risk plainly, and use simple yes/no approval questions for production.
- **There is no active production authorization now.** L0-03 and L0-05 approvals were exact, used, and exhausted.
- Current score: **14/114 (12.3%)**. Phase L0: **14/14 complete**. L1-01 is worth 3 points; if fully accepted, the total becomes **17/114 (14.9%)**.
- L0-03 production commit/deployment: `179f270`, Vercel deployment `dpl_DjhKbo1TiLWPtST7w32M3FJkP7tA`.
- L0-05 production commit/deployment: `11ef501`, Vercel deployment `dpl_Gd4NfN31M8MeapCQFQmYgnibRXr8`.
- L0-05's anonymous 16-route matrix returned safe `401` responses from middleware. Do not claim an authenticated production `503` was directly observed. The inner gate is established by deployed source, absent enabling variable names, and 11/11 exact local tests.
- Preserve all unrelated course work on `develop`. Use the clean clone or an exact path list for any future release work.
- The production database backup must be retained through 2026-08-17.

## Assumptions Made

- PRE is the planned sole entry in L1-01's server-owned free-course allowlist, as stated in the tracker acceptance criterion.
- L1-01 is a contract/design packet and can be completed locally without production writes.
- The user wants work to continue automatically when it is safe and local, with a stop for explicit approval before production.

## Potential Gotchas

- Do not run a broad `supabase db push`; the linked migration history previously had unrelated drift.
- Run `npx supabase migration list --linked` from the repository root. The attempted CLI workdir form did not behave correctly.
- A production `401` on guarded routes proves the outer authentication wall, not the route's inner `503` response.
- Do not inspect production environment values. Only variable names were needed for L0-05 and neither enabling name existed.
- Do not revive old L0-02 fixtures, create a production user, alter Stripe, modify production environment variables, or touch course data without a new scoped approval.

## Environment State

## Tools/Services Used

- Git clean clone for scoped commits and pushes.
- Vercel CLI for deployment status, aliases, build logs, and error scans.
- Supabase CLI for the exact L0-03 SQL execution, migration record, and read-only catalog checks.
- Node test runner, TypeScript compiler, and Next.js build for local verification.
- Agent browser was checked for an existing authenticated session; none existed, and it was closed.

## Active Processes

- None. The browser session is closed and local Docker/Supabase services are stopped.

## Environment Variables

- `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS` — absent from production at verification time.
- `PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS` — absent from production at verification time.
- Do not record or expose any environment variable values.

## Related Resources

- [Membership implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [L0-03 production verification](../../docs/audits/lean-l0-03-production-verification-2026-08-10.md)
- [L0-05 production runbook](../../docs/audits/lean-l0-05-production-runbook-2026-08-10.md)
- [L0-05 production verification](../../docs/audits/lean-l0-05-production-verification-2026-08-10.md)
- [Previous handoff](./2026-08-10-195456-lean-membership-l0-03-complete-l0-05-in-progress.md)

---

**Security Reminder**: Validate this file for completeness and accidental secret exposure before relying on it.
