# Unused Course Books Audit

_Generated 2026-05-14T15:13:12.089Z from `scripts/courses.json`, `scripts/texts.json`, and `scripts/library-grid.csv`._

## Summary

- Courses scanned: **19**
- Library texts scanned: **106**
- Course reading occurrences scanned: **365**
- Library texts matched to at least one course reading: **74**
- Library texts not matched to any current course reading: **32**
- Likely title/alias cleanup rather than true curriculum gaps: **9**
- Strongly unused, with no near-match course demand: **23**

The course export currently has no explicit `course_texts` links, so this audit uses the same fuzzy title/author matching approach as `scripts/audit-course-books.mjs`: a reading counts as using a library text when the best score is at least 60.

Near matches below the threshold are marked as title/alias cleanup. These are books that may be conceptually used by a course but not reliably matched by the current data.

## Unused by Tradition

| Tradition | Unused books |
|---|---:|
| Unmapped in CSV | 10 |
| Jewish | 2 |
| Rosicrucian | 2 |
| Science / Evolution | 2 |
| Western Esotericism | 2 |
| Astrology | 1 |
| Comparative Mythology | 1 |
| Depth Psychology | 1 |
| Egyptian Religion | 1 |
| Greco-Roman Mythology | 1 |
| Grimoires | 1 |
| Hermeticism | 1 |
| Mathematics / Geometry | 1 |
| Practical Philosophy | 1 |
| Science / Astronomy | 1 |
| Science / Optics | 1 |
| Strategy / Political Thought | 1 |
| Theosophy | 1 |
| Yoga / Indian | 1 |

## Unused by Domain

| Domain | Unused books |
|---|---:|
| Unmapped in CSV | 10 |
| Evolution | 2 |
| Judaism | 2 |
| Rosicrucianism | 2 |
| Astrology | 1 |
| Astronomy | 1 |
| Ceremonial Magic | 1 |
| Comparative Mythology | 1 |
| Egyptian Religion | 1 |
| Elemental Beings | 1 |
| Geometry | 1 |
| Greco-Roman Mythology | 1 |
| Grimoires | 1 |
| Hermeticism | 1 |
| Optics | 1 |
| Practical Philosophy | 1 |
| Psychoanalysis | 1 |
| Strategy | 1 |
| Theosophy | 1 |
| Yoga | 1 |

## Title/Alias Cleanup

These books appear unused by strict matching, but course readings point near them. Fixing aliases, course titles, or metadata would likely convert them from "unused" to "used."

| ID | Library title | Author | Near course demand | Best course-reading title |
|---|---|---|---|---|
| T075 | The Book of the Dead: The Papyrus of Ani in the British Museum | E. A. Wallis Budge | The Hermetic Tradition; The Hero's Journey: Why This Pattern Won't Leave Us Alone | The Egyptian Book of the Dead (59) |
| - | Dialogues Concerning Natural Religion | David Hume | The Western Philosophical Inheritance | The Natural History of Religion (59) |
| - | Sefer Yetzirah & Saadia’s Commentary | Saadia ben Joseph | Sacred Geometry and the Mathematical Cosmos; Symbol, Myth, and Psychotechnology; The Qabalah and the Tree of Life | Sepher Yetzirah (59) |
| - | The Harmony of the World (Harmonice Mundi) | Johannes Kepler | Correspondence, Analogy, and Hidden Order; Sacred Geometry and the Mathematical Cosmos; Symbol, Myth, and Psychotechnology | Harmonices Mundi Book V (59) |
| - | The Hermetic Museum, Vol. I | Arthur Edward Waite | The Hermetic Tradition | The Hermetic Museum Volume 1 (59) |
| - | The Tao Teh King, or the Tao and its Characteristics | Laozi | Ethics Without Absolutes; How Humans Know What They Know; How to Hold Two Things at Once; The Map Is Not the Territory; The Wisdom of the East | Tao Te Ching (59) |
| - | The World as Will and Idea (Vol. 2 of 3) | Arthur Schopenhauer | Correspondence, Analogy, and Hidden Order; Synthesis as a Practice; The Map Is Not the Territory; What Science Can and Can't Say | The World as Will and Representation (59) |
| - | The Yî King | James Legge | Correspondence, Analogy, and Hidden Order; Symbol, Myth, and Psychotechnology; The Wisdom of the East | I Ching (59) |
| - | Thus Spake Zarathustra: A Book for All and None | Friedrich Nietzsche | Ethics Without Absolutes; Reality Cracks and Liminal States; Symbol, Myth, and Psychotechnology; The Hero's Journey: Why This Pattern Won't Leave Us Alone; The Western Philosophical Inheritance | Thus Spoke Zarathustra (59) |

