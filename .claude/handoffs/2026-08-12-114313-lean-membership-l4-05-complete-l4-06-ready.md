# Handoff: Lean Membership L4-05 complete; L4-06 ready

## Session Metadata

- Created: 2026-08-12 11:43:13
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `agent/lean-membership-l2`
- Session duration: Approximately 1 hour 45 minutes

### Recent Commits (for context)

- `1344eb1` Complete Lean Membership Phase L3
- `a93c6b7` Complete Lean Membership Phase L2
- `5191f12` Record lean membership plans and verification
- `30e129f` Persist PRE learner progress and Journal work
- `850049d` Contain commercial actions and restore server authority

## Handoff Chain

- **Continues from:** [2026-08-12-111531-lean-membership-l4-04-complete-l4-05-ready.md](./2026-08-12-111531-lean-membership-l4-04-complete-l4-05-ready.md)
- **Supersedes:** That predecessor for current implementation status. Read it for the accumulated L4-01 through L4-04 architecture and dirty-worktree boundaries.

## Current State Summary

`LEAN-L4-05` is complete locally. The L0 commercial guard inventory was refreshed against every API provider seam and current UI caller. Only Checkout and the three already integrated metered route classes can now be reopened through exact server configuration. Eleven Deep Search, generic proxy, image, metadata, and mixed document/media generation actions remain structurally hard closed even if their exact legacy commercial tokens are configured. Deep Search also resolves to metering mode `off` because its quote is now non-offered. Ordinary concept search no longer imports dormant AI helpers, and Library, Graph, Journal, history, and saved-result reopen remain outside generation gating. The tracker is at 90/114 points (78.9%), Phase L4 is 18/21, and `LEAN-L4-06` is ready. All commercial, metering, billing, course-release, production, and activation gates remain default closed; nothing was deployed or enabled.

## Codebase Understanding

## Architecture Overview

The first availability boundary remains `app/src/lib/commercial-availability-policy.ts` plus the server response wrapper in `commercial-availability.ts`. L4-05 changed the policy from “every exact token is reopenable” to a structural partition. `CONFIGURABLE_COMMERCIAL_ACTIONS` contains only Checkout, The Working generation, Seven Lenses synthesis, and one-lens expansion. `HARD_CLOSED_GENERATION_ACTIONS` contains eleven legacy unmetered classes. `isCommercialActionEnabled` rejects every action outside the configurable set before reading the exact environment token. This makes unknown future additions fail closed unless code explicitly classifies them.

Commercial availability and metering remain independent. The Working, Seven Lenses synthesis, and expansion still need their exact commercial token and the shared adapter policy. Deep Search remains in the catalog as a provisional three-credit hypothesis but is `offered: false`, so even an explicit `enforce` metering configuration resolves to `off`. Image generation remains non-offered with no quote.

The browser's authentication middleware is an outer boundary. Logged-out probes return 401 before entering the route handlers. Controlled policy and source-order tests cover the inner boundary: hard-closed handlers return the shared opaque 503 even when their exact legacy action token is present, and guards precede auth, parsing, retrieval, storage, provider construction, calls, and mutations. Two curator metadata routes remain separately permitted only after authenticated admin-role checks before prompt/provider work.

## Critical Files

| File | Purpose | Relevance |
|---|---|---|
| `docs/planning/prismarium-membership-implementation-tracker.md` | Immediate implementation source of truth | L4-05 done; L4-06 ready; 90/114 and Phase L4 18/21 |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Controlling product scope and launch gates | Keeps L4-06 separate from production activation and L5 |
| `docs/audits/lean-l4-05-generation-bypass-containment-local-2026-08-12.md` | Accepted local L4-05 evidence | Route inventory, exact changes, tests, browser boundary, rollback, and limits |
| `app/src/lib/commercial-availability-policy.ts` | Exact commercial action policy | Structural configurable/hard-closed partition |
| `app/src/lib/commercial-availability.ts` | Opaque no-store unavailable response | Shared inner 503 boundary; unchanged this session |
| `app/src/lib/membership/metering-catalog.server.ts` | Server-owned metering quote/runtime policy | Deep Search is now non-offered even under enforce configuration |
| `app/src/lib/membership/metering-adapter.server.ts` | Shared authoritative generation lifecycle | L4-06 must exercise the real full stories through this path |
| `app/src/app/api/concepts/route.ts` | Ordinary concept read/search and admin mutation | Dormant AI imports removed; GET remains non-generative |
| `app/tests/commercial-availability.test.ts` | Commercial/bypass contracts | 12 containment stories, including hard closure, admin exceptions, and free surfaces |
| `app/tests/membership-metering.test.ts` | Shared adapter/catalog contracts | Proves non-offered Deep Search cannot enter enforce mode |
| `supabase/migrations/20260812040000_lean_l4_01_metering_foundation.sql` | Metering schema/RPC foundation | L4-06 database and real credit stories depend on it |
| `supabase/migrations/20260812110000_lean_l4_04_lens_expansions.sql` | Durable expansion-child schema | Still not remotely applied; L4-06 needs an intended database environment |

