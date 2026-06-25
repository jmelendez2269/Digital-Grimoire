# The Working — Handoff (for the next conversation)

**Last updated:** June 2026. Read this first, then `docs/planning/THE_WORKING_PLAN.md` for the full phase plan and decisions of record.

## What it is
The Working = an intent-driven, graph-grounded ritual generator + (planned) practitioner lab-notebook. Practitioner states an intention → the correspondence graph assembles a palette of aligned components (each with its curated narrative) → an LLM synthesizes a ritual from that palette → (planned) it's saved as an experiment with a hypothesis, auto-stamped casting conditions, and a longitudinal follow-up log.

Brand language (user-facing): product = **Prismarium**, AI = **Parallax Engine**. Never "Digital Grimoire"/"Convergence" in user copy. The feature is **The Working**.

## Status
| Phase | State |
|---|---|
| 1 — Intentions normalization | ✅ migrations 040, 041 |
| Recovery — orphaned claims (218 → 609 entities) | ✅ `recover-claims-from-bundle.ts` |
| 2 — Assembly endpoint | ✅ |
| 2.5 — Semantic intent resolution | ✅ |
| 3 — Synthesis + model choice (**Haiku 4.5**) | ✅ |
| **4 — Workings as experiments (persistence)** | ✅ |
| **5 — Practitioner UI** | ⏭ NEXT |
| 6 — Community sharing | ⏭ |

## Key files (all under `app/`)
- `src/lib/working/assemble.ts` — palette assembly. `assemblePalette(supabase, input)` (deterministic) + `assemblePaletteForSlugs(supabase, slugs, intention)` (slug-set core) + `resolveIntention()` (deterministic resolver). Groups: Timing / Materials / Symbols / Energetics / Patrons & Beings / Other; cap 8/group; one-hop traversal for patron deities/planets.
- `src/lib/working/resolve-intent.ts` — `resolveIntentSemantic()` (Phase 2.5): deterministic → Haiku fallback → canonical slug set.
- `src/lib/working/synthesize.ts` — `buildSynthesisPrompt(palette)` (THE canonical prompt — the real asset) + `synthesizeRitual(palette)`. Model: `WORKING_SYNTHESIS_MODEL = "claude-haiku-4-5"`.
- `src/lib/working/conditions.ts` — `stampConditions(castAt)` → `WorkingConditions` (moon phase via Meeus reference, planetary day-ruler, season). Pure TS, no deps.
- `src/app/api/working/assemble/route.ts` — `POST` palette only.
- `src/app/api/working/generate/route.ts` — `POST {intention}` → `{palette, ritual, interpretation?}`. Deterministic → semantic fallback → assemble → synthesize. `maxDuration = 60`.
- `src/app/api/working/route.ts` — `GET` → list user's workings (no palette in list; fetch by id for full record).
- `src/app/api/working/save/route.ts` — `POST {intent_text, palette, ritual, model_used, status?}` → `{id, created_at}`. Creates a working as draft.
- `src/app/api/working/[id]/route.ts` — `GET` full record; `PATCH {intent_text}` to update the hypothesis text.
- `src/app/api/working/[id]/cast/route.ts` — `POST {cast_at?}` → stamps conditions, sets status=cast. Idempotent.
- `scripts/working-model-bakeoff.ts` — CLI bake-off; imports `buildSynthesisPrompt` so it never drifts. `--models a,b,c` (prefix `anthropic:` for direct Claude), `--prod`/`--via-merge-plans`/`--execute` belong to the *other* script below.
- `scripts/recover-claims-from-bundle.ts` — orphan-claim recovery (already run; keep for reference).

## Wiki
- `src/content/wiki/user/the-working.md` and `technical/the-working.md` (render at `/wiki/the-working`).

