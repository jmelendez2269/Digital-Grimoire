# Course Knowledge Graph Extraction Instructions

Status: proposed Mission Control review standard
Mode: review-only candidate generation
Applies to: completed or review-ready Prismarium courses

## 1. Purpose and operating rule

Use this procedure to turn one reviewed course into a repeatable, evidence-backed knowledge-graph candidate containing:

- the course and its lessons;
- assigned works, editions, passages, authors, translators, editors, and traditions;
- a selective set of course-defining concepts;
- structural, bibliographic, historical, interpretive, and correspondence edges;
- an entity synthesis and an edge connection summary suitable for review in graph modals.

The extraction output is a review manifest, not a database import. Extraction, Mission Control approval, staging import, and production promotion are separate actions requiring separate approval.

Do not:

- edit the learner course, parser, app, database, or live graph during extraction;
- infer a historical, doctrinal, or correspondence relationship from co-occurrence alone;
- use `associated_with` as a fallback for an unknown or unsupported predicate;
- silently flatten a richer course relationship into the current graph schema;
- let an extracting agent approve its own syntheses or relationships.

## 2. Source readiness

A course may enter extraction when these inputs are available:

1. Reviewed learner-facing Markdown with a stable course ID, slug, and, where available, UUID.
2. The exact source file hash and course-format version.
3. Current parser output and warnings.
4. Production notes and a source-and-rights register.
5. Exact library records or stable text IDs for assigned readings when available.
6. Current reader digests and exercise-verification notes, if used by the course.
7. A current graph export or other identity baseline.
8. The previous course graph manifest, for a revision.
9. The vocabulary version used by this document.

Source precedence is:

1. approved learner course;
2. verified source/library record;
3. approved production note or rights register;
4. approved current digest;
5. editorial interpretation, clearly labeled as such.

Parser success is not graph readiness. The current Course V2 parser can accept a reading whose creator, edition, translator, or stable text identity remains unresolved. Unknown course sections may also be retained only as raw content. Resolve or explicitly defer those gaps before approval.

If required editions, selection boundaries, authorship roles, or rights records are still unknown, extraction may continue in candidate mode, but affected records must be marked `unresolved` and cannot pass source review.

## 3. Minimum useful extraction

Every candidate must include:

- one course entity and every reviewed lesson, represented either as a lesson entity or as a stable evidence/provenance anchor;
- every assigned primary and companion work;
- verified creator roles, without conflating a person, work, edition, or tradition;
- only concepts that materially organize a lesson, reading, exercise, or completion artifact;
- editions, passages, traditions, institutions, and artifacts only when materially needed by the course or its evidence;
- course-to-lesson edges when lesson nodes are present, course/lesson-to-work edges as the evidence supports, and work-to-creator edges;
- evidence for every claim, synthesis, and relationship;
- draft entity syntheses and edge connection summaries;
- a diff against the current graph and, when applicable, the previous course manifest.

Do not create nodes merely for every bold phrase, heading, learning outcome, fictional example, tool label, or passing mention.

## 4. Controlled entity vocabulary

These are the allowed entity types in the semantic manifest; a candidate uses only the types its course and evidence require:

| Type | Use |
|---|---|
| `course` | The stable production course. |
| `lesson` | A reviewed course week or lesson. |
| `work` | A distinct intellectual work: book, essay, scripture, article, collection, encyclopedia entry, film, or other assigned work. Record the medium in `subtype`. |
| `edition` | A materially specific publication or translation when edition-level identity matters. |
| `passage` | A stable selection within a work when the course assigns or discusses a bounded passage. |
| `person` | A verified human creator, translator, editor, commentator, or scholar. |
| `tradition` | A named intellectual, religious, artistic, or scholarly tradition used by the course. |
| `concept` | A reusable idea that is defined, developed, distinguished, debated, or operationalized by the course or a source. |
| `institution` | A publisher, archive, library, host, or organization when it must be represented as a graph entity rather than provenance metadata. |
| `artifact` | A learner-created, cumulative course artifact with a graph-relevant role. |

Use tags, not entity types, for course lenses such as historical, symbolic, psychological, or comparative.

### Identity states

