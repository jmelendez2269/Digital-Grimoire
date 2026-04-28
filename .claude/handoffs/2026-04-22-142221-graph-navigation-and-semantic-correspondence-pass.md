# Handoff: Graph Navigation And Semantic Correspondence Pass

## Session Metadata
- Created: 2026-04-22 14:22:21
- Project: `C:\Projects\Digital-Grimoire`
- Branch: `develop`
- Session duration: about 3-4 hours across graph import, UI, and validation passes

### Recent Commits (for context)
  - `26f4448` Add chapter 4 correspondence bundle and graph updates
  - `f55d044` Add correspondence profiles and graph bundle tooling
  - `ff6e5cf` Add graph tooling, auth flow, and dev workflow updates
  - `bb1bfcd` Fix TypeScript compatibility and lint issues
  - `03e9a9a` Fix TypeScript type compatibility for QueryableClient

## Handoff Chain

- **Continues from**: [2026-04-21-182409-correspondence-claims-backfill.md](./2026-04-21-182409-correspondence-claims-backfill.md)
  - Previous title: Correspondence Claims Backfill
- **Supersedes**: None

## Current State Summary

This session focused on making the correspondence graph truthful, more readable, and more semantically useful. The app now fetches the full correspondence graph deterministically, correspondence nodes are colored by category instead of collapsing into cyan, chapter 01 parser spillover was cleaned up, a conservative second-pass semantic relationship type (`shares_correspondence_with`) was added and imported live, and the graph UI now defaults to `Focused` mode with relationship-layer toggles. The most recent pass started improving actual navigation/visual handling in `SigmaGraph` by adding a camera HUD (`Fit`, `+`, `-`) and dense-graph label behavior; those changes are implemented and lint-clean in the touched files.

## Codebase Understanding

### Architecture Overview

The graph experience is split into three layers:
- `app/src/app/graph/page.tsx` orchestrates data fetching, filtering, scope selection (`focused` vs `full`), and passes entity/edge arrays into the renderer.
- `app/src/components/graph/SigmaGraph.tsx` is the actual Sigma.js canvas wrapper, responsible for layout reuse, hover behavior, labels, and camera interaction.
- `app/src/lib/graph/graphology-adapter.ts` converts raw correspondence/concept rows into Graphology nodes/edges with colors, sizes, and per-edge metadata.

The data pipeline is similarly layered:
- `app/scripts/build-book-section-bundle.js` parses a book section export into a graph bundle.
- `app/scripts/audit-graph-bundle.js` checks bundle quality and reports suspicious entities / relationship totals.
- `app/scripts/preview-graph-import.ts` diffs an incoming bundle against live Supabase state.
- `app/scripts/import-graph.ts` imports the bundle into Supabase through `graph-bundle.ts`.

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| [app/src/app/graph/page.tsx](/C:/Projects/Digital-Grimoire/app/src/app/graph/page.tsx) | Graph page orchestration, filtering, graph scope, relation-layer toggles | Main UI state for correspondence graph |
| [app/src/components/graph/SigmaGraph.tsx](/C:/Projects/Digital-Grimoire/app/src/components/graph/SigmaGraph.tsx) | Sigma renderer, hover/camera/layout behavior | Primary place to improve navigation and visual legibility |
| [app/src/lib/graph/graphology-adapter.ts](/C:/Projects/Digital-Grimoire/app/src/lib/graph/graphology-adapter.ts) | Node/edge color and size mapping into Graphology | Controls visual semantics of graph data |
| [app/src/components/admin/knowledge/CorrespondenceControls.tsx](/C:/Projects/Digital-Grimoire/app/src/components/admin/knowledge/CorrespondenceControls.tsx) | Search, category, graph scope, and link-layer controls | Current control surface for graph usability |
| [app/scripts/build-book-section-bundle.js](/C:/Projects/Digital-Grimoire/app/scripts/build-book-section-bundle.js) | Book section parser + bundle builder + semantic derived links | Core import logic for chapter bundles |
| [app/scripts/audit-graph-bundle.js](/C:/Projects/Digital-Grimoire/app/scripts/audit-graph-bundle.js) | Bundle audit and UI-fit reporting | Quick quality check after rebuilds |
| [graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-01-issues-intentions-and-powers-bundle.json](/C:/Projects/Digital-Grimoire/graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-01-issues-intentions-and-powers-bundle.json) | Latest rebuilt/imported chapter 01 bundle | Ground truth for the imported chapter |

### Key Patterns Discovered