## Data (Supabase)
- **Production project ref: `ukguqtghfglirszsqqdj`** (name: digital-grimoire-library). Staging: `hsmwojlgdepstgzcryyc`.
- Migrations applied to prod: `040_add_intentions_normalization.sql`, `041_fix_intentions_and_aliases.sql`.
- Tables: `intentions` (~243 canonical, with `aliases[]`), `entity_intentions` (junction, ~11k links), `correspondences` (~1,980 entities; `description` = approved narrative; 1,972 approved), `knowledge_claims`, `correspondence_relationships`.
- After recovery: **609 entities have intentions** (was 218); 2 orphan claims remain (harmless). Backup of pre-recovery orphans: `graph-bundles/orphan-claims-backup-2026-06-24T18-09-58-716Z.json` (gitignored).

## Env / gotchas (important)
- **`app/.env.local` points to STAGING by default** (`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`). Production creds are under `PROD_SUPABASE_URL` / `PROD_SUPABASE_SERVICE_KEY`. Scripts that need prod read the `PROD_*` vars directly (see the temp test pattern) or pass `--prod`.
- `ANTHROPIC_API_KEY` is set in `app/.env.local` (direct Anthropic — cheaper than OpenRouter). `OPENROUTER_API_KEY` also present (Qwen/Kimi/DeepSeek).
- **Bash tool working dir resets to repo root between calls** — always `cd /c/Projects/Digital-Grimoire/app &&` before `npx tsx ...`.
- Supabase JS `.in('id', [...])`: keep chunks ≤ 100 or the request URL exceeds the 16KB header limit (HeadersOverflowError).
- Run scripts with `npx tsx scripts/<file>.ts` from `app/`.
- Cost: Haiku 4.5 ≈ **$0.007/ritual** (~0.7¢), ~17–20s. Sonnet 4.6 ≈ $0.02. (Per ~3,000 in + ~700 out tokens.)
- Anthropic model rule: use exact IDs (`claude-haiku-4-5`, `claude-sonnet-4-6`); Haiku 4.5 supports `temperature` (we use 1 for variety) but NOT `effort`.

## How to test the engine quickly
Create a temp script in `app/scripts/_tmp_*.ts` that loads `.env.local`, makes a Supabase client from `PROD_SUPABASE_URL`/`PROD_SUPABASE_SERVICE_KEY`, calls `assemblePalette` / `resolveIntentSemantic` / `synthesizeRitual`, prints, then delete it. (Pattern used throughout this build.) The `/api/working/generate` route is auth-gated, so the lib path is the easy test surface.

## Phase 4 complete — what was built

- **`workings` table** (staging + prod): `id / user_id / intent_text / palette (jsonb) / ritual / model_used / status (draft|cast|shared) / cast_at / conditions (jsonb) / shared_at / created_at / updated_at`. RLS owner-private. `updated_at` auto-trigger.
- **`journal_pages.working_id`** (nullable FK → workings): follow-up journal entries link here. `on delete set null`.
- **`src/lib/working/conditions.ts`** — `stampConditions(castAt)` → `WorkingConditions`: moon phase (8-phase, Meeus Jan 6 2000 reference), planetary day-ruler (Sun→Sat), season (NH), ISO cast_date.
- **API surface** — all auth-gated, service client for DB:
  - `GET /api/working` — list (no palette blob; 100 cap)
  - `POST /api/working/save` — create draft
  - `GET /api/working/[id]` — full record
  - `PATCH /api/working/[id]` — update intent_text
  - `POST /api/working/[id]/cast` — stamp conditions, set status=cast

**Migration file:** `src/lib/supabase/migrations/20260625000000_add_workings.sql`

---

## NEXT: Phase 5 — Practitioner UI
Phase 5 UI: intent → palette → ritual → cast (writes hypothesis + conditions) → follow-up journal entries; Phase 6 community sharing (add `shared` status + public RLS policy).

## Git
- Branch `develop`. Latest relevant commits: 040/041 + recovery, Phase 2 assembly, Phase 3 synthesis, Phase 2.5 semantic resolver. Commit messages end with the Co-Authored-By line. Push to `origin/develop`.