Each entity has one identity state:

- `existing`: matched to one current graph identity;
- `new`: no match found after review;
- `merge_candidate`: two or more plausible identities;
- `unresolved`: insufficient evidence;
- `excluded`: reviewed and intentionally omitted.

Each candidate also has one review state:

- `candidate`;
- `revise`;
- `approved`;
- `rejected`;
- `deferred`.

### Stable identifiers

Prefer existing production UUIDs and slugs. For new candidate identities use deterministic IDs:

- course: `course:<course-slug>`;
- lesson: `lesson:<course-slug>:wNN`;
- work: `work:<canonical-work-slug>`;
- edition: `edition:<work-slug>:<translator-or-publisher>-<year>`;
- passage: `passage:<work-slug>:<stable-locator-slug>`;
- person, tradition, concept, institution: `<type>:<canonical-slug>`;
- artifact: `artifact:<course-slug>:<artifact-slug>`.

An anonymous, composite, or traditionally attributed work must not be assigned a modern single-author identity. Record the attribution accurately and preserve the uncertainty in the claim.

## 5. Controlled edge vocabulary

### Structural and bibliographic predicates

| Predicate | Direction |
|---|---|
| `has_lesson` | course → lesson |
| `uses_primary_work` | course or lesson → work |
| `uses_companion_work` | course or lesson → work |
| `selects_passage` | lesson → passage |
| `passage_of` | passage → work |
| `edition_of` | edition → work |
| `authored_by` | work → person |
| `translated_by` | edition or work → person |
| `edited_by` | edition or work → person |
| `compiled_by` | work → person |
| `published_by` | edition → institution |
| `hosted_by` | edition, work, or passage → institution |
| `situated_in_tradition` | concept, work, or person → tradition |
| `builds_artifact` | lesson → artifact |
| `continues_to` | lesson or artifact → later lesson or artifact |
| `contextualizes` | course, lesson, work, or passage → work, passage, person, tradition, or concept |

### Conceptual and correspondence predicates

| Predicate | Required basis |
|---|---|
| `explores` | The course or lesson substantially investigates the concept, or a work is explicitly framed by the course as examining it. Work-to-concept uses require scope `course_context`. |
| `defines` | The source or lesson supplies a definition, not merely a mention. |
| `distinguishes_from` | Evidence explicitly marks a meaningful distinction. |
| `contrasts_with` | Evidence explicitly compares two entities in contrast. |
| `critiques` | The source or course presents a supported critique. |
| `refines` | One entity explicitly narrows, develops, or corrects another. |
| `responds_to` | One entity supplies a course-supported response to a problem or question without implying that it resolves it or historically replied to it. |
| `historically_connected_to` | Documented historical contact or shared history. |
| `influenced_by` | Credible evidence supports directional influence. |
| `derives_from` | Credible evidence supports directional derivation. |
| `conceptually_similar_to` | A reviewed interpretation identifies a substantive similarity. |
| `editorially_juxtaposed_with` | The course deliberately places entities together without asserting history or doctrine. |
| `doctrinally_related_to` | Direct sources or scholarship support a shared doctrinal relationship. |
| `corresponds_to` | An explicit symbolic correspondence within a named system or tradition. |
| `associated_with` | A source explicitly names an association that no more precise approved predicate captures. |

There is no generic `related_to` predicate.

Treat these predicates as symmetric and store their endpoints in lexical ID order: `contrasts_with`, `conceptually_similar_to`, `editorially_juxtaposed_with`, `historically_connected_to`, `doctrinally_related_to`, `corresponds_to`, and `associated_with`.

### Scope and course connection labels

Every interpretive edge has a scope:

- `global`: intended to remain meaningful outside this course;
- `course_context`: expresses the course's documented editorial or interpretive framing;
- `personal`: an individual learner's resonance; exclude from the canonical candidate.

Map course connection labels as follows:

| Course label | Candidate treatment |
|---|---|
| documented historical connection | `historically_connected_to`, `influenced_by`, or `derives_from`, as the evidence permits |
| conceptual similarity | `conceptually_similar_to` |
| editorial juxtaposition | `editorially_juxtaposed_with`, scope `course_context` |
| shared doctrine | `doctrinally_related_to` only with direct evidence and review |
| explicit traditional correspondence | `corresponds_to`, confidence `tradition` |
| personal resonance | personal overlay only; no canonical edge |
| lexical resemblance, coincidence, or uncertain | no canonical edge; record as rejected or deferred |

Co-location in one course supports editorial juxtaposition only. It does not establish historical contact, influence, shared doctrine, or symbolic correspondence.

### Confidence and weight

Use the current correspondence confidence values:

- `established`: documented structure, bibliography, attribution, or well-supported history;
- `tradition`: an attribution or correspondence asserted inside a named tradition, not as a universal fact;
- `interpretive`: a reasoned scholarly or curricular comparison;
- `speculative`: an unsettled candidate, not eligible for promotion unless a reviewer explicitly approves the label and inclusion.

`weight` records curricular prominence or graph association strength. It is not a probability or truth score.

## 6. Evidence and provenance

Every entity claim, synthesis, and edge must reference one or more evidence records. Each evidence record contains:

- `evidence_id`;
- `evidence_class`: `course_structure`, `direct_statement`, `bibliographic`, `documented_history`, `tradition_attestation`, `scholarly_interpretation`, or `editorial_choice`;
- `source_kind`;
- repository-relative path or stable URL;
- SHA-256 hash when the source is a file;
- course ID, slug, UUID, and version when applicable;
- exact locator: heading path plus line range, or page/chapter/section/passage locator;
- library record ID, text UUID, or catalog ID when available;
- citation and access date;
- a short supporting excerpt within quotation and copyright limits;
- extractor and optional notes.

Production notes may establish editorial intent, workflow state, or bibliographic responsibility. They must not be presented as learner-facing historical or doctrinal evidence unless they cite an authoritative source.

## 7. Claims, syntheses, and modal contract

Use only these controlled claim keys:

- `short_definition`;
- `course_role`;
- `source_role`;
- `historical_context`;
- `translation_note`;
- `interpretive_caution`;
- `creator_attribution`;
- `primary_source`;
- `why_it_matters`;
- `does_not_settle`;
- `connection_summary`.

Every entity intended for a graph modal needs:

- display name, type, optional subtype, aliases, and identity state;
- a short definition;
- an evidence-bounded 20–150 word synthesis;
- its role in this course;
- an interpretive or attribution caveat where needed;
- evidence IDs and review state.

For a person, do not invent biography from course context or pad a synthesis beyond the available evidence. For a concept, distinguish the source-specific meaning from any cross-tradition comparison.

Every edge intended for a connection modal needs a one-to-three-sentence `connection_summary` stating:

1. what connects the entities;
2. which evidence supports the connection;
3. what the connection does not establish.

In the transitional combined-Markdown pilot, a deterministic predicate template plus the edge row's source, target, week metadata, and evidence IDs may define this draft field without repeating identical prose in every row. The structured manifest must materialize the rendered summary per edge before review or promotion.

Draft narrative belongs in a draft field and remains `candidate` until human approval. It must not be written into the current approved correspondence `description` field during extraction.

## 8. Candidate artifact structure

For the first PRE pilot, before a generic schema and promotion adapter exist, `pre_course_graph_candidate.md` may be used as one combined review artifact instead of the structured file set below. It must contain every required entity, edge, claim, evidence, provenance, identity, review, rejection/defer, diff, and QA field in reviewable form. This transitional Markdown artifact is review-only and is not promotable or valid as an importer input.

Create a deterministic review workspace in Mission Control:

```text
docs/courses/<course-id>-graph/
  manifest.v1.json
  provenance.v1.json
  identity-map.v1.json
  review.md
  decisions.jsonl
  rejected-candidates.json
  qa-report.md
  promotion-adapter.v1.json
```

`promotion-adapter.v1.json` is optional and must not be created, executed, or imported until a separate staging-import approval.

The semantic manifest is the extraction source of truth:

```json
{
  "schema_version": "course-graph-manifest/v1",
  "manifest_id": "course-graph:<course-slug>:<source-hash-prefix>",
  "vocabulary_version": "course-graph-v1",
  "course": {},
  "run": {
    "source_sha256": "",
    "base_manifest_sha256": "",
    "mode": "review-only"
  },
  "entities": [],
  "edges": [],
  "claims": [],
  "evidence": [],
  "review": {},
  "tombstones": []
}
```

Keep the semantic manifest independent of current table mappings. The current app has separate convergence and correspondence graph planes, while the current graph bundle supports only their existing shapes. Unsupported entity types, predicates, provenance, or cross-plane links block promotion. They must not be silently converted to `associated_with` or discarded.

## 9. Extraction workflow and review gates

### Step 0 — Freeze the reviewed input

- Record course identifiers, format version, source path, and SHA-256.
- Record the graph baseline and previous manifest hashes.
- Confirm rights/source notes and parser warnings have been reviewed.

Gate: source reviewer marks the input `ready`, `ready_with_deferrals`, or `not_ready`.

### Step 1 — Parse and inventory

- Run the current parser without database mutation.
- Inventory lessons, readings, companion cards, passage locators, creator strings, traditions, exercises, and artifacts.
- Preserve unknown/raw sections for human inspection.

Gate: technical reviewer confirms the inventory matches the learner course.

### Step 2 — Resolve identities

- Match every candidate against existing graph slugs, aliases, library records, and the previous identity map.
- Separate work, edition, passage, person, institution, and tradition identities.
- Record ambiguous matches as `merge_candidate` or `unresolved`; do not guess.

Gate: identity/source reviewer approves, revises, merges, defers, or rejects each identity.

### Step 3 — Extract concepts

- Select concepts central to a lesson, assigned source, exercise, or cumulative artifact.
- Capture the source-specific definition, course role, aliases, and evidence.
- Deduplicate against the current concept baseline before proposing a new node.

Gate: curricular/concept reviewer confirms salience, naming, scope, and deduplication.

### Step 4 — Extract and classify edges

- Add deterministic structural and bibliographic edges first.
- Add interpretive edges only when the predicate, scope, confidence, and evidence threshold are satisfied.
- Aggregate multiple evidence IDs on one edge rather than duplicating its natural key.
- Send lexical resemblance, personal resonance, coincidence, and unresolved inference to `rejected-candidates.json` or `deferred`.

Gate: relationship/evidence reviewer approves each non-structural edge and its connection summary.

### Step 5 — Draft syntheses

- Draft the entity modal fields and edge connection summaries.
- Preserve uncertainty and distinguish source claims, tradition claims, editorial framing, and scholarly interpretation.

Gate: synthesis/modal reviewer approves or requests revision. The extracting agent cannot self-approve.

### Step 6 — Diff and QA

- Diff against the current graph and previous manifest.
- Run the same extraction twice against unchanged inputs to confirm no semantic churn.
- Produce `qa-report.md`, including unsupported schema mappings.

Gate: technical reviewer accepts the candidate artifact set.

### Step 7 — Stop for approval

Mission Control review approval completes extraction only. A staging adapter/import and a later staging-to-production promotion each require their own explicit approval and workflow.

Every decision record includes candidate ID, decision, reviewer, date, reason, and any replacement or merge target.

## 10. Revision and idempotency rules

- Approved slugs and IDs are immutable. Renames use aliases plus an explicit redirect or tombstone.
- Reuse existing UUIDs, text IDs, and graph identities.
- The same source hash, graph baseline, prior manifest, and vocabulary version must produce the same semantic content; exclude run timestamps from semantic comparison.
- Sort entities by ID, edges by natural key, evidence by evidence ID, and claims by entity/source/key.
- Use edge natural key `(canonical source ID, predicate, canonical target ID)`.
- An omitted entity or edge is not a deletion. Deletion requires a tombstone and human approval.
- A lesson renumbering requires an explicit lesson-ID migration decision.
- Claims for one entity and one knowledge source are a complete snapshot, not a partial patch. The current bundle importer replaces that claim group.
- Keep required provenance in the candidate manifest until an approved adapter or schema can retain it.
- Never promote unsupported types or predicates by lossy substitution.

## 11. QA checklist

