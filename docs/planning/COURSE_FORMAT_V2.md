# Prismarium Course Format V2

**Status:** Canonical local-preview standard  
**Compatibility:** Additive and backward-compatible with Course Format V1  
**Safety boundary:** Parsing, serialization, tests, and learner preview are database-free. Import remains a separate explicit admin action.

## Evidence-based compatibility analysis

### V1 parser contract

`app/src/lib/parsers/course-markdown-parser.ts` recognizes a course title/ID, a metadata pipe table, premise, public curator note, numbered learning outcomes, formatted key tensions, formatted completion pathways, tone/safety, and `## WEEK N — Title` or `## MODULE N — Title`. Within each week it recognizes H3 core question, key tension, lens focus, `Readings (Selections)`, lens exercise, three named feature exercises, synthesis prompt, micro-artifact, and final reflection.

V1 is convention-sensitive. Readings require bold numbered headers and a three-tier table. Exercises require named `Prompt`, `Instructions`, `Expansion`, or feature-specific labels. Unknown headings are not represented.

### Database storage

The `courses` table stores stable relational columns (`id`, `slug`, title, premise, learning outcomes, type, level, duration, publication state, timestamps, and sort order) plus a flexible `content JSONB` payload. Weeks and their authored learner material live in `content`; there is no normalized V1-only week table.

`course_enrollments.course_id` references `courses.id` with cascading deletion and stores progress JSON. `course_texts.course_id` also references the course ID. Reading completion is keyed by user/text separately. Consequently, the stable course identity is the existing course UUID; slug stability preserves links, while stable week numbers, text IDs, and artifact/progress keys preserve learner state.

### Existing renderers

The public course-detail page renders identity, premise, public curator note, learning outcomes, and a deliberately restricted week preview: title, summary, core question, key tension, and reading count. It does not render full protected weekly instructions.

The V1 learner page renders week identity, core question, key tension, lens focus, readings and tiers, lens exercise, feature exercises, synthesis, micro-artifact support, and community/progress integrations. Before V2 it did not render doorway text, companion cards, reading context/cautions, supplied case decks, raw central encounters, or the richer capstone body.

### Corrected PRE incompatibilities in V1

The corrected PRE uses `# WEEK N` and `##` learner subsections. V1 splits only at `##` and searches for week headings there, which explains “No weekly sections found.” Its completion-pathway grammar expects `- **CODE** — Title`; corrected PRE uses `- **CODE — Title:** description`.

Even if week headings were changed mechanically, the following would disappear under V1 because they have no corresponding fields or matching grammar: plain-language doorways; source role/history/translation/reading notes; interpretive cautions; all companion-card content; supplied examples and direct links; the central exercise body; choose-one product practices; the richer capstone pages; and supplied learner cases/completed example. `LIMITS OF THIS INVESTIGATION` would likewise have no stored/rendered field.

### Existing dependencies and backward compatibility

The checked-in C01/C02/C11 production drafts use V1 `## WEEK` plus H3 subsections. The checked-in live PRE JSON also uses the V1 stored shape. V2 is selected only when `# WEEK N` exists; otherwise the unchanged V1 path runs. Stored JSON has no parse step and remains readable by the V1 learner renderer. V2 therefore does not require rewriting existing Markdown or stored records.

### Serializer compatibility

The V1 serializer retains its existing output. V2 serializes canonical course sections, `# WEEK` blocks, week metadata, raw retained learner sections, and the learner case deck. Automated parse → serialize → parse tests assert reading, companion-card, section, and case counts.

### Existing PRE update versus replacement

Updating the existing PRE record eventually preserves `courses.id`, enrollment foreign keys, course-text relationships, learner progress JSON, completion history, and existing links when the slug stays stable. A replacement record gets a new UUID; redirects preserve navigation but do not automatically migrate enrollment/progress/course-text relationships and introduce a second canonical identity.

An in-place update has the larger rollback/blast-radius risk because it changes content for every current enrollee at once, and changed week semantics can make old progress misleading. A replacement offers isolation and side-by-side QA but requires an explicit, tested migration of relational and progress state. No strategy is implemented by Course Parser V2. The current import API still rejects the corrected PRE slug as a conflict, so local preview cannot overwrite the live PRE accidentally.

## Canonical V2 grammar

### Course-level

