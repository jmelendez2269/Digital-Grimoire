# LEAN-L0-05 production containment and verification runbook

**Prepared:** August 10, 2026  
**Status:** Executed successfully after Jen's exact approval  
**Production effect:** Default-closed containment is live  
**Packet value:** 3 points; completion would move progress from 11/114 (9.6%) to 14/114 (12.3%)

## Plain-language purpose

L0-03 locked the database doors. L0-05 now verifies the complete safety story
and deploys L0-04's application switches. These switches make old Checkout and
unmetered paid-provider routes answer "temporarily unavailable" until later
billing and credit packets deliberately reopen one exact action at a time.

This does not shut down ordinary reading, courses, Library browsing, Journal,
community pages, account access, or deterministic non-provider tools. The
explicit non-AI sacred-text import path remains available.

## Pre-deployment evidence

- Clean local branch: `agent/l0-05-containment`, based on production commit
  `179f270`.
- Exact scope: 20 files; no course file or migration is present.
- Candidate file contents match the already-reviewed L0-04 local versions after
  normalizing Windows line endings.
- 8/8 commercial-containment tests pass.
- 3/3 L0-03 server-authority regression tests pass in the same candidate.
- Global TypeScript passes.
- The production-style build passes with 136/136 pages using fake localhost and
  build-only placeholders, not real secrets.
- Diff checks pass.
- Production environment-variable names were inspected without reading values.
  `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS` and
  `PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS` are absent, so every contained action
  will default closed after deployment.

## Exact 20-file package

### Shared policy, example, and test

1. `app/.env.example`
2. `app/src/lib/commercial-availability-policy.ts`
3. `app/src/lib/commercial-availability.ts`
4. `app/tests/commercial-availability.test.ts`

### Guarded routes

5. `app/src/app/api/stripe/create-checkout-session/route.ts`
6. `app/src/app/api/stripe/sync-subscription/route.ts`
7. `app/src/app/api/working/generate/route.ts`
8. `app/src/app/api/parallax/query/route.ts`
9. `app/src/app/api/parallax/lens/[lensId]/route.ts`
10. `app/src/app/api/parallax/ai-search/route.ts`
11. `app/src/app/api/ai/gpt/route.ts`
12. `app/src/app/api/ai/claude/route.ts`
13. `app/src/app/api/ai/gemini/route.ts`
14. `app/src/app/api/practitioner/tarot/generate/route.ts`
15. `app/src/app/api/covers/generate/route.ts`
16. `app/src/app/api/chapters/generate-names/route.ts`
17. `app/src/app/api/metadata/extract/route.ts`
18. `app/src/app/api/process-document/route.ts`
19. `app/src/app/api/process-media/route.ts`
20. `app/src/app/api/import-sacred-text/route.ts`

## Approved execution sequence

Jen explicitly approved this exact runbook before execution.

1. Reconfirm the branch contains only these 20 files and rerun the narrow tests
   if the candidate changed.
2. Commit only these files and push the commit to production `main`.
3. Wait for Vercel to report Ready. If the build fails, stop; Vercel should keep
   the current Ready production deployment.
4. Confirm both Prismarium domains point to the new deployment and the homepage,
   Explore, and Library catalog return 200.
5. Re-run the read-only L0-03 catalog summary. Expected: zero unsafe API table
   pairs, zero customer-callable protected functions, seven RLS/read policies,
   and retained shared/service authority.
6. Rehearse the kill switch with unauthenticated, harmless requests. Every
   contained paid/provider route must return the same non-cacheable 503 before
   authentication, database mutation, storage work, Stripe work, or provider
   cost. The explicit non-AI sacred-text request must bypass the commercial
   guard and reach its existing authorization boundary instead.
7. Inspect Vercel error logs for the deployment window. Record only aggregate
   errors; never include customer payloads or secrets.
8. If core public reads fail, stop and request approval before rollback unless
   Jen's exact approval explicitly includes returning the application to known
   commit `179f270`. Never change the L0-03 database repair during an L0-05 app
   rollback.
9. When every acceptance check passes, record privacy-safe evidence, mark
   `LEAN-L0-05` done, add 3 points, and advance to `LEAN-L1-01`.

## Safe kill-switch request matrix

The requests use empty or harmless bodies and print only status codes. Expected
503 responses prove closure without calling Stripe, AI providers, R2, OCR, or
the database mutation paths.

| Route/group | Expected result |
|---|---:|
| Checkout creation and subscription sync | 503 |
| Working generation | 503 |
| Seven Lenses query/expansion and Deep Search generation | 503 |
| GPT, Claude, and Gemini proxy routes | 503 |
| Tarot and cover image generation | 503 |
| Chapter-name and metadata generation | 503 |
| Document and media processing | 503 |
| Sacred-text import with AI enabled/default | 503 |
| Sacred-text import with `useAI: false` | Existing auth boundary, not the commercial 503 |

## Stop conditions

- The candidate contains anything outside the 20-file list.
- A local safety test, TypeScript, or build check fails.
- Vercel does not reach Ready or the public domains do not point to the new
  deployment.
- Homepage, Explore, Library catalog, or the L0-03 read-only database summary
  regresses.
- Any contained route reaches provider, Stripe, storage, or database side
  effects instead of returning the expected 503.
- Production environment unexpectedly contains an enabled commercial action.
- Logs reveal a new high-severity error.

## Exclusions

This packet does not enable Checkout, create or change Stripe objects, enable a
paid/provider action, alter a production environment value, apply a database
migration, reactivate staging, deploy course work, or begin billing/credits.
