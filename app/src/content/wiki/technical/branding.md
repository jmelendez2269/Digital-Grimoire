---
title: Branding & Design Guidelines
type: specification
status: stable
audience: design
description: Brand guidelines for Prismarium, the Project Parallax brand house, and legacy Parallax technical naming.
---

# Branding & Design Guidelines

## BRAND IDENTITY

### Official Name

**Prismarium**

### Brand House

**Project Parallax**

### Internal Prototype Name

*Convergence* (Used for legacy engine code and database schemas)

### Tagline

"Know Your Craft, Practice Your Craft."

### Alternative Taglines

- "Where Hidden Wisdom Reveals Our Unity"
- "Explore Truth Through Multiple Lenses"
- "The Plurality of Knowing"

---

## MISSION & POSITIONING

### Core Mission

**Prismarium makes hidden wisdom accessible through a synthesis of curated perspectives.** Project Parallax is the brand house behind the product. Together they bridge esoteric traditions, religious texts, philosophical works, and consciousness-exploring sciences to reveal how all wisdom paths converge toward understanding ourselves, our world, and our universe.

### What We Are

**Prismarium is an exploration platform, not an authority.** Based on the principle that "Knowing Is Plural," we provide the tools to view complex ideas through distinct epistemological lenses. `Project Parallax` should be used when referring to the brand house, while `Parallax` remains in some routes and internal technical namespaces.

### Naming Note

- Use `Prismarium` for product UX, public docs, and service references.
- Use `Project Parallax` for the parent brand or brand-house layer.
- Keep legacy `Parallax` names for internal routes, APIs, and technical namespaces unless a later refactor explicitly changes them.

### The Five Core Pillars

1. **Prismatic Learning (Courses):** Systematic guidance through wisdom traditions. The `/courses` surface is organised into Catalog, Arcs, Paths, and Map tabs and includes long-form **Reading Digests** for each curated reading.
2. **The Study Journal:** A private research workspace for documentation, passage clipping, and building interconnected knowledge networks using wiki-links.
3. **The Prismarium Library:** A filtered synthesis of foundational texts that bridge multiple perspectives, rather than an unfiltered archive. Includes corpus collection shells (e.g. King James Bible, Bible Apocrypha) that nest sub-books inside their parent corpus in the library grid.
4. **The Ritual Machine:** A practice-oriented toolset for ritual inventory, correspondence planning, and documenting personal craft.
5. **Seven Lenses (Prismarium Lens Engine):** A 7-lens AI reasoning system that maintains coherence in the presence of contradiction. Lives at `/seven-lenses`; legacy `/parallax-engine` is retained for backwards compatibility.

---

## THE SEVEN LENSES

Every text and concept in Prismarium is analyzed through these seven distinct instruments of knowing:

1. **Scientific** - Physics, biology, cosmology, empirical evidence.
2. **Psychological** - Jungian archetypes, cognitive science, depth psychology.
3. **Philosophical** - Metaphysics, ethics, epistemology, ontology.
4. **Religious/Spiritual** - Comparative theology, mysticism, sacred texts.
5. **Historical/Anthropological** - Cultural evolution, mythology, ritual context.
6. **Symbolic/Occult** - Correspondences, alchemy, astrology, esoteric systems.
7. **Mathematical** - Sacred geometry, patterns, universal ratios.

---

## PHILOSOPHY & PRINCIPLES

### 1. Knowing Is Plural

No single lens is final. Error arises not from using a lens—but from forgetting that it is one.

### 2. Synthesis is a Discipline

Synthesis is the trained ability to hold multiple, incompatible truths without collapsing them into false unity.

### 3. Questions are Primary

Every course and feature is structured around inquiry, not doctrine. Certainty is not mastery; restraint is.

### 4. Transformation is Structural

We emphasize the slow reconfiguration of mental models over sensational breakthroughs. Transformation occurs when structures of meaning reorganize.

### 5. Metaphysical Literacy

We don't promote a single metaphysical doctrine. Instead, we surface metaphysical commitments and compare them across traditions.

---

## VISUAL IDENTITY

### Design Concept: "The Scholar's Study at Midnight"

Evokes intellectual depth, quiet contemplation, and mystery. Dark Academia aesthetic with modern usability.

### Color Palette (Parallax Shift)

- **Primary Background:** #0A1212 (Near-black forest)
- **Secondary Background:** #0D1425 (Deep midnight slate)
- **Core Accent:** #22D3EE (Parallax Cyan/Convergence Blue)
- **Secondary Accent:** #B48F4A (Aged Brass/Gold)
- **Alert/Warning:** #8B2E2E (Deep Burgundy)

### Typography

- **Headings:** Garamond Premier Pro / Cormorant Garamond (Serif)
- **Body:** Inter / Source Sans Pro (Sans-serif)
- **Mono:** Fira Mono (Data/Metadata)

---

## COMPONENT NAMING

| Component | Public Brand Name | Internal Route(s) |
|-----------|-------------------|-------------------|
| The Library | Prismarium Library | `/library` |
| Study Journal | The Journal | `/journal` |
| Correspondence Tables | Correspondences | `/correspondences` |
| The Convergence Graph | Prismarium Graph / Knowledge Graph | `/graph` (canonical), `/parallax-graph` (legacy alias) |
| *Atmospheric Subtitle* | Neural Interface | (Visual Identity) |
| The Convergence Machine | **Seven Lenses** (a.k.a. Prismarium Lens Engine; nav label *Parallax Search*) | `/seven-lenses` (canonical), `/parallax-engine` (legacy) |
| Convergence School | Prismatic Learning (Courses) | `/courses` |
| Reading Digest | Reading Digest | Surfaced on `/courses/[slug]/learn`; review queue at `/admin/reading-blurbs`; stored in `reading_blurbs` |
| Curator Note (draft / approved) | Curator Note | Embedded in reader; drafts managed under `/admin/curator-notes` |

---

## VERSION HISTORY

- **v2.1** - May 2026 - Renamed Parallax Engine to **Seven Lenses**; added Reading Digests, Prismatic Learning 4-tab structure, corpus collection shells, and curator-note draft workflow.
- **v2.0** - February 2026 - Major Pivot to Project Parallax. Integrated School, Journal, and Ritual Machine vision.
- **v1.1** - November 2025 - Initial Convergence Brand docs.
