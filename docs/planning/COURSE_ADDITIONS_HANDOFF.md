# Course Additions Handoff

**Status:** Deferred — captured here so we can resume after the entity-narrative population is complete.

**Context:** Three public-domain books were imported into the library (Vivekananda, Kunz, Jastrow) plus seven copyrighted books staged in `docs/nonPD books/` for `external-passages/` drafting context. This document captures the course-curriculum work that follows from those additions, so it can be picked up cleanly later.

---

## 1. Three PD readings to add to existing courses

These books are already imported. The work is to update `courses.content.weeks[].readings[]` JSONB to reference them.

### Text IDs

| Book | `texts.id` | Title | Type |
|---|---|---|---|
| Vivekananda — *Raja Yoga* (1896) | `4ceb7c95-333d-4dcb-841f-b1cf5c3ddd9a` | Raja Yoga: Being Lectures by the Swami Vivekananda | `book_spiritual` |
| Kunz — *Curious Lore of Precious Stones* (1913) | `58f598f3-c0b8-4a3d-9b8e-c27e118b1c33` | The Curious Lore of Precious Stones | `book_esoteric` |
| Jastrow — *Religion of Babylonia and Assyria* (1898) | `81a0e477-89bf-4e60-b1c6-986fb631cafd` | The Religion of Babylonia and Assyria | `historical` |

### Placement table

Each row = one new entry in that week's `readings[]` array. `section` strings are draft framings — adjust after re-reading each week's question.

| Course slug | Week | Existing pairing this joins | Section framing (draft) |
|---|---|---|---|
| `fd03-the-body-breath-and-practice` | W2 *Breath* | Patanjali, Ramacharaka, Lao Tzu | Chapter on Pranayama — the practice and theory of breath control as the gateway to the higher rajayogic states |
| `fd03-the-body-breath-and-practice` | W4 *Attention and Its Training* | Marcus Aurelius, Patanjali, Ramacharaka | Chapters on Dharana and Dhyana — concentration as the prerequisite to meditation, meditation as the prerequisite to absorption |
| `fd03-the-body-breath-and-practice` | W5 *The Body Across Traditions* | Upanishads, Light On The Path, Gita | Introductory lectures on the four yogas — situating raja yoga as one of several paths the body is asked to walk |
| `c09-the-wisdom-of-the-east` | TBD — Hindu/meditation week | (verify with `survey-courses.ts --detail`) | Lectures on the practical philosophy of meditation as a Hindu modernizer presented it to a Western audience in 1896 |
| `c08-the-mystics-across-traditions` | TBD — Hindu mysticism week | (verify with `survey-courses.ts --detail`) | Chapters on samadhi and the unitive states — Vivekananda's account of mystical absorption in his own tradition's vocabulary |
| `fd01-mythic-imagination-from-classical-pattern-to-personal-meaning` | W2 *The Gods* | Berens, Jung, Bulfinch | Chapters on the Mesopotamian pantheon — what Babylonian and Assyrian deities reveal about an older, neighboring imagination than the Greek and Roman one |
| `c16-reading-the-colonizers-record` | TBD — late-19th-c ethnography week | (verify with `survey-courses.ts --detail`) | Selections framing Babylonian religion through 1898 Western scholarly conventions — a specimen of how Assyriology constructed its object |
| `c13-sacred-geometry-and-the-mathematical-cosmos` | TBD — material/folkloric week | (verify with `survey-courses.ts --detail`) | Chapters on the folkloric, medical, and astrological meanings attached to specific stones — material culture as a parallel mathematics |

### Outstanding work

1. Run `pnpm exec tsx scripts/survey-courses.ts --detail` and locate the correct week in `c08`, `c09`, `c13`, and `c16` for each placement.
2. Verify the JSONB shape of a reading entry — fields observed so far: `reading_id`, `title`, `author`, `section`. Confirm whether `section` is a separate field or baked into `title` (some existing entries like *"Zhuangzi — Trans. Herbert A. Giles, the Cook Ding story and the Butterfly Dream"* suggest the framing is sometimes in the title).
3. Write a migration or one-shot script that updates `courses.content` for each affected course. Pattern to follow: similar to existing course-update scripts in `app/scripts/`.

---

## 2. c18 — Dedicated African Diaspora Religions course (8 weeks)

**Decision rationale:** chosen over embedding ADR material into `c16-reading-the-colonizers-record` on cultural-reclamation grounds — see memory `project_adr_course.md`. The PD-only library constraint is reframed as part of the course's thesis: the shape of the source landscape (colonial ethnography in print, insider voices locked behind copyright) is itself evidence of what happened to the tradition.

### Proposed week structure