- [ ] Course ID, slug, UUID, format version, source path, and SHA-256 are recorded.
- [ ] Parser output and every warning/raw section were reviewed.
- [ ] Assigned primary and companion works match the course.
- [ ] Work, edition, passage, person, institution, and tradition identities are not conflated.
- [ ] Creator roles and traditional/anonymous attributions are accurate.
- [ ] Existing graph identities and aliases were checked before proposing new nodes.
- [ ] Every type, claim key, predicate, scope, and confidence uses the controlled vocabulary.
- [ ] No sentence-like, heading-only, passing-mention, or duplicate concept nodes remain.
- [ ] No self-edge exists; symmetric endpoints are canonicalized.
- [ ] Co-occurrence alone created no historical, doctrinal, influence, or correspondence edge.
- [ ] Personal resonance, lexical resemblance, and coincidence are excluded from the canonical candidate.
- [ ] Every claim, synthesis, and edge has exact evidence and a usable locator.
- [ ] Quotes and hosted-source references respect rights and quotation limits.
- [ ] Every modal synthesis and connection summary has human review state.
- [ ] Candidate and previous/current graph diff is included.
- [ ] A second unchanged run produces no semantic churn.
- [ ] Omissions do not act as deletion; approved removals have tombstones.
- [ ] Unsupported schema mappings are reported, not flattened.
- [ ] Any promotion adapter dry-run is separately approved and non-destructive.

## 12. Mission Control placement

Recommended review-library files:

- `web/src/content/prismarium-course-graph-extraction-sop.md`
- `web/src/content/pre-how-to-hold-two-things-at-once-course-graph-candidate.md`

Recommended additions to `PRISMARIUM_STUDIO_DOCS`:

```ts
{
  file: "prismarium-course-graph-extraction-sop.md",
  label: "Course Knowledge Graph Extraction SOP",
  category: "Curriculum Studio",
  status: "Proposed Standard",
},
{
  file: "pre-how-to-hold-two-things-at-once-course-graph-candidate.md",
  label: "PRE — Course Knowledge Graph Candidate",
  category: "Active Course",
  status: "Candidate Review",
},
```

Copying these files into Mission Control, adding the library entries, building, or deploying Mission Control requires a separate explicit approval. Publishing the review documents does not approve graph data, edit the learner course, import staging data, or promote production.

## 13. Copy/paste extraction prompt

```text
Create a review-only course knowledge-graph candidate by following
COURSE_GRAPH_EXTRACTION_INSTRUCTIONS.md exactly.

Course ID: <course-id>
Course title: <course-title>
Course slug: <course-slug>
Course UUID: <course-uuid-or-unresolved>
Reviewed learner Markdown: <path>
Production notes: <path>
Source-and-rights register: <path>
Current digests / exercise verification: <paths-or-none>
Library/source snapshot: <path-or-none>
Current graph export: <path>
Previous course graph manifest: <path-or-none>
Output workspace: docs/courses/<course-id>-graph/

Work in review-only candidate mode. Do not edit the learner course, app, parser,
database, current graph, or adjacent repositories. Do not import, deploy, or
promote data.

1. Hash and freeze the reviewed course input.
2. Parse it without database mutation and inventory lessons, readings, companions,
   passages, creator roles, traditions, exercises, artifacts, and raw sections.
3. Resolve identities against library records, the current graph, and any prior
   manifest. Mark ambiguity; do not guess.
4. Extract only salient concepts and controlled structural, bibliographic, and
   interpretive edges.
5. Attach exact evidence and provenance to every claim, synthesis, and edge.
6. Draft entity modal syntheses and edge connection summaries without self-approval.
7. Produce the complete deterministic artifact set, rejection/defer log, graph
   diff, and QA report.
8. Run an unchanged second pass and report any semantic churn.
9. Stop for human review. List every unresolved identity, evidence gap, rights
   issue, unsupported schema mapping, and decision needed before staging.
```

## 14. Definition of done

Extraction is complete when the deterministic candidate artifact set passes the QA checklist and all required Mission Control review gates have recorded decisions.

The graph change is not complete until a separately approved adapter preserves the required semantics and provenance, the staging import is reviewed, modal behavior is verified, and production promotion receives its own approval.
