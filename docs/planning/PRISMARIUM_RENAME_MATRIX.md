# Prismarium Rename Matrix

**Status:** Draft source of truth for staged rename work
**Date:** 2026-04-16
**Scope:** Editorial and public-facing brand cleanup only

## Purpose

This document defines the naming rules for the current repo so we can complete the rebrand as a controlled editorial cleanup instead of a risky global find/replace.

The repo currently contains four active naming layers:

| Term | Current role in repo | Typical location |
|---|---|---|
| `Prismarium` | Live product name | app metadata, navigation, auth, legal pages |
| `Project Parallax` | Parent brand / house brand | wiki, technical branding docs, some UX copy |
| `Parallax` | Internal engine/system namespace and some public feature labels | routes, APIs, components, docs |
| `Digital Grimoire` / `Convergence` | Historical names | legacy docs, planning docs, archived UX copy |

## Locked Naming Rules

Use these rules as the editorial source of truth for pass one:

| Situation | Approved name |
|---|---|
| Product name in public UX | `Prismarium` |
| Parent brand / company / brand house | `Project Parallax` |
| First mention in docs when both matter | `Prismarium, a Project Parallax product` |
| Short product references after first mention | `Prismarium` |
| Short brand-house references after first mention | `Project Parallax` or `Parallax` only when the brand-house context is already explicit |
| Legacy/internal engine names already tied to code or routes | Keep existing internal `Parallax` naming unless we intentionally do a later technical refactor |

## Do Not Rename In Pass One

These should stay unchanged for the editorial cleanup:

- Internal routes such as `/parallax-engine`, `/parallax-graph`, and `api/parallax/*`
- Component, type, schema, and folder names such as `ParallaxGraph`, `ParallaxLoader`, `lib/parallax`, and related code symbols
- Existing technical namespaces where `Parallax` refers to the engine/system rather than the public product name
- Historical and archived documents that describe earlier brand states, unless we are only adding a short archival note

## Rename Matrix

Use this table during implementation.

| Current term | Replace with | Where to use it | Where not to use it |
|---|---|---|---|
| `Project Parallax` | `Prismarium` | Product UI, user-facing docs, product descriptions, CTAs, page titles, legal references to the service | When referring to the parent brand or company layer |
| `Project Parallax platform` | `Prismarium` or `the Prismarium platform` | User docs, legal copy, metadata, onboarding copy | Brand-house or corporate references |
| `Project Parallax Library` | `Prismarium Library` | User guides and public copy about the library experience | Internal technical names or historical docs |
| `The Parallax Library` | `Prismarium Library` | Public-facing library naming | Internal namespace descriptions |
| `The Parallax Engine` | `Prismarium Lens Engine` in prose, keep `/parallax-engine` route | AI feature descriptions, help text, disclaimers, onboarding | Route names, API namespaces, component/file names in pass one |
| `Parallax Graph` | `Prismarium Graph` or `Knowledge Graph` where clearer | Public doc headings and explainer copy | Route names or component/file names in pass one |
| `Project Parallax Academy` / `Parallax School` | `Prismarium Courses` unless a distinct academy brand is intentionally retained | User-facing course docs and product copy | Historical brand strategy docs |
| `Digital Grimoire` | Usually `Prismarium`; sometimes archive note only | Stray public UX, active docs still used by the team | Historical planning docs that intentionally preserve prior naming |
| `Convergence` | Usually preserve as historical term; otherwise rewrite to product-specific language only when the doc is still active | Superseded docs that need a short note, or active UX strings that accidentally survived | Schema names, migration names, archived planning, internal historical references |

## First-Wave Files To Update

These are the safest, highest-value files for the actual rename pass.

### Public app copy and metadata

| File | Why it matters | Current state |
|---|---|---|
| `app/src/app/layout.tsx` | Global metadata and schema.org identity | Already `Prismarium`, should remain the product source of truth |
| `app/src/app/(home)/layout.tsx` | Home metadata | Already `Prismarium`, verify no mixed brand copy |
| `app/src/components/Header.tsx` | Primary navigation and search entrypoint | Product logo is `Prismarium`; still links to `/parallax-engine` and uses legacy feature naming |
| `app/src/components/Footer.tsx` | Global footer and copyright | Mixed but close to target; already uses `A PROJECT PARALLAX PRODUCT` |
| `app/src/components/DashboardView.tsx` | Logged-in landing copy | Needs review for mixed product naming |
| `app/src/app/terms/page.tsx` | Service/legal naming | Mostly `Prismarium`; likely needs line-by-line legal review for service/operator wording |
| `app/src/app/license/page.tsx` | Trademark, copyright, service naming | High-risk legal wording; needs careful review |
| `app/src/app/cookies/page.tsx` | Policy/service naming | Mostly `Prismarium`; verify service/operator references |
| `app/src/app/ai-disclaimer/page.tsx` | AI feature naming and liability wording | Uses `Prismarium` plus `Prismarium lens engine`; review for consistency |

