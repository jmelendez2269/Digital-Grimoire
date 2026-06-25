# The Working — Handoff (for the next conversation)

**Last updated:** June 2026. Read this first, then `docs/planning/THE_WORKING_PLAN.md` for the full phase plan and decisions of record.

## What it is
The Working = an intent-driven, graph-grounded ritual generator + practitioner lab-notebook. Practitioner states an intention → the correspondence graph assembles a palette of aligned components (each with its curated narrative) → an LLM synthesizes a ritual from that palette → it's saved as an experiment with a hypothesis, auto-stamped casting conditions, and a longitudinal follow-up log.

Brand language (user-facing): product = **Prismarium**, AI = **Parallax Engine**. Never "Digital Grimoire"/"Convergence" in user copy. The feature is **The Working**.

## Status
| Phase | State |
|---|---|
| 1 — Intentions normalization | ✅ migrations 040, 041 |
| Recovery — orphaned claims (218 → 609 entities) | ✅ `recover-claims-from-bundle.ts` |
| 2 — Assembly endpoint | ✅ |
| 2.5 — Semantic intent resolution | ✅ |
| 3 — Synthesis + model choice (**Haiku 4.5**) | ✅ |
| 4 — Workings as experiments (persistence) | ✅ |
| Nav restructure (Model B) | ✅ on main |
| **5 — Practitioner UI** | ⏭ NEXT |
| 6 — Community sharing | ⏭ |

## Nav architecture (as-built)

Primary nav: **Library · Courses · Explore · Workbench**

**Explore** (hover dropdown → lands on `/explore` hub):
- Knowledge Graph → `/graph`
- Concept Search → `/search`
- Parallax Engine → `/seven-lenses`

**Workbench** (hover dropdown → clicks through to `/journal` by default):
- Journal → `/journal`
- The Working → `/workbench/the-working` ← Phase 5 UI goes here
- Tarot → `/workbench/tarot` (coming soon)

Workbench sub-nav (`src/app/workbench/layout.tsx`) mirrors the dropdown. My Rituals and Ritual Machine retired. Font `text-base`. Coming-soon tabs non-clickable with "soon" badge.

`src/components/Header.tsx` — `NavItem` type has `matchPaths[]` (multi-path active) and `dropdownItems[]` (hover dropdown). `isActive(item)` checks matchPaths. Workbench active on `/workbench` + `/journal`.

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
- `src/app/workbench/the-working/page.tsx` — placeholder for Phase 5 UI (currently "coming soon" screen).
- `src/app/explore/page.tsx` — Explore hub: three tool cards linking to existing standalone pages.
- `scripts/working-model-bakeoff.ts` — CLI bake-off; imports `buildSynthesisPrompt` so it never drifts.
- `scripts/recover-claims-from-bundle.ts` — orphan-claim recovery (already run; keep for reference).

## Wiki
- `src/content/wiki/user/the-working.md` and `technical/the-working.md` (render at `/wiki/the-working`).

## Data (Supabase)
- **Production project ref: `ukguqtghfglirszsqqdj`** (name: digital-grimoire-library). Staging: `hsmwojlgdepstgzcryyc`.
- Migrations applied to prod: `040_add_intentions_normalization.sql`, `041_fix_intentions_and_aliases.sql`, `20260625000000_add_workings.sql`.
- Tables: `intentions` (~243 canonical, with `aliases[]`), `entity_intentions` (junction, ~11k links), `correspondences` (~1,980 entities; `description` = approved narrative; 1,972 approved), `knowledge_claims`, `correspondence_relationships`, **`workings`** (Phase 4).
- `journal_pages.working_id` — nullable FK → workings for follow-up notes.
- After recovery: **609 entities have intentions** (was 218); 2 orphan claims remain (harmless).

## Env / gotchas (important)
- **`app/.env.local` points to STAGING by default** (`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`). Production creds are under `PROD_SUPABASE_URL` / `PROD_SUPABASE_SERVICE_KEY`. Scripts that need prod read the `PROD_*` vars directly or pass `--prod`.
- `ANTHROPIC_API_KEY` is set in `app/.env.local` (direct Anthropic — cheaper than OpenRouter). `OPENROUTER_API_KEY` also present (Qwen/Kimi/DeepSeek).
- **Bash tool working dir resets to repo root between calls** — always `cd /c/Projects/Digital-Grimoire/app &&` before `npx tsx ...`.
- Supabase JS `.in('id', [...])`: keep chunks ≤ 100 or the request URL exceeds the 16KB header limit (HeadersOverflowError).
- Run scripts with `npx tsx scripts/<file>.ts` from `app/`.
- Cost: Haiku 4.5 ≈ **$0.007/ritual** (~0.7¢), ~17–20s. Sonnet 4.6 ≈ $0.02. (Per ~3,000 in + ~700 out tokens.)
- Anthropic model rule: use exact IDs (`claude-haiku-4-5`, `claude-sonnet-4-6`); Haiku 4.5 supports `temperature` (we use 1 for variety) but NOT `effort`.

## How to test the engine quickly
Create a temp script in `app/scripts/_tmp_*.ts` that loads `.env.local`, makes a Supabase client from `PROD_SUPABASE_URL`/`PROD_SUPABASE_SERVICE_KEY`, calls `assemblePalette` / `resolveIntentSemantic` / `synthesizeRitual`, prints, then delete it. The `/api/working/generate` route is auth-gated, so the lib path is the easy test surface.

---

## NEXT: Phase 5 — Practitioner UI

The UI lives at `/workbench/the-working` (currently a placeholder). Replace the placeholder with the full flow:

1. **Intent input** — text field (free-text). Calls `POST /api/working/generate`.
2. **Palette display** — show assembled components grouped (Timing / Materials / Symbols / Energetics / Patrons / Other). Each item shows name + narrative excerpt.
3. **Ritual display** — rendered markdown of the synthesized ritual.
4. **Save / Cast actions**:
   - "Save as draft" → `POST /api/working/save`
   - "I cast this" → save + immediately `POST /api/working/[id]/cast` (stamps conditions)
5. **My Workings list** — user's past workings with status badge (draft/cast), cast date, moon phase emoji, day ruler. Fetch from `GET /api/working`.
6. **Working detail** — full record + link to create a follow-up journal entry (set `working_id` on the new journal page).

Design notes: Workbench dark aesthetic, amber accent (tab active color is amber-500). The generate call takes 17–20s — show a loader. The ritual text is ~400–500 words markdown; render with prose styling.

Phase 6: community sharing — add `shared` status, public RLS policy on workings, community feed page.

## Git
- Branch `develop` and `main` are in sync. Commit messages end with the Co-Authored-By line. Push to `origin/develop`, then `git push origin develop:main` for production.
- Note: `main` is checked out in a worktree at `C:/tmp/Digital-Grimoire-main-prod` — use `git push origin develop:main` instead of checking out main locally.