- Correspondence graph edges use `weight`, while parallax edges may use `similarity`; most graph code normalizes via `edge.similarity ?? edge.weight ?? 0.5`.
- The graph page already has a `focused`/`full` scope abstraction for correspondence mode, so new navigation controls fit best there rather than in Sigma itself.
- `CorrespondenceControls` is the best place for user-facing layer toggles because it already owns search/category/scope filters.
- The import schema for correspondence relationships does **not** allow arbitrary confidence enums. Allowed values come from `app/scripts/graph-bundle.ts`: `established | interpretive | speculative | tradition`.
- Preview diffs on claims are noisy because the import path refreshes claims by deleting and reinserting grouped claims; this is expected.

## Work Completed

### Tasks Finished

- [x] Fixed "full graph" loading so correspondence edges/entities are fetched deterministically and paginated instead of arbitrarily capped
- [x] Improved correspondence graph readability with category-aware node colors and better label behavior
- [x] Cleaned parser spillover in chapter 01 and rebuilt the bundle
- [x] Added conservative semantic derived links (`shares_correspondence_with`) to chapter 01 bundle generation
- [x] Imported the corrected chapter 01 bundle into live Supabase
- [x] Confirmed `shares_correspondence_with` exists live with count `48`
- [x] Added graph relationship-layer toggles and changed correspondence mode to default to `Focused`
- [x] Added initial camera HUD and dense-graph label handling to `SigmaGraph`

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `app/src/app/api/graph/entities/route.ts` | Added deterministic pagination (`offset`, `total`, `hasMore`) | Make "full graph" truthful |
| `app/src/app/api/graph/edges/route.ts` | Added deterministic pagination and ordering | Remove arbitrary edge truncation |
| `app/src/app/graph/page.tsx` | Added paged full-graph loading, relationship-layer filtering, default `focused` graph scope, graph guidance copy | Improve truthfulness and usability |
| `app/src/components/parallax/ParallaxGraph.tsx` | Typing cleanup while wiring Sigma changes | Keep wrapper lint-clean |
| `app/src/components/graph/SigmaGraph.tsx` | Lowered label threshold earlier, added correspondence explainer, added derived-edge hover styling, then added camera HUD and dense-graph label behavior | Improve readability and navigation |
| `app/src/lib/graph/graphology-adapter.ts` | Category-aware node colors, deterministic fallback colors, edge-type colors, stronger derived-edge sizing | Make graph semantics visually legible |
| `app/src/components/admin/knowledge/CorrespondenceControls.tsx` | Added relationship-layer toggle controls and reset behavior | Let users progressively reveal graph complexity |
| `app/scripts/build-book-section-bundle.js` | Parser cleanup, plant label handling, subsection splitting, fragment filtering, continued-heading merge, derived semantic relationship generation, confidence fix to `interpretive` | Improve import quality and semantic structure |
| `app/scripts/audit-graph-bundle.js` | Suspicious entity detection and updated paged UI-fit reporting | Better bundle quality checks |
| `graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-01-issues-intentions-and-powers-parsed.json` | Rebuilt from cleaned parser output | Keep parsed export aligned with bundle |
| `graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-01-issues-intentions-and-powers-bundle.json` | Rebuilt with parser cleanup + semantic links | Imported live into correspondence graph |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Fix truthful full-graph loading before anything else | Start with UI polish, parser cleanup, or semantic links | The graph was materially lying about archive completeness due to capped unordered edges |
| Use a conservative `shares_correspondence_with` derived link | Aggressive co-occurrence network vs no derivation | Needed more mesh without turning the graph into unreadable noise |
| Derive semantic links only from `corresponds_to` targets | Include `associated_with` and other looser relations | Direct correspondences are a safer basis for semantic overlap |
| Set derived link confidence to `interpretive` | Use `derived` or `tradition` | `derived` violates DB constraint; `tradition` overstates certainty |
| Default correspondence graph to `Focused` mode | Keep `Full` as default | The screenshots show `Full` is visually overwhelming and harms trust/navigation |
| Add link-layer toggles before deeper layout surgery | Continue importing more chapters first | Users need control over graph complexity before the archive gets denser |

## Pending Work

## Immediate Next Steps

1. Open the graph page in a browser and visually test the new navigation HUD plus focused/layer-toggle flow against the exact "black blob" failure mode from the screenshots.
2. Refine `SigmaGraph` density behavior based on actual feel: likely adjust node fading, label threshold, and perhaps leaf-node size for large graphs.
3. If the navigation improvements feel solid, apply the same parser + semantic-link + preview/import workflow to chapter 02 and onward.

