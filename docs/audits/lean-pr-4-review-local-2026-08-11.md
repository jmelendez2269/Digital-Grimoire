# Draft PR #4 local review — August 11, 2026

## Verdict

The Lean Membership L0–L1 implementation is locally safe after the fixes listed below. The hosted draft PR is **not ready for final approval yet** because its GitHub and Vercel checks still cover remote head `5191f12`, not these uncommitted local fixes. Nothing was pushed, merged, deployed, promoted, or remotely migrated during this review.

## Scope and preservation

- Draft PR #4 targets `develop` from `agent/lean-membership-l0-l1`. The reviewed remote diff contains 97 files in four commits and matches the intended L0–L1 membership work.
- The worktree was clean at the start and local `HEAD` exactly matched the remote review branch. The current dirt is the intentional review repair and L2-01 work recorded below.
- The separate `agent/pre-course-editorial-wip` branch remains at `de91f12`. Its two PRE editorial migrations, course-production tracker, and three screenshots are absent from PR #4:
  - `supabase/migrations/20260810000000_improve_pre_reading_context.sql`
  - `supabase/migrations/20260810142926_soften_pre_belief_framing.sql`
  - `docs/planning/prismarium-course-production-tracker.md`
  - `app/c01-parser-preview-desktop.png`
  - `app/c01-parser-preview-mobile.png`
  - `home-full.png`

No unrelated work was moved, deleted, or overwritten.

## Findings fixed locally

### High — unknown Stripe Prices could grant Scholar access

The legacy subscription sync and webhook treated a missing or unknown Price as Scholar. A signed but unrecognized Stripe subscription could therefore create an entitlement that the server catalog never approved.

Local repair:

- `app/src/lib/membership/membership-catalog.server.ts` now resolves only one exact server-only Price mapping. Missing, malformed, unknown, and duplicate Price mappings return no offer.
- `app/src/app/api/stripe/sync-subscription/route.ts` returns a non-cacheable `409 UNKNOWN_SUBSCRIPTION_PRICE` before updating the learner.
- `app/src/app/api/stripe/webhook/route.ts` rejects the event before an entitlement write, returning a retryable failure instead of defaulting to Scholar.
- Both routes stopped using browser-visible `NEXT_PUBLIC_STRIPE_PRICE_ID_*` values as billing authority.

### Medium — logs and responses exposed unnecessary identifiers

Legacy billing and service-client diagnostics logged a service-key prefix, project references or URL, learner/customer/subscription identifiers, database update content, and raw error objects. The sync response also returned Stripe customer and subscription identifiers.

Local repair:

- `app/src/lib/supabase/service.ts` now reports only a generic configuration mismatch and never logs key material or project references.
- `app/src/app/api/stripe/create-checkout-session/route.ts`, `sync-subscription/route.ts`, and `webhook/route.ts` now use static operational messages and omit raw exceptions and stable identifiers.
- Subscription sync no longer returns customer or subscription IDs.
- `app/tests/permission-server-authority.test.ts` locks in the unknown-Price and safe-logging boundaries.

### Low — mission-control status was stale

The tracker dashboard still showed L1 at 12/15 and 26/114 after L1-05 had proved 15/15 and 29/114. The dashboard and launch plan now agree with the verified score and the L2-01 dependency order.

## Security and privacy conclusions

- Learner progress and Journal routes get identity from verified Supabase auth, then use server-owned PRE allowlisting and learner-owned enrollment checks. Browser-supplied identity, enrollment, publication state, revision, or membership values do not grant access.
- Service-role use is confined to server-only helpers and authenticated or signed server routes. The reviewed migrations revoke customer execution from authoritative functions and use RLS plus service-only writes.
- Public course list/detail responses use explicit sanitized projections. They do not return learner progress, Journal text, account data, enrollment rows, or unpublished course content to non-admin visitors.
- Progress and Journal writes validate the exact course/week contract, ownership, revision, and replay request. Conflicts and limit denials fail without replacing the learner's local draft.
- No high-confidence secret material was found in the reviewed changed-file set. The local catalog's raw Price configuration is never returned by the public catalog endpoint.

## Persistence and UX conclusions

- The client keeps dirty text during load/save conflicts and on Reader-cap failures. Ambiguous retry reuses the request ID, while a confirmed save adopts the server revision.
- The database enforces the real 50-active-page Reader limit. Existing pages remain readable/editable; creating or restoring another active page fails until one is archived.
- Loading, saving, saved, conflict, retry, and archive-to-make-room text is plain and actionable. The reviewed 375×812 browser evidence has no horizontal overflow, and the PRE journey supports keyboard sign-in and controls.
- Course routing waits for authentication and enrollment loading to settle before choosing preview or learn, so an unfinished enrollment request does not send the learner to the wrong page.

## Migration and rollback review

- The three L0–L1 migrations are ordered, transaction-wrapped, lock-bounded, advisory-locked, repeat-safe for their intended forward path, and explicit about grants/RLS/service-only functions.
- Replay and revision paths use database locks and unique keys to prevent double application or silent overwrites.
- No migration was applied remotely. The two L1 migrations remain locally verified only.
- The production cleanup/rollback instructions require an exact target, confirmation token, separate approval, and post-checks. The guarded L0 reversal intentionally restores the old unsafe permissions and is therefore emergency-only; a forward repair remains the safer production response.

## Verification evidence

- L1 focused tests: 32/32 passed.
- Course/public-preview tests: 9/9 passed.
- Local permission hotfix database story: 54/54 passed with zero residue.
- Local progress database story: all 8 boundaries passed with zero residue.
- Local Journal database story: all 13 story fields passed with zero residue.
- Server-authority regression: 4/4 passed.
- Commercial default-closure regression: 8/8 passed.
- TypeScript: passed.
- Production build: compiled and generated 136/136 pages.
- Existing real-browser evidence was inspected directly, including the fresh-session mobile reload and real Reader-cap failure screenshots.

Read-only hosted checks on remote head `5191f12`:

- both Vercel preview checks passed and both preview deployments reported Ready;
- Vercel Preview Comments passed;
- CodeRabbit reported success but skipped its substantive review because the PR is a draft;
- no review threads or requested changes were present.

## Remaining risks

1. These fixes and L2-01 are local and uncommitted. Hosted checks do not cover them yet.
2. CodeRabbit did not perform a full review on the draft PR.
3. Paid billing must remain closed. The legacy Stripe handlers are not the durable/idempotent webhook inbox planned for L2-05, and their existing `no-explicit-any` lint debt remains in `sync-subscription/route.ts` and `webhook/route.ts`.
4. L1 migrations have strong local evidence but have not been applied or verified in a remote environment.

These are launch gates, not reasons to discard the locally reviewed L0–L1 work.