### Wiki entrypoint and user docs

| File | Recommended direction |
|---|---|
| `app/src/content/wiki/index.md` | Reframe as `Prismarium Wiki` and explain `Project Parallax` only as the brand house |
| `app/src/content/wiki/user/home.md` | Replace `Project Parallax Dashboard` with product-first naming |
| `app/src/content/wiki/user/courses.md` | Rewrite around `Prismarium Courses` |
| `app/src/content/wiki/user/graph.md` | Make product-first and clarify public name vs internal route if needed |
| `app/src/content/wiki/user/journal.md` | Verify this is purely `Prismarium` |
| `app/src/content/wiki/user/library-search-bar.md` | Replace `Project Parallax Library` with `Prismarium Library` |
| `app/src/content/wiki/user/parallax-engine.md` | Keep page/route slug, but explain it as the `Prismarium Lens Engine` |

### Technical wiki docs

| File | Recommended direction |
|---|---|
| `app/src/content/wiki/technical/branding.md` | Be explicit: `Prismarium` product, `Project Parallax` brand house, `Parallax` internal system namespace |
| `app/src/content/wiki/technical/home.md` | Product-first overview with naming note |
| `app/src/content/wiki/technical/dashboard.md` | Check for mixed product naming |
| `app/src/content/wiki/technical/lenses.md` | Clarify public name vs engine namespace |
| `app/src/content/wiki/technical/knowledge-graph.md` | Clarify public name vs route/component names |

### Intro and legal wiki docs

| File | Recommended direction |
|---|---|
| `app/src/content/wiki/intro/vision.md` | This is heavily `Project Parallax`-led and should either be rewritten or marked as historical vision language |
| `app/src/content/wiki/intro/curriculum-philosophy.md` | Product-first rewrite |
| `app/src/content/wiki/intro/collection-philosophy.md` | Product-first rewrite |
| `app/src/content/wiki/legal/disclaimers.md` | Convert service references to `Prismarium` while preserving legal precision |

## Historical Docs Policy

Do not normalize historical docs by default. Use one of these two treatments:

| Doc type | Treatment |
|---|---|
| Still operational and used by the team | Rewrite to current naming if it guides present-day work |
| Clearly historical snapshot | Preserve original wording and prepend a short note such as `Historical document - superseded by the Prismarium / Project Parallax naming model.` |

High-probability historical docs:

- `docs/BRANDING.md`
- `docs/GO_TO_MARKET_MESSAGING.md`
- `docs/planning/Project_Parallax_Session_Handoff.md`
- Older sprint summaries and migration-era docs using `Digital Grimoire` or `Convergence`

## Suggested Implementation Order

1. Finalize this naming matrix.
2. Update app metadata, nav, footer, and high-visibility UX copy.
3. Update wiki homepage and core user docs.
4. Update technical wiki docs with a short naming note where needed.
5. Review legal and trust pages line by line.
6. Mark historical docs as superseded instead of fully rewriting them.
7. Decide later whether a second pass should rename internal technical identifiers.

## Notes From Current Repo Audit

Observed on 2026-04-16:

- `app/src/app/layout.tsx` is already strongly `Prismarium`-first.
- `app/src/components/Footer.tsx` already uses the preferred pattern `A PROJECT PARALLAX PRODUCT`.
- `app/src/content/wiki/index.md` is still explicitly `Project Parallax Wiki`.
- `app/src/content/wiki/user/home.md`, `courses.md`, `library-search-bar.md`, and `parallax-engine.md` still carry older product naming.
- `docs/BRANDING.md` is a clearly historical `Convergence` artifact and should not be blindly rewritten.

## Definition Of Done For Pass One

Pass one is complete when all of the following are true:

- Public app copy consistently presents the product as `Prismarium`
- `Project Parallax` appears only where the brand house is actually intended
- Public docs explain legacy `Parallax` names when they remain in routes or feature slugs
- Legal pages use one consistent service name pattern
- Historical docs are either preserved as-is or clearly marked as superseded