## Strongly Unused Books

These have no strict course match and no near-match course reading demand in the current export.

| ID | Title | Author | Tradition | Domain | Priority | Layer | PD status |
|---|---|---|---|---|---|---|---|
| T046 | Christian Astrology - Volume II | William Lilly | Astrology | Astrology | P2 | Core | Clear |
| T062 | Bulfinch's Mythology | Thomas Bulfinch | Comparative Mythology | Comparative Mythology | P3 | Core | Clear |
| T054 | Beyond the Pleasure Principle | Sigmund Freud | Depth Psychology | Psychoanalysis | P3 | Core | Clear |
| T063 | Bulfinch's Mythology: The Age of Fable | Thomas Bulfinch | Greco-Roman Mythology | Greco-Roman Mythology | P3 | Core | Clear |
| T093 | The Book of Ceremonial Magic | Arthur Edward Waite | Grimoires | Grimoires | P4 | Core | Clear |
| T013 | The Emerald Tablets of Thoth the Atlantean | Doreal | Hermeticism | Hermeticism | P1 | Core | Clear |
| T085 | Jewish Magic and Superstition | Joshua Trachtenberg | Jewish | Judaism | P3 | Source Corpus | Verify |
| T085 | Jewish Magic and Superstition: A Study in Folk Religion | Joshua Trachtenberg | Jewish | Judaism | P3 | Source Corpus | Verify |
| T083 | A Treatise on the Circle and the Sphere | Lowell Coolidge Julian | Mathematics / Geometry | Geometry | P3 | Core | Clear |
| T061 | The Art of Worldly Wisdom: A Pocket Oracle | Baltasar Gracián | Practical Philosophy | Practical Philosophy | P3 | Core | Clear |
| T106 | The Real History of the Rosicrucians | Arthur Edward Waite | Rosicrucian | Rosicrucianism | P2 | Core | Clear |
| T106 | The Real History of the Rosicrucians | Arthur Edward Waite | Rosicrucian | Rosicrucianism | P2 | Core | Clear |
| T080 | Mechanism of the Heavens | Mary Fairfax Greig Somerville | Science / Astronomy | Astronomy | P3 | Core | Clear |
| T057 | Evidence as to Man's Place in Nature | Thomas Henry Huxley | Science / Evolution | Evolution | P3 | Core | Clear |
| T022 | The Descent of Man, and Selection in Relation to Sex | Charles Darwin | Science / Evolution | Evolution | P2 | Core | Clear |
| T066 | The Principles of Light and Color | Edwin Babbitt | Science / Optics | Optics | P3 | Core | Clear |
| T041 | The Art of War | Sunzi | Strategy / Political Thought | Strategy | P2 | Core | Clear |
| T098 | Light On The Path and Through the Gates of Gold | Mabel Collins | Theosophy | Theosophy | P4 | Core | Clear |
| T096 | The Practice of Magical Evocation: A Complete Course | Franz Bardon | Western Esotericism | Ceremonial Magic | P4 | Source Corpus | Verify |
| T095 | Comte de Gabalis | Abbé N. de Montfaucon de Villars | Western Esotericism | Elemental Beings | P4 | Core | Clear |
| T097 | The Science of Breath: The Essential Works of Yogi | Yogi Ramacharaka, Joel Fotinos | Yoga / Indian | Yoga | P4 | Core | Clear |
| - | Essays by Ralph Waldo Emerson | Ralph Waldo Emerson | - | - | - | - | - |
| - | The Veil of Isis | H.P. Blavatsky | - | - | - | - | - |

