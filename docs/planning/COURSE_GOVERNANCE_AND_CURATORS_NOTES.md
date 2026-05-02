# Prismarium Course Governance and Curator's Notes
## Decision Record v1.0

**Date:** May 1, 2026  
**Status:** Direction set; initial protection implemented  
**Scope:** Prismarium Courses, facilitator model, course IP, curator's notes

---

## Core Decision

Prismarium Courses should be generous without making the curriculum extractable.

The guiding model is:

> **Open canon, protected curriculum, licensed facilitators.**

This means the source traditions, reading lists, public-domain texts, and broad questions remain accessible. The specific Prismarium curriculum structure, original prompts, exercises, sequencing, micro-artifacts, capstones, language, and learning method remain protected as Prismarium-created work.

The aim is not to hoard knowledge. The aim is to give the work a home, a standard, and a container.

---

## What Stays Open

- Course title, premise, core question, level, and duration
- Week titles and short week summaries
- Reading lists and source-text references
- Public-domain source texts already available in the library
- Selected sample exercises or sample weeks when useful for trust-building
- Public-facing explanation of why the course exists

---

## What Stays Under Prismarium's Roof

- Full weekly instructions
- Lens Exercises
- Deep Search Practices
- Lens Engine Analysis prompts
- Graph Exploration prompts
- Synthesis Prompts
- Convergence Micro-Artifacts
- Capstone structures
- Course-specific language, sequencing, framing, and pedagogical method
- Community responses, facilitator notes, and guided cohort materials

These are the authored course experience, not merely a list of topics.

---

## Facilitator Model

The desired future model is not "anyone can copy the courses and teach them elsewhere." It is:

> People can teach Prismarium Courses as Prismarium facilitators.

Potential facilitator roles:

- **Study Circle Host:** Can lead informal groups through existing courses using Prismarium materials.
- **Prismarium Facilitator:** Approved teacher who can run cohorts, host discussions, and support learners under Prismarium standards.
- **Course Contributor:** Can propose annotations, supplemental notes, local adaptations, or new course modules for review.
- **Faculty / Lead Curator:** Trusted collaborator who can help design or revise canonical curriculum.

Facilitators may eventually have revenue share, cohort tools, teacher dashboards, or certification, but the canonical curriculum remains housed in Prismarium.

---

## Curator's Notes

Every course should include a **Curator's Note**. This is not marketing copy. It is the course's statement of care.

The note should answer:

1. **Why this course exists**
2. **What gap it serves in the larger curriculum**
3. **Why these texts were placed together**
4. **What kind of transformation or capacity the course is designed to support**
5. **What the course deliberately does not claim or attempt**
6. **How the course should be approached by students and facilitators**

Recommended length:

- Public preview: 150-250 words
- Internal/facilitator version: 400-800 words

Tone:

- Precise
- Humble
- Invitational
- Transparent about limits
- Protective of the tradition without becoming proprietary about wisdom itself

Example framing:

> This course was created because Hermeticism is often encountered through simplified modern summaries before students meet the older, stranger texts that gave those summaries life. It serves the curriculum by teaching students to hold outer, inner, and psychological readings of transformation at the same time. The course does not ask for belief in alchemical transmutation or initiatory hierarchies; it asks for disciplined attention to what the tradition claims before reducing it to metaphor, psychology, or error.

---

## Product Boundary

Prismarium should eventually support three course surfaces:

### 1. Public Preview

Visible to everyone.

Includes:

- Course metadata
- Curator's Note preview
- Course premise
- Learning outcomes
- Week titles and short summaries
- Reading list
- Sample exercise

Does not include:

- Full weekly instructions
- Full prompts
- Micro-artifact details
- Capstone instructions

### 2. Student Course Experience

Available to enrolled users.

Includes:

- Full weekly course content
- Exercises
- Journal/workbook integration
- Lens Engine and Graph prompts
- Micro-artifacts
- Capstone
- Community participation, if enabled

### 3. Facilitator Layer

Available to approved facilitators.

Includes:

- Internal Curator's Note
- Facilitation guidance
- Discussion prompts
- Common student difficulties
- Suggested cohort pacing
- Boundaries and safety notes
- What may and may not be adapted

---

## Legal and Licensing Direction

This is a product direction note, not legal advice.

Current desired licensing posture:

- **Source texts:** follow their public-domain, licensed, or third-party status.
- **Platform code:** separate software license.
- **General documentation:** may remain open or shareable where intended.
- **Courses:** All Rights Reserved unless explicitly licensed otherwise.
- **Public previews:** may be quoted/shared with attribution.
- **Full course materials:** personal educational use inside Prismarium; no reproduction, scraping, redistribution, resale, mirroring, or AI-training use without written permission.
- **Facilitators:** permission-based use under Prismarium terms.

The key distinction:

> The wisdom is accessible. The curriculum is authored.

---

## Implementation Next Steps

### Content Model

1. Add `curator_note_public` to course content. **Done.**
2. Add `curator_note_internal` for facilitator/admin use.
3. Add optional `week_summary` fields so public previews can show week shape without exposing full lessons.
4. Update the markdown course template to require a Curator's Note. **Done.**
5. Update the course parser to recognize `## CURATOR'S NOTE`. **Done.**
6. Add admin editing support for backfilling notes into already uploaded courses. **Done.**
7. Add a preview-first batch script for published-course curator note backfills. **Done.**

### Access Control

1. Split public course preview data from protected lesson data. **Done.**
2. Change `/api/courses/[id]` so anonymous users receive preview fields only. **Done.**
3. Require login/enrollment for `/courses/[slug]/learn`. **Done.**
4. Update Supabase RLS so full course content is not globally selectable. **Migration added.**
5. Keep admin access unrestricted.

### Facilitator Program

1. Define facilitator roles in product language.
2. Add a future `facilitator` user role or permission flag.
3. Create a "Teach This Path" interest/application flow.
4. Draft facilitator terms and adaptation boundaries.
5. Add facilitator notes to admin-only course editing.

### Legal Copy

1. Update the License page to distinguish courses from general documentation. **Done.**
2. Update Terms to prohibit unauthorized course reproduction, scraping, redistribution, resale, mirroring, and training-data use. **Done.**
3. Add visible course copyright/use notice inside course pages. **Done.**
4. Consider copyright registration for flagship course collections before or near public launch.
5. Consider trademark registration for Prismarium as the school/platform brand.

---

## Open Questions

- Should all logged-in users access full courses, or should courses belong to paid tiers?
- Should one complete course remain fully free as a public trust-builder?
- Should facilitators pay for certification, earn revenue share, or both?
- Should community-created course additions be reviewed before appearing publicly?
- Should Curator's Notes be signed by a person, by Prismarium, or both?

---

## Current Recommendation

For launch:

1. Make course previews public.
2. Require a free account to enroll and access the full course.
3. Keep AI-heavy and community/facilitator features in paid tiers.
4. Mark all Prismarium-authored course materials as protected.
5. Add Curator's Notes to every course before publishing.

This preserves generosity while protecting the authored learning instrument.
