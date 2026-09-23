# Question-led discovery

The curator starts at `/search` with a question such as “WTF is Alchemy?”. Concept Search performs a first library/web retrieval, plans two deeper searches from the retrieved clues, retrieves those sources, and writes a beginner-friendly answer with supported connections. No Alchemy-specific result, manuscript or Jesus connection is seeded into the research engine.

Each connection explains unfamiliar entries, presents the supporting quotation and source link, identifies the kind of evidence, and states historical/interpretive limits. Generated assertions whose quotation cannot be matched to a retrieved source are withheld individually. A final model review checks overstatement, historical context and relationship direction, followed by another exact quotation check. This is an aid to review, not independent proof that an interpretation is true. If the final review fails, source records remain available but unaudited findings are withheld.

Follow-up questions retain the earlier questions. A user can introduce a remembered connection in their own words. Completed runs are private, addressable and reloadable, with a recent-research list and a trail back to previous questions. “Keep this connection” creates/reuses entries within that researcher's private namespace and prepares a private draft inquiry finding; saving is idempotent. Only admins can review and publish their findings. Members cannot publish, enumerate another researcher's entries, or attach another researcher's private entries to their own findings.

Seven Lenses includes “Investigate sources and discover deeper connections”, using the question as the starting point. The existing synthesis is not treated as source evidence.

## Scope and configuration

- Signed-in members use the same discovery interface as admins. Signed-out visitors retain the recorded Concept Search demo. All signed-in users can read and edit their own saved research and inquiries without a paid membership; new member generation requires verified email, active paid membership, enabled server gates, and sufficient credits.
- Apply `20260916120000_research_discovery.sql` after the two inquiry migrations.
- Web retrieval uses the existing OpenRouter account with its Exa web plugin. Only provider citation annotations with retrieved content become sources; generated URLs are not accepted as evidence. No arbitrary server URL fetcher is introduced.
- Planning, drafting and review default to `openai/gpt-5.4`; `DISCOVERY_MODEL` is an explicit override. The existing `OPENROUTER_MODEL` is used for the web retrieval calls. Completed runs record returned provider model/request IDs, token counts and reported costs in the private result. Member runs also record aggregate usage in the existing metering ledger, including partial failed work with a conservative $0.30 fallback. Admin research remains uncharged, visibly labeled, with usage in completed results.
- The existing `deep_search_generation` availability gate is required. There is a 20-run per-account daily backstop, a 240-second request deadline, two bounded deeper searches and at most four web results per search. The count check is best-effort under concurrent requests, not an exact billing quota. Member metering additionally enforces one concurrent investigation and four starts per ten minutes.
- Local startup: from `app`, run `pnpm.cmd exec tsx scripts/inquiry-dev.ts --research`. This opt-in reads only AI provider configuration from `.env.local`; database/auth settings always come from verified local Supabase. The default launcher keeps paid research disabled.
- If web retrieval is unavailable, library evidence can still be used with an explicit warning. If no evidence is retrieved, the UI reports the gap without generating a purportedly sourced answer.
- Research context includes up to ten ancestor questions; source text is retrieved anew. History lists the most recent 30 runs. An interrupted running request can be reloaded, but this is not a background job runner.

## Journal integration (September 22)

Saved findings now live in **Study Journal → Research** (`/journal?tab=research`). “Save to Journal” on a discovery groups the finding under its starting question, with its explanation, citations, context, and private notes. The saved link opens `/journal/research/<inquiry-id>`. The Research section supports searching saved questions; the notebook retains note editing, source viewing, replay, and Markdown export. Admin-only review and publication remain explicit actions.

This uses the existing owner-scoped research records directly, so earlier saves appear automatically without copying evidence or notes into a second store. There is no additional migration or credit charge for Journal integration. The original `/inquiries` and `/inquiries/<id>` addresses redirect to the Journal. Workbench now has a single Study Journal entry for notes and saved research.

Local verification: `pnpm.cmd exec tsx scripts/verify-journal-research.ts` passed member navigation from Journal to Research, question search, persisted notes, desktop/mobile layout, old-link redirects, cross-account isolation, and retained admin review controls. The member wallet was unchanged. The expanded member discovery check separately verified the save action and note-edit API before reaching Journal navigation. TypeScript, targeted lint, and the 15 discovery/inquiry unit tests passed. No findings were published. The scripts use dedicated local fixtures and the previously saved Alchemy runs.

## Member credits and rollout

- `deep_search.fresh` now represents a research investigation: **3 Prism Credits**, equally for an opening question, typed follow-up, or suggested research question. The UI quotes the price at each generation button and shows the wallet balance. A separate 1-credit “explain existing evidence” feature is not part of this implementation.
- The existing metering adapter reserves credits before any search/provider work, persists a usable result before committing, releases reservations on provider/timeout/empty/persistence failures, and replays duplicate completed requests without another charge. A usable result has at least one source-validated overview or connection. An uncertain answer can be useful; the user's preferred conclusion is not required.
- Reading sources, reopening results, saving connections, and editing notes do not invoke metering. These remain available after paid access ends. A settlement error preserves the saved result and asks the user to inspect it instead of regenerating; the existing reconciliation process remains necessary for unsettled credits.
- Apply `20260921120000_member_research.sql` after the inquiry/discovery migrations. It scopes entity uniqueness to the researcher, copies previously cross-owned entries into their inquiry owner's namespace, guards finding ownership/publication, and allows owners to reorder private findings.
- Apply the repository's existing `20260813000000_paid_only_membership_credits.sql` before `20260921121000_credit_account_creation_time.sql`. The latter fixes first-grant timestamp ordering without changing allowances or ledger rules.
- Member generation requires the existing paid catalog configuration, `deep_search.fresh` in `PRISMARIUM_ENABLED_METERED_ACTIONS`, `deep_search_generation` in `PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS`, and an `enforce` policy for `deep_search.fresh` through the existing metering settings. Absent flags leave generation closed. No production settings or payments were changed.
- The local `--research` launcher enables only this commercial action and metering policy, with no checkout offers. `scripts/create-discovery-local-members.ts` creates marker-owned local member/Reader fixtures using fabricated billing identifiers, never Stripe calls. `scripts/verify-member-discovery.ts` checks real member generations and wallet changes; `--run=<id>` rechecks saved work without new provider generation.
- The older `/api/parallax/ai-search` generator is now curator-only, so it cannot serve as an unmetered member alternative.