## Curriculum Reframe

The unused books should not all be forced into the existing 15-course spine. Several of them are better understood as new entry doors or separate tracks. This is especially true for the nature, body, myth, and strategy material: those courses can be beginner-friendly foundations rather than awkward insertions between advanced courses.

Recommended model: keep the current core spine intact, then add course families around it.

- **Core Spine**: the existing Prismarium sequence for deep multi-lens synthesis.
- **Beginner / Foundation Doors**: gentler first courses organized around story, nature, body, and practical discernment.
- **Advanced Practice Tracks**: tradition-specific, ritual, and modern esoteric material that needs stronger guardrails.
- **Visual / Mathematical Imagination**: form, light, geometry, astronomy, and symbolic perception.

## Proposed Course Families

### Beginner / Foundation Doors

- Role: New entry courses that do not require the learner to start with the dense core spine.
- Suggested sequence: Mythic Imagination: From Classical Pattern to Personal Meaning -> Nature, Evolution, and the Living Cosmos -> The Body, Breath, and Practice -> Strategy, Power, and Discernment
- How it fits: These are not lesser courses. They are first doors into Prismarium: story, nature, body, and practical discernment.

### Esoteric Practice / Modern Invention

- Role: Advanced path for ritual systems, grounded tradition, and modern esoteric history.
- Suggested sequence: Jewish Esoteric Practice: Text, Law, Folk Religion -> Ritual, Magic, and the Architecture of Practice -> Rosicrucians, Theosophy, and Modern Esoteric Invention
- How it fits: This should not be a beginner path. It is where the platform can handle occult material maturely: context first, practice second, critique and invention third.

### Visual / Mathematical Imagination

- Role: A visual-symbolic path that can be beginner-friendly or intermediate depending on framing.
- Suggested sequence: Form, Number, and Vision
- How it fits: This path connects geometry, optics, astronomy, color, and symbolic perception. It can later expand into more visual courses or constellations.

## Candidate Course Placement

| Course candidate | Family / door | Beginner readiness | Relationship to the other candidates |
|---|---|---|---|
| The Body, Breath, and Practice | Foundation Door: Embodied Knowing | Good beginner course if framed around direct experience, breath, attention, and disciplined response rather than advanced ritual theory. | Pairs naturally with Nature, Evolution, and the Living Cosmos. Nature gives the organism/cosmos frame; Body, Breath, and Practice brings it into lived practice. |
| Nature, Evolution, and the Living Cosmos | Foundation Door: Nature and Scale | Strong beginner course because it starts from observable life, bodies, evolution, heavens, light, and place before asking heavier metaphysical questions. | The most grounded entry point in the unused set. It can prepare students for C04 later without requiring them to begin inside epistemology. |
| Ritual, Magic, and the Architecture of Practice | Practice Door: Ritual Systems | Not beginner. This should come after students have symbolic literacy and strong discernment guardrails. | Middle course in an Esoteric Practice track: tradition context first, ritual architecture second, modern invention and critique third. |
| Mythic Imagination: From Classical Pattern to Personal Meaning | Foundation Door: Story and Symbol | Probably the easiest beginner course in the set. It can meet people through stories before asking them to hold complex multi-lens theory. | Works as the front door to C02, but does not need to be subordinate to C02. It can stand as a first course for myth-oriented learners. |
| Rosicrucians, Theosophy, and Modern Esoteric Invention | Practice Door: Modern Esoteric History | Not beginner unless heavily reframed. Best after students have enough context to distinguish tradition, reception, invention, and modern mythmaking. | Final course in the Esoteric Practice/Invention track. It asks students to evaluate modern esoteric claims without flattening them into fraud or truth. |
| Strategy, Power, and Discernment | Foundation Door: Discernment Under Pressure | Can be beginner if practical and scenario-based. It should be framed as discernment, timing, restraint, and self-command rather than conquest. | Completes the beginner foundation set by asking what wisdom looks like when there are stakes, conflict, fear, or urgency. |
| Form, Number, and Vision | Foundation or Intermediate Door: Pattern and Perception | Could be beginner if taught visually and experientially; intermediate if taught as sacred geometry theory. | Connects the science/nature cluster with the symbol/myth cluster through perception: form, light, heavens, color, and proportion. |
| Jewish Esoteric Practice: Text, Law, Folk Religion | Practice Door: Grounded Tradition Before Ritual Comparison | Not beginner. It needs careful framing, tradition-specific respect, and appropriation/discernment guardrails. | Best placed before Ritual, Magic, and the Architecture of Practice so ritual comparison starts from a grounded tradition rather than generalized occultism. |