- `# Course CODE — Title`
- `## COURSE METADATA` with ID, production slug, length, level, type/arc, core question, orientation, and mode
- `## COURSE PREMISE`
- `## CURATOR'S NOTE`
- `## LIMITS OF THIS INVESTIGATION` or `## SCOPE AND LIMITS`
- `## TONE & SAFETY NOTE`
- `## HOW TO USE THIS COURSE` / reading guidance when needed
- `## LEARNING OUTCOMES`
- `## KEY TENSIONS`
- `## COMPLETION PATHWAYS`
- optional course-wide source/context notes

Internal production notes must not use learner headings and must not be placed in learner JSON.

### Sanctioned V2 authoring variants

The parser normalizes the following equivalent learner-authored structures. These are explicit format variants, not a general license to guess at arbitrary Markdown:

- `# CODE — Title` as well as `# Course CODE — Title`;
- numbered or bulleted learning outcomes;
- numbered `A vs B` key tensions or a `Tension | Question underneath it` table;
- a course-level completion-pathway section or the same section at the end of the capstone week;
- weekly `## Core question` and `## Why this week matters` sections as equivalents of the bold core-question field and plain-language doorway;
- numbered or unnumbered H3 reading cards;
- `Work — Author`, `Author — Work`, and `Work — assigned section` reading identities when italics and name shape make the roles explicit;
- a reading-depth table or bold Keystone, Passage, and Full Text bullets;
- `## Optional product practice — choose one` as an alias for `## PRISMARIUM PRACTICE — CHOOSE ONE`;
- H3 tool options or bold tool-option bullets.

The normalized JSON and retained raw sections must agree. If a reading tier, required card field, or structured destination is absent, the parser warns instead of inventing it.

### Week-level

- `# WEEK N — Title`
- bold preamble fields: week type, core question, key tension, lens focus
- `## PLAIN-LANGUAGE DOORWAY`
- `## READINGS`
- zero or more modern/tradition-connected companion cards
- `## CENTRAL LENS EXERCISE` or central encounter
- `## PRISMARIUM PRACTICE — CHOOSE ONE`
- `## SYNTHESIS PROMPT`
- `## MICRO-ARTIFACT`
- capstone and final reflection where applicable

### Primary readings

Books/source works remain the weekly spine. Each `### N. Work — Author` supports:

- source role;
- historical note;
- translation note;
- why it is here;
- Keystone, Passage, and Full Text tiers;
- reading note;
- interpretive caution;
- optional direct URL.

### Companion cards

Companion cards are learner-facing and require:

- a titled `## MODERN COMPANION` or `## TRADITION-CONNECTED COMPANION`;
- `### Meet the source`;
- `### The idea in plain language`;
- `### Why it matters this week`;
- `### What it argues or found`;
- `### What it does not settle`;
- optional supplied example;
- optional `### Go Deeper — Optional` direct link.

A bibliography link alone is not a card. Missing required card fields produce an actionable warning naming the week, card, and fields.

### Loss prevention and validation

V2 stores both specialized fields and ordered raw Markdown sections. Markdown links and formatting survive in the raw section value and render through `react-markdown` with GFM; external links use safe new-window attributes.

Unknown course/week headings are retained and produce visible warnings naming the exact heading. Missing required course sections and missing readings produce actionable warnings. Structural failures that prevent identifying a title or any week remain blocking parse errors. The learner preview always offers JSON/debug inspection.

### Product-practice capability contract

Course exercises may only promise operations that the linked Prismarium surface actually supports:

- **Concept Search** opens `/search`. It is discovery over ingested text and chunks; it must not promise an exhaustive concordance, a complete list of every occurrence, or records that are not in the searchable corpus.
- **Parallax / Seven Lenses** opens `/seven-lenses`. Its supported lenses are Scientific, Psychological, Philosophical, Religious/Spiritual, Historical/Anthropological, Symbolic/Occult, and Mathematical. Course copy may use friendly prose, but it must not present additional lens names as implemented product modes.
- **Knowledge Graph** opens `/graph`. The public graph is the correspondence archive. It can inspect actual correspondence entities and typed edges, but it must not promise author, book, scientist, theory, or course-source traversal unless those entities have been reviewed and published to the appropriate graph.

Every product practice must identify a real target type, use the correct route, and be tested against available data before the course is approved. A pedagogically sensible question is not automatically a supported product query.

## Import semantics

“Preview Parse” and “Preview as Learner” do not call the import API, create a row, require a unique slug, enroll a learner, or write progress. “Confirm Import” remains the only database mutation. Importing corrected PRE today would reach the explicit slug-collision check and return HTTP 409; it would not replace the existing record.