| Week | Question | PD readings | external-passages grounding |
|---|---|---|---|
| W1 | What is a diaspora religion, and how does it survive transit? | Newell *Folklore of the Bahamas* (1888); Puckett *Folk Beliefs of the Southern Negro* (1926) | Karade — intro chapters on Yoruba cosmological frame |
| W2 | Yoruba — the source tradition | Ellis *Yoruba-Speaking Peoples* (1894); Talbot *Peoples of Southern Nigeria* (1926) | Karade — orisha and cosmology chapters |
| W3 | What the colonial ethnographers got right and wrong | Ellis (re-read against insider voice); Rattray *Religion and Art in Ashanti* (1927) | Karade — methodological corrections |
| W4 | Haiti — Vodou as creole religion | Hearn *Two Years in the French West Indies* (1890); George Washington Cable on Louisiana Creole | Maya Deren — *Divine Horsemen* (1953) |
| W5 | Cuba and Brazil — Santería, Candomblé, syncretic naming | (sparse PD — likely a short week) | Joseph Murphy — *Working the Spirit* (1994); Migene González-Wippler — *Santería: The Religion* (1989) |
| W6 | Aesthetic logic across the diaspora | Talbot; Rattray on Ashanti art and ritual objects | Robert Farris Thompson — *Flash of the Spirit* (1983) |
| W7 | Women's voices, then and now | Owen *Voodoo Tales* (1893) — included as specimen of distortion | Luisah Teish — *Jambalaya* (1985); Zora Neale Hurston — *Tell My Horse* (1938, US copyright until ~2034) |
| W8 | Capstone | — | — |

### Books still to source

**PD foundation (for library import):**

| Book | Author | Year | Notes |
|---|---|---|---|
| *The Yoruba-Speaking Peoples of the Slave Coast* | A.B. Ellis | 1894 | Essential; free on archive.org. Classic colonial source on Yoruba religion. |
| *The Ewe-Speaking Peoples* | A.B. Ellis | 1890 | Optional companion. |
| *Religion and Art in Ashanti* | R.S. Rattray | 1927 | Essential. Rattray was unusually careful for the era. |
| *Folk Beliefs of the Southern Negro* | Newbell N. Puckett | 1926 | Essential — extensive Hoodoo folklore. Problematic framing but rich primary material. |
| *Folklore of the Bahamas* | W.W. Newell | 1888 | Short; useful. |
| *Two Years in the French West Indies* | Lafcadio Hearn | 1890 | Caribbean. |
| *The Peoples of Southern Nigeria* | P. Amaury Talbot | 1926 | Colonial ethnography. |
| *Voodoo Tales as Told Among the Negroes of the Southwest* | Mary Alicia Owen | 1893 | **Deeply problematic** — include only as a specimen of distortion in W7. |

**Copyrighted (for `external-passages/`):**

| Book | Author | Year | Notes |
|---|---|---|---|
| *Handbook of Yoruba Religious Concepts* | Baba Ifa Karade | 1994 | Have — in `docs/nonPD books/`. |
| *Divine Horsemen: The Living Gods of Haiti* | Maya Deren | 1953 | To acquire. |
| *Flash of the Spirit* | Robert Farris Thompson | 1983 | To acquire. |
| *Working the Spirit* | Joseph M. Murphy | 1994 | To acquire. |
| *Jambalaya* | Luisah Teish | 1985 | To acquire. |
| *Santería: The Religion* | Migene González-Wippler | 1989 | To acquire. |
| *Tell My Horse* | Zora Neale Hurston | 1938 | To acquire. US copyright until ~2034. |
| Awo Fá'lokun Fatunmbi — selected works | Fatunmbi | various | Optional, insider Ifa. |

### Alternative considered (rejected)

Embedding Karade as the insider counter-text into 1–2 existing weeks of `c16-reading-the-colonizers-record`. This was rejected on the grounds that ADR deserves the methodological focus of a dedicated course, not a footnote inside another. See `project_adr_course.md` for the full reasoning.

---

## Resuming this work

When ready to pick this back up:

1. Run `survey-courses.ts --detail` and inspect a sample reading entry to settle the `section` field convention.
2. Pick option (a) write a SQL migration in `migrations/` that updates the affected courses' `content` JSONB, or (b) write a TS script that fetches → mutates → upserts. Pattern (b) is consistent with the rest of `app/scripts/`.
3. Once the 3 PD additions are in place, draft `c18` as a new row in `courses` with the 8-week structure above. The course slug should follow the existing convention; `c18-african-diaspora-religions` is the suggested slot.
4. Begin sourcing the PD foundation books in parallel — most are free on archive.org or Project Gutenberg.