## Infrastructure Integration Plan

The current course infrastructure appears built around individual courses and a mostly flat catalog. Before implementing tracks in the product, treat this as a staged rollout.

### Phase 1: Editorial taxonomy before schema work

- Action: Define course families in planning docs: Core Spine, Beginner/Foundation Doors, Advanced Practice Tracks, Visual/Mathematical Imagination, and future Constellations.
- Why: The curriculum needs language before the database needs columns. This prevents us from building the wrong abstraction.

### Phase 2: Metadata-only implementation

- Action: Add family/track fields inside course content JSON first: course_family, track_slug, track_order, recommended_level, entry_point, prerequisites, and related_course_slugs.
- Why: The current course infrastructure already stores rich JSON content, so we can test the model without a migration.

### Phase 3: Catalog UI support

- Action: Update the courses page to group/filter by course family instead of showing one flat sequence only.
- Why: Learners should see multiple doors into the system, not a single intimidating ladder.

### Phase 4: Admin/editor support

- Action: Add fields to the course admin editor/importer so track metadata can be maintained without hand-editing JSON.
- Why: Once the model feels right, editors need stable controls.

### Phase 5: Optional database normalization

- Action: Only after the model proves itself, add course_tracks/course_families tables or a course_track_membership table if filtering, analytics, or many-to-many placement requires it.
- Why: Avoid overbuilding now. Some courses may belong to multiple paths, so the normalized model should wait until real usage tells us what shape it needs.

## Course Candidates

### The Body, Breath, and Practice

- Lane: Beginner/Foundation track
- Family / door: Foundation Door: Embodied Knowing
- Beginner readiness: Good beginner course if framed around direct experience, breath, attention, and disciplined response rather than advanced ritual theory.
- Relationship to the other candidates: Pairs naturally with Nature, Evolution, and the Living Cosmos. Nature gives the organism/cosmos frame; Body, Breath, and Practice brings it into lived practice.
- Unused anchor books: The Science of Breath: The Essential Works of Yogi; The Art of War; Light On The Path and Through the Gates of Gold; Beyond the Pleasure Principle; Evidence as to Man's Place in Nature
- Why now: Builds on C01/C02 by asking what disciplined bodies, breath, instinct, and trained response know that concepts alone cannot reach.

### Nature, Evolution, and the Living Cosmos

- Lane: Beginner/Foundation track
- Family / door: Foundation Door: Nature and Scale
- Beginner readiness: Strong beginner course because it starts from observable life, bodies, evolution, heavens, light, and place before asking heavier metaphysical questions.
- Relationship to the other candidates: The most grounded entry point in the unused set. It can prepare students for C04 later without requiring them to begin inside epistemology.
- Unused anchor books: The Descent of Man, and Selection in Relation to Sex; Evidence as to Man's Place in Nature; Mechanism of the Heavens; The Principles of Light and Color; A Treatise on the Circle and the Sphere
- Why now: Lets the unused science shelf breathe: evolution, astronomy, optics, geometry, embodiment, and cosmic scale as a counterweight to purely symbolic knowing.

### Ritual, Magic, and the Architecture of Practice

- Lane: Advanced/Practice track
- Family / door: Practice Door: Ritual Systems
- Beginner readiness: Not beginner. This should come after students have symbolic literacy and strong discernment guardrails.
- Relationship to the other candidates: Middle course in an Esoteric Practice track: tradition context first, ritual architecture second, modern invention and critique third.
- Unused anchor books: The Book of Ceremonial Magic; Jewish Magic and Superstition; The Practice of Magical Evocation: A Complete Course; Christian Astrology - Volume II; Comte de Gabalis
- Why now: Turns symbolic systems into operating procedures while preserving the curriculum’s discernment frame: what rituals claim, what they do psychologically, and what traditions require before practice.