## Key Patterns Discovered

- Default closure is stronger when code owns the set of reopenable actions; exact environment tokens alone are insufficient authority for an unmetered route.
- New commercial actions fail closed unless they are deliberately added to the configurable partition.
- Commercial and metering gates remain independent. An integrated route needs both; an unoffered action cannot be made live by configuring only one.
- Conditional routes may retain a safe explicit non-AI path while hard closing only the AI branch before remote/provider work.
- Admin-only generation is not customer metering, but the admin authority check must precede request prompts, storage reads, and provider construction/calls.
- Logged-out middleware 401 and inner route 503 are complementary boundaries; browser probes cannot replace controlled inner-guard tests.
- Free product surfaces should be proved by absence of generation gating and provider calls, not by labeling every shared route “free.” Mixed upload/process routes remain closed because they include provider-cost branches.

## Work Completed

### Tasks Finished

- [x] Refreshed the L0-04 provider/generation route inventory and traced every current UI caller.
- [x] Classified integrated metered routes, hard-closed unmetered routes, curator-only routes, conditional non-AI import, and zero-credit read/search/reopen surfaces.
- [x] Added an explicit configurable-versus-hard-closed commercial action partition.
- [x] Made Deep Search non-offered in the metering policy without connecting it to the adapter.
- [x] Removed dormant AI-relevance imports from ordinary concept search and cleaned its local error typing.
- [x] Strengthened containment tests for exact-token reopening, early ordering, admin exceptions, free surfaces, and saved-result reopen.
- [x] Ran 12/12 containment tests, 31/31 metering tests, and the full 87/87 membership/commercial regression set.
- [x] Passed focused ESLint, standalone TypeScript, `git diff --check`, and a 139/139-page production build.
- [x] Verified Library, Graph, Concept Search, Journal auth redirect, and representative closed POST boundaries at 375x812.
- [x] Wrote L4-05 evidence, updated mission control, and passed the post-edit audit with zero broken links or drift.

## Files Modified

| File | Changes | Rationale |
|---|---|---|
| `app/src/lib/commercial-availability-policy.ts` | Added configurable and hard-closed action partitions; unknown/non-configurable actions cannot open | Prevent environment-only reopening of unmetered generation |
| `app/src/lib/membership/metering-catalog.server.ts` | Set `deep_search.fresh` to `offered: false` | Keep provisional Deep Search closed even under enforce configuration |
| `app/src/app/api/concepts/route.ts` | Removed dormant AI imports and replaced two `any` catches with safe unknown handling | Keep ordinary search non-generative and changed-file lint clean |
| `app/tests/commercial-availability.test.ts` | Expanded to 12 containment stories | Prove structural closure, early guards, curator authority, conditional safe mode, and free surfaces |
| `app/tests/membership-metering.test.ts` | Added Deep Search non-offered/off-mode assertions | Preserve independence of provisional catalog data and actual offering |
| `docs/audits/lean-l4-05-generation-bypass-containment-local-2026-08-12.md` | Added complete L4-05 evidence packet | Record inventory, boundaries, verification, limitations, and rollback |
| `docs/planning/prismarium-membership-implementation-tracker.md` | Marked L4-05 done/L4-06 ready; updated progress, risk, log, and next move | Keep implementation source of truth current |
| `docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md` | Updated immediate next move to L4-06 | Keep controlling scope aligned without authorizing activation |

The dirty worktree also contains the accumulated uncommitted L4-01 through L4-04 implementation and evidence. Do not delete, reset, or rewrite it wholesale.

## Decisions Made

