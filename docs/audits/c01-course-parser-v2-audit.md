# C01 Course Parser V2 Canary Audit

**Source:** `C:\Projects\Parallax_mission_control\docs\c01-how-humans-know-what-they-know-revision-draft.md`  
**Scope:** local parser, serializer, learner preview, tool/data compatibility, and catalog readiness  
**Safety boundary:** no import, production write, deployment, enrollment change, or live-course mutation

## Canary result

Course Parser V2 now normalizes this draft without rewriting it. The retained structure is:

- 8 weeks;
- 28 weekly reading assignments representing 27 distinct works;
- 8 companion cards with 10 external companion links;
- 7 central exercises;
- 7 choose-one product-practice sections;
- 7 map panels;
- 1 three-part capstone;
- 8 week-tagged learner-case sections;
- 7 completion pathways.

Parse → serialize → parse preserves the reading, companion, section, case, and pathway counts. The existing V1 C01 and C02 fixtures still pass through the legacy behavior path.

## Blocking course-content warning

Week 7 assigns *Tao Te Ching* Chapters 1, 14, 25, and 56 but supplies no Keystone, Passage, or Full Text selection. V2 retains the reading, emits an actionable warning, and shows a visible “reading depths still need to be assigned” state. It does not invent selections.

## Source and catalog readiness

The draft has 27 distinct primary works:

- 24 have definite local catalog candidates;
- Carl Jung’s “selected early work on symbols” is ambiguous and must name a specific work;
- *Poemandres / Corpus Hermeticum* I has no exact catalog record;
- *Chandogya Upanishad* 6 has no exact catalog record.

Additional edition/selection checks remain:

- Berens should identify the catalog work *Myths and Legends of Ancient Greece and Rome* and keep Prometheus/Demeter-Persephone as selections;
- the catalog *Popol Vuh* edition is Lewis Spence, while the companion uses Allen Christenson;
- the catalog *Bhagavad Gita* is Edwin Arnold’s *The Song Celestial*;
- the catalog *Dhammapada* is F. Max Müller, while the companion recommends other context;
- Jung, Marcus Aurelius, *The Gateless Gate*, Julian of Norwich, Rumi, and the *Dhammapada* still contain explicit “verified” or edition/location work in the source copy.

A parser preview can verify structure. It cannot prove edition alignment, passage availability, cover matching, chunks/embeddings, or lawful full-text access.

## Product capability audit

### Supported routes

| Product practice | Learner route | Safe promise |
| --- | --- | --- |
| Concept Search | `/search` | Compare the ranked sources/excerpts that the search actually returns |
| Parallax / Seven Lenses | `/seven-lenses` | Compare a question through implemented canonical lenses |
| Public Knowledge Graph | `/graph` | Inspect an existing correspondence entity and the type, direction, confidence, citation, and notes of a visible edge |

Concept Search and Seven Lenses analysis require authentication/quota. Product practice must remain optional and include a no-result/no-access fallback.

### C01 exercise compatibility

| Week | Knowledge Graph status | Safe revision |
| --- | --- | --- |
| 1 | Source relationships are not in the public correspondence graph | Inspect the `truth` focus entity and report only an edge’s visible type, confidence, and citation |
| 2 | Scientist → theory → philosophical-question traversal is unavailable | Inspect a documented traditional correspondence and explain why it is not scientific causal evidence |
| 3 | Prometheus exists, but narrative transmission/history does not | Inspect `deity-prometheus`; prohibit claims of textual transmission or historical influence |
| 4 | Author → concept → later-interpretation traversal is unavailable | Inspect `mindfulness` and describe only the published association/citation |
| 5 | Text-centered religious-experience traversal is unavailable | Inspect `grace` or `visions`, distinguishing association from evidence of divine causation |
| 6 | Bridge texts, influence, response, and editorial association are unavailable publicly | Inspect `knowledge` and state exactly what the edge type does and does not claim |
| 7 | Supported with constraints | Inspect one `knowledge` or `truth` correspondence without inferring beyond its type, confidence, notes, and citation |
| 8 | No product query is required | Keep the claim-pathway capstone; provide a journal/notebook fallback |

The public correspondence graph is not the curator-only Course Knowledge candidate graph. Do not assign authors, books, scientists, theories, intellectual influence, or textual transmission to it until a reviewed learner-accessible course graph exists.

### Seven Lenses vocabulary

Implemented lens names are:

1. Scientific
2. Psychological
3. Philosophical
4. Religious/Spiritual
5. Historical/Anthropological
6. Symbolic/Occult
7. Mathematical

Normalize C01’s exercise language as follows:

- empirical → Scientific;
- historical or anthropological → Historical/Anthropological;
- theological/spiritual → Religious/Spiritual;
- metaphysical → a question handled within Philosophical;
- literary, tradition-connected, and phenomenological → useful approaches in prose, but not selectable Prismarium lens names.

## Required instruction for course-writing agents

Every product exercise must declare:

```yaml
tool:
route:
validated_query_or_focus_slug:
expected_returned_fields:
allowed_learner_claim:
forbidden_inference:
auth_or_quota:
fallback_if_no_result:
```

Agent rules:

1. Preflight graph targets against the actual entity API and use an exact published slug.
2. Use only fields the learner can see: edge type, direction, confidence, citation, notes, and connected entity.
3. Never assign author, work, influence, transmission, or intellectual-history questions to the public Correspondences graph.
4. Phrase Concept Search as “using the returned results,” never as an exhaustive search or proof of absence.
5. Require the learner to name the returned source and excerpt.
6. Use only canonical Seven Lenses names when referring to implemented product modes.
7. Supply a no-result and no-auth fallback so tool access cannot block completion.
8. Treat all learner answers and map panels as display-only until a real journal/map persistence flow is implemented.

## Production decision

**Not ready for production yet.** The parser and learner renderer are functioning locally. Course approval still requires:

1. assign Week 7 *Tao Te Ching* reading depths;
2. resolve the ambiguous/missing catalog works and edition mismatches;
3. replace or constrain Weeks 1–6 Knowledge Graph practices;
4. normalize Seven Lenses names;
5. verify the remaining cited selections/translations;
6. perform a non-production course-text matching rehearsal with the intended catalog environment.