## Verification

### Member credits and privacy

The September 21 local member browser test completed an opening question (`d80c14e5-6280-4372-a702-3e9623493761`) and Jesus/alchemy follow-up (`e5dce275-090c-4fa0-bec0-68f8edba54a8`). The actual wallet moved **30 → 27 → 24**. Duplicate requests, reopening results, saving a connection, and editing notes left the balance at 24. Both runs saved into private inquiry `8f19609e-6e41-4b7b-bc5c-82c3b6f0792f`.

The browser checks also covered cross-account isolation, blocked member publication, the legacy generator restriction, Seven Lenses question handoff, mobile overflow, and continued access to saved research during a billing hold. SQL checks cover entry ownership, publication guards, reordering, and first-grant timestamp ordering.

`pnpm.cmd exec tsx --conditions=react-server scripts/verify-discovery-refunds.ts` tests injected provider failure and unusable output against the actual local wallet, without making AI calls. Each check observed **24 → 21 reserved → 24 returned**, with no remaining reservation. Metering unit tests additionally cover timeout, persistence failure, duplicate replay, insufficient balance, and settlement errors.

### Try the member experience locally

1. With local Supabase running, start the app from `app` using `pnpm.cmd exec tsx scripts/inquiry-dev.ts --research`.
2. Open a private browser window at `http://127.0.0.1:3027/login` to keep your admin session separate.
3. Sign in as `discovery-member@prismarium.local` with password `Prismarium-Member-2026!`. This is a dedicated local test account; it currently has 24 credits after the verified runs.
4. Open `/search`. Every new investigation button should show **3 Prism Credits**. Ask “WTF is Alchemy?” and check that a successful answer costs 3 credits. This makes real provider calls.
5. Ask a follow-up such as “I've heard Jesus mentioned in relation to alchemy. Can you investigate that?” A successful investigation costs another 3 credits.
6. Reopen a saved result, view its sources, choose **Save to Journal**, then **Saved · Open in Journal** to edit your notes. You can also find it through **Workbench → Study Journal → Research**, grouped by the original question. These actions should leave the balance unchanged. Review and publication controls are reserved for admins.
7. For a free check using existing research, open `/search?discovery=e5dce275-090c-4fa0-bec0-68f8edba54a8` instead of generating another answer.

These accounts and results exist only in local Supabase. The hosted application still needs the migrations, application deployment, and explicit member-generation configuration described above.

### Discovery engine

`pnpm.cmd exec tsx --test tests/discovery.test.ts` checks citation provenance, fabricated quotations, deeper retrieval, retained question context and degraded/no-evidence behavior.

`pnpm.cmd exec tsx scripts/verify-discovery-live.ts` exercises an actual provider-backed “WTF is Alchemy?” run, quotation-backed discoveries, one-click draft capture, desktop/mobile rendering and reload. It uses the persistent local curator login and intentionally retains the private research for inspection. It invokes paid research. `--run=<id>` rechecks an existing run without regeneration.

`--followup --parent=<id>` tests the remembered Jesus/alchemy connection as a continuation of an earlier question. Browser checks also verify idempotent saving and rejection of anonymous access to the private run and capture endpoints.

The local live tests retrieved outside scholarship without supplying a manuscript name, retained the parent question, and saved a connection into the same private inquiry. The initial library fixture has no embedded corpus, so live evidence in those runs came from web retrieval. Production library retrieval still depends on the configured corpus and existing search functions.

On September 21, 2026, the GPT-5.4 follow-up run `a4663d61-8f56-453a-ac7e-dab61709281b` retrieved 11 source passages and retained four connections. These included a scholarly account of Christ-and-stone imagery and a distinct account of Jesus in Ibn ʿArabī. It also surfaced a study disputing a commonly repeated claim about Petrus Bonus. Two proposed items were withheld by validation. The run took approximately 102 seconds and reported $0.1804 in provider costs. This is a sample outcome, not a guarantee that every broad Alchemy search will discover the same connection.

Both the opening question and this follow-up saved into local private inquiry `a694883b-a3e7-4947-98ac-2ba433499805`. No findings from these runs were published. Browser verification checks reload, mobile overflow, anonymous access rejection, duplicate saves, revisiting the parent question, and carrying a typed Seven Lenses question into research without first running a Seven Lenses generation.

The final fresh broad-question run `8f1b643a-325f-4bee-8f51-853cbdfdaefe` passed after tightening relevance instructions to exclude commercial namesakes. It returned 12 source passages and four connections in approximately 90 seconds, reporting $0.1783 in provider costs. It did not independently surface Jesus in the first answer; the separately verified follow-up investigated that hunch. One intervening run failed during concurrent development-browser checks; the isolated rerun passed. Unit checks, TypeScript, and targeted lint passed. These changes and migrations have been tested locally, not deployed to the hosted application.

Provider reference: https://openrouter.ai/docs/guides/features/plugins/web-search

Research model reference: https://openrouter.ai/openai/gpt-5.4