| Decision | Options Considered | Rationale |
|---|---|---|
| Allowlist configurable commercial actions in code | Keep all exact tokens reopenable; remove legacy actions; explicit configurable partition | Preserves route inventory and future intent while preventing environment-only unmetered reopening; new actions default closed |
| Hard close eleven action classes | Guard only Deep Search/images; trust admin UI callers; close every customer-reachable unmetered class | Mixed document/media and metadata routes can incur provider/storage cost if reopened, so they belong in the same containment class |
| Keep curator metadata routes admin-only | Hard close them; make them customer-metered; preserve early role authority | Their in-handler admin checks precede prompts/providers, so they are operational curator tools rather than public bypasses |
| Preserve explicit `useAI: false` sacred import | Close the entire import route; allow both branches; hard close only the AI branch | Retains useful non-AI import without exposing provider work |
| Make Deep Search non-offered, retain provisional quote | Remove it from catalog; connect it to metering; keep quote but `offered: false` | Records the launch hypothesis while preventing runtime enablement until cache/accounting work is complete |
| Keep L4-05 local | Deploy or enable tokens; controlled local containment packet | Production/full authenticated provider and credit proof belongs to later gates |

## Pending Work

## Immediate Next Steps

1. Start `LEAN-L4-06` with an explicit full-story matrix for the actually offered variants: The Working, Seven Lenses standard, Seven Lenses long, and one-lens expansion. For each, cover success, insufficient balance, concurrent replay/reservation, provider/persistence failure return, exact durable result, privacy-safe telemetry, action/global kill switches, and bypass probes.
2. Select and explicitly authorize the intended test environment and eligible non-admin authenticated account. Prefer an isolated local database plus real provider credentials if that satisfies the “Both” gate; do not assume production, deploy, apply remote migrations, or use an existing customer/admin account.
3. Reconcile/apply the L4-01 and L4-04 forward migrations only in the approved test environment, then create tagged test grants/data with a documented cleanup/zero-residue plan.
4. Exercise real browser → API → adapter → provider → database → wallet/result stories at narrow and desktop widths. Verify each completed action charges once, every failure returns its hold, replay performs no provider/charge, and hard-closed actions still cannot open.
5. Write L4-06 evidence and update mission control. Only after the acceptance matrix passes may Phase L4 become 21/21; this still does not authorize L5 or production launch.

### Blockers/Open Questions

- No approved authenticated non-admin L4-06 test credential or target environment was supplied in this session. Planning and local preflight can proceed, but real provider/database/credit execution needs explicit scope and authority.
- Decide whether an isolated local Supabase database plus real provider calls satisfies the `Both` boundary or whether a separately approved staging story is required. Do not silently substitute production.
- The L4-04 expansion migration has controlled/static evidence but has not been applied remotely. L4-06 must verify its actual database behavior in the selected environment before claiming the expansion full story.

### Deferred Items

- Deep Search metering/cache remains deferred until its versioned cache, cost telemetry, reservation, and failure requirements are designed and verified.
- Image generation remains not offered pending a separate product, safety, and economics decision.
- Production migration/deployment, live environment changes, Stripe/customer actions, paid offers, member-course release, canary, and public activation remain under `LEAN-L5-05` and require explicit authorization.
- Pricing/account/wallet UI, shadow economics, canary, and stabilization remain L5 work.

## Context for Resuming Agent

## Important Context

- The tracker is authoritative: L4-05 is done, L4-06 is ready, total progress is 90/114 (78.9%), and Phase L4 is 18/21.
- The workspace is intentionally dirty and uncommitted across L4-01 through L4-05. Preserve all accumulated packet work.
- Three unrelated pre-existing user edits remain protected: `app/src/lib/parsers/course-markdown-parser.ts`, `app/tests/course-parser-v2.test.ts`, and `supabase/config.toml`.
- Do not commit, push, open a PR, deploy, apply remote migrations, change environment variables, run Stripe/customer actions, or activate paid/metered routes without explicit user authorization.
- Hard-closed generation tokens are intentionally ignored by `isCommercialActionEnabled`, even if present in `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS`. Do not weaken this to make a local environment token work.
- The only configurable generation route classes are The Working, Seven Lenses synthesis, and one-lens expansion. They still require the independent shared metering policy and remain default off.
- Deep Search has a provisional three-credit catalog value but `offered: false`; image generation has no credit quote and is also non-offered. L4-06 must not include either as an enabled action.
- The browser middleware returns 401 to logged-out provider-route probes before the handlers. Inner hard-closed 503 behavior is proved by controlled policy/source-order tests; both boundaries matter.
- Latest verification: containment 12/12, metering 31/31, total membership/commercial 87/87, focused ESLint passed, standalone TypeScript passed, `git diff --check` passed with line-ending warnings, mission-control audit found zero broken links/drift, and the production build generated 139/139 pages.
- Browser verification at 375x812 proved Library, Graph, and Concept Search render; Journal redirects to sign-in; representative Deep Search/generic/image/document requests stop at middleware; no provider or mutation was invoked.