### Mythic Imagination: From Classical Pattern to Personal Meaning

- Lane: Beginner/Foundation track
- Family / door: Foundation Door: Story and Symbol
- Beginner readiness: Probably the easiest beginner course in the set. It can meet people through stories before asking them to hold complex multi-lens theory.
- Relationship to the other candidates: Works as the front door to C02, but does not need to be subordinate to C02. It can stand as a first course for myth-oriented learners.
- Unused anchor books: Bulfinch's Mythology; Bulfinch's Mythology: The Age of Fable; Essays by Ralph Waldo Emerson; The Art of Worldly Wisdom: A Pocket Oracle
- Why now: Uses the unused myth and essay material for a lighter but still serious course on mythic literacy, imagination, moral style, and self-authorship.

### Rosicrucians, Theosophy, and Modern Esoteric Invention

- Lane: Advanced/History track
- Family / door: Practice Door: Modern Esoteric History
- Beginner readiness: Not beginner unless heavily reframed. Best after students have enough context to distinguish tradition, reception, invention, and modern mythmaking.
- Relationship to the other candidates: Final course in the Esoteric Practice/Invention track. It asks students to evaluate modern esoteric claims without flattening them into fraud or truth.
- Unused anchor books: The Real History of the Rosicrucians; The Veil of Isis; The Emerald Tablets of Thoth the Atlantean; Comte de Gabalis; Light On The Path and Through the Gates of Gold
- Why now: A clean way to use the modern esoteric shelf without pretending all sources have the same status: lineage, invention, reception, mythmaking, and verification.

### Strategy, Power, and Discernment

- Lane: Beginner/Foundation or Practical track
- Family / door: Foundation Door: Discernment Under Pressure
- Beginner readiness: Can be beginner if practical and scenario-based. It should be framed as discernment, timing, restraint, and self-command rather than conquest.
- Relationship to the other candidates: Completes the beginner foundation set by asking what wisdom looks like when there are stakes, conflict, fear, or urgency.
- Unused anchor books: The Art of War; The Art of Worldly Wisdom: A Pocket Oracle; Essays by Ralph Waldo Emerson; Beyond the Pleasure Principle
- Why now: A sharper practical course on power literacy: when to yield, resist, govern the self, negotiate, or refuse.

### Form, Number, and Vision

- Lane: Visual/Mathematical track
- Family / door: Foundation or Intermediate Door: Pattern and Perception
- Beginner readiness: Could be beginner if taught visually and experientially; intermediate if taught as sacred geometry theory.
- Relationship to the other candidates: Connects the science/nature cluster with the symbol/myth cluster through perception: form, light, heavens, color, and proportion.
- Unused anchor books: A Treatise on the Circle and the Sphere; Mechanism of the Heavens; The Principles of Light and Color; Christian Astrology - Volume II
- Why now: Builds from C13 into a more visual and technical exploration of form: circles, spheres, heavens, optics, color, and astrological geometry.

### Jewish Esoteric Practice: Text, Law, Folk Religion

- Lane: Advanced/Tradition-specific track
- Family / door: Practice Door: Grounded Tradition Before Ritual Comparison
- Beginner readiness: Not beginner. It needs careful framing, tradition-specific respect, and appropriation/discernment guardrails.
- Relationship to the other candidates: Best placed before Ritual, Magic, and the Architecture of Practice so ritual comparison starts from a grounded tradition rather than generalized occultism.
- Unused anchor books: Jewish Magic and Superstition; Jewish Magic and Superstition: A Study in Folk Religion; Sefer Yetzirah & Saadia’s Commentary; The Book of Ceremonial Magic
- Why now: Pairs the Qabalah arc with concrete folk-practice and commentary material, while carefully distinguishing textual mysticism from later ceremonial appropriation.