### Blockers/Open Questions

- [ ] Open question: should `shares_correspondence_with` be visible by default in `Focused` mode, or should semantic links start off hidden until the user opts in?
- [ ] Open question: do we want a stronger distinction between anchor nodes and leaf nodes in dense views, such as fading low-degree nodes more aggressively?
- [ ] Blocker: browser-level validation has not been run in this session, so visual quality is still inferred from code plus screenshots rather than directly tested.

### Deferred Items

- Apply the semantic-link pipeline to additional chapters after the navigation pass settles
- Consider explicit "show labels" / "reduce clutter" density presets if current focused mode still feels too busy
- Consider a dedicated "center selected node" behavior on click if browsing still feels loose

## Context for Resuming Agent

## Important Context

The core graph infrastructure is in a much better state than it was at session start. Chapter 01 is now live in Supabase with parser cleanup and 48 semantic overlap links. The graph page defaults to `Focused` mode and has relationship-layer toggles, which is the first real step toward making the graph usable instead of overwhelming. The remaining work is not about fixing broken data plumbing anymore; it is about the user experience of navigating dense graph regions. The next session should treat `SigmaGraph.tsx` as the main UX work surface and validate its behavior in-browser before making more data-side changes.

Also important: a misleading preview diff occurred once because preview and import were run in parallel. A later sequential preview confirmed the imported chapter is fully absorbed. Live verification also confirmed `shares_correspondence_with` count is `48` in `correspondence_relationships`.

### Assumptions Made

- The user wants continued progress rather than pausing for design discussion at each step.
- Improving navigation/legibility on the existing graph page is higher value right now than importing more chapters immediately.
- The current live graph relationship count beyond chapter 01 includes many other already-imported relationships, so raw live totals will be larger than the chapter bundle.

### Potential Gotchas

- `CorrespondenceControls.tsx` and `app/src/app/graph/page.tsx` now share default relationship-layer assumptions. If defaults change, update both or centralize them.
- `SigmaGraph.tsx` uses local layout caching keyed by node/edge content. Layout behavior can look "sticky" across refreshes because of `localStorage` + memory cache.
- Claims preview diffs will continue to show updates because the import path refreshes claim rows by delete+insert grouping; that is expected.
- The `react-hooks/refs` ESLint rule is strict in `SigmaGraph.tsx`. Avoid defining render-time handler arrays or closures that capture refs directly.
- `build-book-section-bundle.js` still uses CommonJS `require()` and will fail the repo lint rule if linted from `app/`; that is pre-existing script style, not introduced here.

## Environment State

### Tools/Services Used

- `node app/scripts/build-book-section-bundle.js --input ...chapter-01-issues-intentions-and-powers.json`
- `node app/scripts/audit-graph-bundle.js ...chapter-01-issues-intentions-and-powers-bundle.json`
- `npx.cmd tsx scripts/preview-graph-import.ts --input ../graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-01-issues-intentions-and-powers-bundle.json`
- `npx.cmd tsx scripts/import-graph.ts --input ../graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-01-issues-intentions-and-powers-bundle.json`
- `.\node_modules\.bin\eslint.cmd` from `app/` for targeted lint checks

### Active Processes

- No long-running dev server was started in this session.

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Related Resources

- [app/src/app/graph/page.tsx](/C:/Projects/Digital-Grimoire/app/src/app/graph/page.tsx)
- [app/src/components/graph/SigmaGraph.tsx](/C:/Projects/Digital-Grimoire/app/src/components/graph/SigmaGraph.tsx)
- [app/src/components/admin/knowledge/CorrespondenceControls.tsx](/C:/Projects/Digital-Grimoire/app/src/components/admin/knowledge/CorrespondenceControls.tsx)
- [app/src/lib/graph/graphology-adapter.ts](/C:/Projects/Digital-Grimoire/app/src/lib/graph/graphology-adapter.ts)
- [app/scripts/build-book-section-bundle.js](/C:/Projects/Digital-Grimoire/app/scripts/build-book-section-bundle.js)
- [app/scripts/audit-graph-bundle.js](/C:/Projects/Digital-Grimoire/app/scripts/audit-graph-bundle.js)
- [graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-01-issues-intentions-and-powers-bundle.json](/C:/Projects/Digital-Grimoire/graph-bundles/books/llewellyns-complete-book-of-correspondences/chapter-01-issues-intentions-and-powers-bundle.json)

---

**Security Reminder**: No secrets are included here. Validate again before future edits if more environment or connector context gets added.
