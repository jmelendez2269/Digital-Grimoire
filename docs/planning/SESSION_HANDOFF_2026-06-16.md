# Session Handoff — 2026-06-16

Major cleanup + narrative drafting session. Switched to **Path B** (prod as working DB) after discovering staging/prod divergence.

## What changed in production

### Entity catalog
- **Started**: 3,440 entities, 0 with narrative content, 732 "ghost approved" entries (status=approved but empty draft)
- **Ended**: 1,980 entities, **1,972 with draft narratives** (99.6%), 8 stubborn missing
- **Reduction**: 1,460 entities removed via dedup (variants folded into canonicals)

### Dedup work
- **Before**: 905 duplicate clusters across categories (Tourmaline had 34 variants, Carnation 9, Obsidian 9, Amethyst 8, Bear 8, etc.)
- **After**: 0 normalized-name collisions; 26 Levenshtein-1 false-positive pairs left (intentional — these are real entities 1 char apart, like Freyr/Freya, Iris/Isis, see `LEFTOVER_DUPLICATES_REVIEW.md`)
- Parenthetical content preserved on canonicals via new `varieties text[]` column (e.g., `stone-tourmaline.varieties = ["black", "watermelon", "blue", "green", "pink"...]`)
- Aliases preserved so wikilinks to old variant names still resolve

### Schema additions
- `correspondences.varieties text[]` — holds per-entity sub-variety/trait strings
- `correspondences.normalized_name text` (generated column) — lowercase, parens-stripped form
- Unique index on `(category, normalized_name)` — Layer 1 prevention against future duplicates

### API change
- `POST /api/graph/entities` now also checks by normalized_name (Layer 2) so a duplicate import gets a friendly 409 with existing entity info before the DB constraint fires

## Narrative drafting

- **Drafted in staging** (initial pass): orisha (8/8), celebration (30/33), sacred_geometry (8/9), plus pass-1 mass run (189 ok / 11 fail)
- **Synced to prod**: 808 of 1,154 staging drafts matched a prod slug; 346 were variant slugs we'd dedup'd away in prod (canonicals get drafted fresh in prod)
- **Mass-drafted directly in prod**:
  - openrouter/qwen pass: 906 ok / 94 fail
  - anthropic pass on stubborn ones: 267 ok / 8 fail
- **Source of grounding**:
  - PD library (Frazer, Blavatsky, Bhagavad Gita, Kabbalah, etc.) via FTS + ILIKE substantive-passage filter
  - Local `external-passages/` files for categories the PD library doesn't cover (orisha → Karade; celebration → Cunningham *Wicca*; sacred_geometry → Melchizedek *Flower of Life Vol 1*)
- All drafts at `status='draft'` — **invisible to the frontend until promoted to `'approved'`**

## Outstanding items requiring your eyes

### 1. The 8 stubborn missing entities

Three are valid entities that the validator kept rejecting under both providers (likely the LLM keeps producing similar AI tics):
- `chakra/third-eye-chakra`
- `deity/deity-luna`
- `issue_intention_power/optimism`
- `issue_intention_power/truth`

Three have real data quality problems:
- `issue_intention_power/opportunities-to-find-open-to-attract` — fold into canonical `opportunities` if it exists, else rename
- `plant_misc/plant-misc-topaz` — **miscategorized**, Topaz is a stone, not a plant
- `sea_item/sea-item-jasper-red` — **miscategorized**, Jasper is a stone, not a sea item
- `weekday/weekday-wednesday-times-of` — malformed name, looks like a parser artifact

### 2. 26 leftover duplicate clusters

Mostly false positives (different deities 1 character apart). See `LEFTOVER_DUPLICATES_REVIEW.md` for the full breakdown — 9 true dupes already merged in this session, 17 false positives to leave alone, 1 garbage entry (`color/Greed`) flagged for deletion.

### 3. Morrigan

Lives in `celebration` with the bizarre slug `january-1-new-years-day-hogmanay-morrigan` — clearly import noise from a multi-name field parse. She isn't in `deity`. Either delete from celebration as garbage, or move category to `deity`.

### 4. Approval workflow

All 1,972 drafts are at `status='draft'` — frontend won't show them until promoted to `'approved'`. Three options:
- **Manual per-entity review** via the admin UI (slow, high-quality)
- **Bulk auto-approve** via a script (fast, accepts the drafts as-is)
- **Per-category decision** — auto-approve low-stakes categories (e.g., `issue_intention_power`), review high-stakes ones (e.g., `orisha`)

### 5. Credential rotation

The local `.env.local` was read during this session, so its secrets passed through the conversation transcript. Should be rotated:
- Supabase **prod** `SUPABASE_SERVICE_ROLE_KEY`
- AWS S3 access key + secret
- Cloudflare R2 access key + secret
- Anthropic, OpenAI, OpenRouter, Mistral API keys
- Replicate, GETIMG, Stripe test
- Azure Vision key

Set new keys in Vercel env (production scope) AND in `.env.local`.

### 6. Staging is out of date

Staging is now 431+ entities behind prod (it never got the dedup or the new entities). Two options:
- Decommission staging (keep working in prod, treat staging as scratch)
- Rebuild staging from a fresh prod snapshot (gives a faithful copy again)

Staging schema is also missing the unique constraint (had blocking duplicates when we tried to add it).

## Files of note

- `docs/planning/LEFTOVER_DUPLICATES_REVIEW.md` — manual-review duplicate list
- `app/scripts/audit-entity-duplicates.ts` — re-run anytime to detect new duplicates
- `app/scripts/plan-dedup-merges.ts` — generates dedup plan for a category
- `app/scripts/apply-dedup-plan.ts` — applies a plan with edge redirect + dedup
- `app/scripts/find-ghost-approvals.ts` — detect status=approved + empty draft entries
- `app/scripts/sync-narrative-drafts-staging-to-prod.ts` — slug-matched draft sync
- `app/scripts/draft-entity-narratives.ts` — now supports `--db prod|staging`
- `app/scripts/compare-staging-vs-prod.ts` — read-only divergence inspector
- `app/scripts/diff-staging-prod-entities.ts` — per-category slug-set diff