## Assumptions Made

- Controlled policy, static source ordering, build, and safe browser checks satisfy this local Build-owned L4-05 packet.
- Admin-only curator metadata generation is not a public bypass because role authority precedes prompt/provider/storage work.
- Ordinary concept search, Library, Graph, Journal, and saved-result reopen are zero-credit/non-generative surfaces, not necessarily anonymous entitlement in every case.
- L4-06, not L4-05, owns real authenticated provider/database/wallet and kill-switch proof.
- Current branch remains `agent/lean-membership-l2` until the user directs otherwise.

## Potential Gotchas

- `COMMERCIAL_ACTIONS` is the complete inventory, while `CONFIGURABLE_COMMERCIAL_ACTIONS` is the narrow reopenable subset. Do not use the former as an operational allowlist.
- Future commercial actions default closed because `isCommercialActionEnabled` checks the configurable set first. Tests assert the current configurable plus hard-closed sets exactly partition the inventory.
- A logged-out 401 does not prove the inner route guard. Retain both HTTP middleware probes and direct policy/source-order contracts.
- `POST /api/import-sacred-text` parses enough request data to select `useAI`; the AI guard then precedes auth, remote parsing, and provider work. Preserve the explicit non-AI branch.
- `POST /api/documents/generate-metadata` and `/api/documents/rescan-all-metadata` are not commercial-token routes. Their authenticated admin-role checks are the authority boundary and must stay before request prompt/provider/storage work.
- L4-06 must treat Seven Lenses standard and long as separate priced variants even though they share a route.
- The parent synthesis request UUID, durable parent response UUID, and expansion request UUID remain distinct. L4-06 replay/concurrency probes must not collapse them.
- The L4-04 migration was not remotely applied. Do not claim real expansion persistence until the selected test database proves it.
- `git diff` against `HEAD` includes the entire accumulated L4 packet, not only L4-05. Review narrow paths and preserve unrelated/user work.
- Known non-fatal build warnings remain: baseline-browser-mapping freshness, middleware convention deprecation, Sentry client naming, and expected dynamic-cookie messages.

## Environment State

### Tools/Services Used

- Local PowerShell, Node/npm, TSX tests, ESLint, TypeScript, and Next.js 16 production build.
- Controlled Node fixtures only; no real provider, credit, database mutation, Stripe, or customer action.
- `agent-browser` at 375x812 on isolated port 3102 for Library, Graph, Concept Search, Journal redirect, and closed-route HTTP probes.
- Mission-control audit script against `C:\Projects\Digital-Grimoire`; zero link/index/mirror/metadata issues.

### Active Processes

- No L4-05 server or browser session is running. The isolated port-3102 server was stopped and the browser session was closed.
- An unrelated pre-existing development process, if present, was not inspected or changed.

### Environment Variables

Names only; no values were inspected or changed:

- `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS`
- `PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS`
- `PRISMARIUM_METERING_MODE`
- `PRISMARIUM_METERING_ACTION_MODES`
- `PRISMARIUM_METERING_GLOBAL_KILL_SWITCH`
- `PRISMARIUM_METERING_ACTION_KILL_SWITCHES`
- `PRISMARIUM_READER_MONTHLY_PROVIDER_BUDGET_USD`
- `PARALLAX_LENS_MODEL`
- `PARALLAX_SYNTHESIS_MODEL`
- Existing Supabase and AI provider credential variables referenced by `.env.local`

## Related Resources

- [Lean membership implementation tracker](../../docs/planning/prismarium-membership-implementation-tracker.md)
- [Lean membership launch plan](../../docs/planning/prismarium-lean-membership-launch-plan-2026-08-06.md)
- [L4-05 evidence](../../docs/audits/lean-l4-05-generation-bypass-containment-local-2026-08-12.md)
- [L4-04 evidence](../../docs/audits/lean-l4-04-lens-expansion-metering-local-2026-08-12.md)
- [L4-01 metering evidence](../../docs/audits/lean-l4-01-metering-foundation-local-2026-08-11.md)
- [Commercial containment tests](../../app/tests/commercial-availability.test.ts)
- [Shared metering tests](../../app/tests/membership-metering.test.ts)
- [Commercial policy](../../app/src/lib/commercial-availability-policy.ts)
- [Metering catalog](../../app/src/lib/membership/metering-catalog.server.ts)

---

Suggested next-session prompt: **"Resume from the latest Lean Membership handoff and begin LEAN-L4-06."**
