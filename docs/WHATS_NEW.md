# What's New in Prismarium

*Last updated: May 2026*

This is the running changelog of user-visible features in Prismarium (a Project Parallax product). For the editorial naming model, see `docs/planning/PRISMARIUM_RENAME_MATRIX.md`. For older sprint-style notes, see entries under [Earlier Releases](#earlier-releases) and the `docs/archive/` tree.

---

## Spring 2026 — Reading Digests & Prismatic Learning

### Reading Digests (new)

Every curated reading in a course or arc now ships with a long-form **Reading Digest** (~600–1,300 words) that distills the source's argument, anchor passages, contradictions, and study prompts.

- **Where:** Course detail pages and the per-course learn surface at `/courses/<slug>/learn`.
- **For admins:** Draft → review → promote queue at `/admin/reading-blurbs`; digests stored in `reading_blurbs`.
- **Docs:** [User guide](/wiki/reading-digests), [Technical reference](/admin/wiki/reading-digests).

### Prismatic Learning (rebrand + 4-tab structure)

The Courses surface is now branded **Prismatic Learning** and reorganised around four tabs:

| Tab | What it is |
|---|---|
| **Catalog** | Individual courses you can start today. |
| **Arcs** | Multi-course bundles around a single throughline. |
| **Paths** | Long-form, multi-arc study plans. |
| **Map** | Visual map of how the offerings connect. |

The "Active Transmissions" rail was removed, the tab font sizing was tuned for legibility, and paid courses are clearly marked and gated.

- **Docs:** [User guide](/wiki/courses).

### Curator Notes — draft workflow

Curator notes and long summaries now move through a **draft → review → promote** lifecycle backed by the OpenRouter client, with a clean OCR pipeline feeding the drafter. Admins review and edit drafts at `/admin/curator-notes` before they go live.

- **Docs:** [Technical reference](/admin/wiki/curator-notes); editorial framework in `docs/CURATORS_NOTE_FRAMEWORK.md`.

---

## Winter 2025–2026 — Corpus Collections & Seven Lenses

### Seven Lenses (was: Parallax Engine)

The 7-lens AI reasoning surface has been renamed **Seven Lenses** and now lives at `/seven-lenses` (the legacy `/parallax-engine` route is preserved). Desktop nav labels it **Parallax Search**; mobile nav labels it **Seven Lenses**.

- **What's new:** Lens-intensity selectors, response-length control, and per-user "Save as Default" for lens calibrations.
- **Subscription:** Premium feature with a tiered rate limit shown on the page.
- **Docs:** [User guide](/wiki/parallax-engine), [Technical reference](/admin/wiki/lenses).

### Corpus Collections — nested library shells

Large multi-book corpora now appear as a single library card that expands into grouped sub-books.

- **Shipped shells:** King James Bible (OT / NT groups), Bible Apocrypha.
- **Pipeline:** Sacred Texts parser detects book-index pages, splits sub-books, and skips redundant AI metadata enhancement on the children; a batch import button on the corpus viewer pulls each linked sub-book. The Puppeteer fallback restores access when Sacred Texts returns a 403.
- **Uploads:** Plain-text (`.txt`) books are accepted alongside PDFs.
- **Docs:** [Technical reference](/admin/wiki/corpus-collections).

### Brand: Prismarium / Project Parallax

- **Prismarium** is the live product name; **Project Parallax** is the brand house.
- Legacy `Parallax` names are retained in internal routes, APIs, and component names per the rename matrix.
- Canonical domain is now Prismarium-first; Google OAuth and onboarding flows updated accordingly.

---

## Earlier Releases

### Sprint 4 (October 2025) — Library Enhancements

Foundational library work: PDF document viewer, advanced filters, smart pagination, and the document detail page with viewer / metadata / content tabs. See `docs/archive/` for the full sprint notes.

### Earlier

- Knowledge Graph migrated to Sigma.js v3 + Graphology with density controls.
- Text-to-Speech integrated for library reading.
- AI metadata extraction, OCR fallbacks, and admin interface improvements.
- Convergence-era brand docs preserved as historical references under `docs/archive/`.

---

## Where to Read More

- **User wiki:** `/wiki` (entrypoint for end-user docs).
- **Technical wiki:** `/admin/wiki` (architecture and admin workflows).
- **Naming source of truth:** `docs/planning/PRISMARIUM_RENAME_MATRIX.md`.
- **Roadmap and backlog:** `docs/planning/PROJECT_ROADMAP.md`, `docs/planning/FEATURE_BACKLOG.md`.
