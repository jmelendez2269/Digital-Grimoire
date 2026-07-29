# PRE Course Graph Candidate Package

> **Status:** `CANDIDATE / DRAFT / REVIEW-ONLY`
>
> This file is a curation proposal, not a seed, migration, import bundle, or publication instruction. Nothing in this package has been written to Supabase or promoted to a live graph. Every node, synthesis, and edge below remains a candidate until a human reviewer approves it.

## 1. Source provenance

| Field | Value |
| --- | --- |
| Adjacent source repository | `Parallax_mission_control` |
| Repository-relative source path | `web/src/content/pre-how-to-hold-two-things-at-once-learner-ready-preview.md` |
| Local source resolution | `C:\Projects\Parallax_mission_control\web\src\content\pre-how-to-hold-two-things-at-once-learner-ready-preview.md` |
| Source kind | `course_markdown` |
| Course ID / UUID | `PRE` / `a8cd1728-ff6b-4f76-98e6-61bd86ae6a2c` |
| Course production slug in source | `pre-how-to-hold-two-things-at-once` |
| Course format | `2` |
| Source status | Learner-ready preview |
| SHA-256 | `9952d1aa524590cd66f5c1b44eb91f180264eab575a74294e16bd2cf3fa9f1ab` |
| Byte length | `33,100` |
| Line count | `565` |
| Source modified UTC | `2026-07-28T16:38:08.1119531Z` |
| Production notes | `Parallax_mission_control:docs/courses/pre-production-notes.md`; SHA-256 `4f6137ca0f4a534271872b5c43f2df9add6c78382433202bc88032a978c39b94` |
| Graph identity baseline | `Digital-Grimoire:graph-bundles/staging-to-live-graph-2026-05-10.json`; SHA-256 `11fcbb6ad936fcb0c287a076e3a396057b6f7da206721cb9c575accba354fb80` |
| Vocabulary version | `course-graph-v1` from `COURSE_GRAPH_EXTRACTION_INSTRUCTIONS.md` |
| Run mode / extractor | `review-only` / Codex |
| Parser verification | `npm.cmd run test:course-parser`; 8 passed, 0 failed |
| Accessed / candidate prepared | `2026-07-29` |
| Locator convention | One-indexed UTF-8 line numbers, inclusive |

All evidence IDs in this package refer to that exact source hash. If the source hash changes, the locators and all candidate decisions must be re-audited before reuse.

The course draft is authoritative evidence for its own structure and editorial framing. It is **not**, by itself, final bibliographic proof or proof of historical contact among the people, works, and traditions it places together.

### Readiness and run decision

| Input or gate | State | Decision |
| --- | --- | --- |
| Learner-facing Markdown | `ready_with_deferrals` | Structurally complete enough for review extraction; retained as a learner-ready preview in its adjacent repository. |
| Parser output | `ready` | Format V2 parses with zero warnings and all eight parser tests pass; parser success does not resolve graph identities. |
| Production notes / source-and-rights register | `ready_with_deferrals` | Production notes are present, but all six primary readings still need exact edition, translation, hosted-record, selection-boundary, and rights verification. |
| Library identity snapshot | `ready_with_deferrals` | Existing records resolve some works; Clifford, James, companions, Kena granularity, and several editions remain unresolved. |
| Reader digests | `excluded` | Older PRE digests conflict with the revised course framing and are not used as extraction evidence. |
| Current graph baseline | `ready` | The hashed staging-to-live bundle supplies the identity/count baseline. |
| Previous PRE graph manifest | `not_available` | This is the first course-graph candidate. |
| Vocabulary | `proposed` | `course-graph-v1` is not yet an approved production schema. |
| Promotion | `blocked` | Rights/edition review, immutable source provenance, human curation, generic schema support, and a lossless staging adapter remain required. |

## 2. Review boundary and stable-ID convention

Current graph rows are matched by slugs, and the existing helper normalizes names to lowercase ASCII hyphenated slugs in `app/src/lib/graph/entity-utils.ts`. This package uses a kind-prefixed stable key:

```text
course:<slug>
work:<slug>
person:<slug>
concept:<slug>
edge:<slug>
```

The prefix prevents a future generic graph from confusing a work, person, and concept that share a label. The slug after the prefix remains compatible with the repository's existing normalization style.

This is a planning representation, not the current version-1 graph-bundle schema. The current bundle cannot express work/person nodes, typed concept edges, or evidence records. Canonical `texts.id` values are intentionally unresolved here and must be assigned through the existing course-text matching/review path.

Existing correspondence nodes with homonymous names—such as `knowledge`, `trust`, or `truth`—must not be merged automatically with concept nodes. Kind and meaning must be reviewed first.

No reviewed aliases are proposed in this first pass, so every entity currently has `aliases: []`. Title variants, transliterations, honorifics, and alternate personal-name forms must come from authority review rather than extraction guesswork.

### Candidate-classification vocabulary

| Candidate class | Meaning |
| --- | --- |
| `CANDIDATE_SOURCE_EXPLICIT` | The course artifact explicitly names or structures the item; canonical identity still needs review. |
| `CANDIDATE_IDENTITY_REVIEW` | The name or role is source-explicit, but edition, contributor role, or canonical record must be resolved. |
| `CANDIDATE_CONCEPTUAL_REVIEW` | A conceptual relationship is proposed from the course's interpretation and needs subject-matter review. |
| `CANDIDATE_EDITORIAL_ONLY` | The relationship exists because PRE places items together; it must never be displayed as historical contact or shared doctrine. |

Candidate class is separate from controlled workflow state. Every entity and edge in this file has `review_state: candidate`; no item is `approved`. Every entity also has an explicit `identity_state` in its inventory row.

## 3. Evidence catalog

All evidence rows inherit the source kind, repository-relative path, SHA-256, course identifiers/version, access date, and extractor recorded in Section 1. Their citation is *PRE — How to Hold Two Things at Once*, learner-ready preview (accessed 2026-07-29). Library/text IDs are `null` at the evidence-record level and are resolved separately in Section 10.

| Evidence ID | Evidence class | Heading path / lines | Short supporting excerpt |
| --- | --- | --- | --- |
| `E-PRE-001` | `course_structure` | `COURSE METADATA`, L3–15 | “Responsible openness before comparison” |
| `E-PRE-002` | `direct_statement` | `COURSE PREMISE`, L17–23 | “learning to tell the difference” |
| `E-PRE-003` | `editorial_choice` | `CURATOR'S NOTE`, L25–35 | “Their proximity here is an editorial experiment” |
| `E-PRE-004` | `direct_statement` | `LIMITS OF THIS INVESTIGATION`, L37–51 | “The first four do not automatically establish the fifth” |
| `E-PRE-005` | `course_structure` | `LEARNING OUTCOMES`, L61–70 | “Build a Responsible Tension Map” |
| `E-PRE-006` | `course_structure` | `KEY TENSIONS`, L72–79 | “What kind of relationship does a resemblance actually support?” |
| `E-W1-001` | `course_structure` | `WEEK 1 > PLAIN-LANGUAGE DOORWAY`, L95–106 | “Evidence vs Commitment” |
| `E-W1-002` | `direct_statement` | `WEEK 1 > READINGS > The Ethics of Belief`, L110–123 | “belief is not purely private” |
| `E-W1-003` | `direct_statement` | `WEEK 1 > READINGS > The Will to Believe`, L125–138 | “refusing commitment can itself close a real possibility” |
| `E-W1-004` | `direct_statement` | `WEEK 1 > READINGS > An Enquiry Concerning Human Understanding`, L140–153 | “Hume complicates the Clifford–James opposition” |
| `E-W1-005` | `direct_statement` | `WEEK 1 > MODERN COMPANION`, L155–191 | “may involve more than one value” |
| `E-W1-006` | `course_structure` | `WEEK 1 > THE NEXT RESPONSIBLE MOVE`, L193–212 | “Stay revisable” |
| `E-W1-007` | `course_structure` | `WEEK 1 > CONCEPT SEARCH`, L214–223 | “surface resemblance” |
| `E-W1-008` | `course_structure` | `WEEK 1 > KNOWLEDGE GRAPH`, L233–242 | “documented historical relationship” |
| `E-W1-009` | `editorial_choice` | `WEEK 1 > SYNTHESIS / BELIEF TENSION RECORD`, L244–259 | “ordinary expectation exceeds deductive proof” |
| `E-W2-001` | `editorial_choice` | `WEEK 2 > PLAIN-LANGUAGE DOORWAY`, L263–276 | “three different intellectual worlds” |
| `E-W2-002` | `direct_statement` | `WEEK 2 > READINGS > Zhuangzi`, L280–295 | “composite, layered” |
| `E-W2-003` | `direct_statement` | `WEEK 2 > READINGS > The Dhammapada`, L297–312 | “patterns of attention, intention, and action matter” |
| `E-W2-004` | `direct_statement` | `WEEK 2 > READINGS > The Kena Upanishad`, L314–328 | “grasped as an ordinary object of knowledge” |
| `E-W2-005` | `direct_statement` | `WEEK 2 > ZHUANGZI COMPANION`, L330–358 | “every claim is equally good” |
| `E-W2-006` | `direct_statement` | `WEEK 2 > DHAMMAPADA COMPANION`, L360–388 | “training over instant control” |
| `E-W2-007` | `direct_statement` | `WEEK 2 > KENA COMPANION`, L390–418 | “mistaking a concept for mastery” |
| `E-W2-008` | `course_structure` | `WEEK 2 > THE TENSION DIAGNOSIS`, L420–456 | “Test what kind of tension it is” |
| `E-W2-009` | `course_structure` | `WEEK 2 > PRISMARIUM PRACTICE`, L458–487 | “Do not treat the existence of an edge as proof” |
| `E-W2-010` | `course_structure` | `RESPONSIBLE TENSION MAP`, L489–511 | “What is the next need” |
| `E-PRE-007` | `course_structure` | `FINAL REFLECTION / COMPLETION PATHWAYS`, L513–525 | “less willing to resolve too quickly” |
| `E-PRE-008` | `direct_statement` | `SUPPLIED LEARNER CASES`, L529–563 | “resemblance alone does not establish” |

## 4. Candidate entity inventory

### 4.1 Course node — 1 candidate

| Stable ID | Display name | Draft synthesis | Evidence | Identity state | Review state | Candidate class |
| --- | --- | --- | --- | --- | --- | --- |
| `course:pre-how-to-hold-two-things-at-once` | PRE — How to Hold Two Things at Once | A two-week foundational inquiry into deciding which tensions need resolution, evidence, action, reframing, contextual study, or continued openness. The course treats openness as a responsible practice rather than credulity, indecision, or a claim that unlike sources secretly agree. Its closing reflection and provisional pathways carry the inquiry toward related courses. | `E-PRE-001` (L3–15); `E-PRE-002` (L17–23); `E-PRE-003` (L25–35); `E-PRE-005` (L61–70); `E-PRE-007` (L513–525) | `existing` | `candidate` | `CANDIDATE_SOURCE_EXPLICIT` |

Weeks remain evidence/provenance anchors in this pilot rather than public graph nodes. This avoids adding navigational clutter before a reusable course-unit model exists.

### 4.2 Work/source nodes — 10 candidates

| Stable ID | Display name | Course role | Draft synthesis | Evidence | Identity state | Review state | Candidate class |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `work:the-ethics-of-belief` | The Ethics of Belief | Week 1 core reading | PRE presents this essay as a strict evidential challenge: sincere conviction does not remove responsibility for how a belief was formed, especially when belief shapes action and shared inquiry. The course also asks whether the argument leaves enough room for trust, testimony, and provisional commitment. | `E-W1-002` (L110–123) | `unresolved` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `work:the-will-to-believe` | The Will to Believe | Week 1 core reading | PRE uses this essay to ask whether withholding commitment can itself close a live possibility when evidence cannot decide a genuinely live, forced, and momentous option. Its course-framed claim is permissibility under limited conditions, not that commitment makes a belief true. | `E-W1-003` (L125–138) | `unresolved` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `work:an-enquiry-concerning-human-understanding` | An Enquiry Concerning Human Understanding | Week 1 core reading | PRE uses Sections IV–VII to examine the gap between deductive justification and ordinary expectation. The course emphasizes that custom or habit can support disciplined expectation without making every unsupported conviction equally reasonable. | `E-W1-004` (L140–153) | `existing` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `work:zhuangzi` | Zhuangzi | Week 2 core reading | PRE treats the *Zhuangzi* as a composite and layered text whose Butterfly Dream and Cook Ding passages put perspectival instability beside skilled, non-forcing responsiveness. The draft expressly rejects reducing it to “anything goes” or a method for holding incompatible truths. | `E-W2-002` (L280–295); `E-W2-005` (L330–350) | `merge_candidate` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `work:the-dhammapada` | The Dhammapada | Week 2 core reading | PRE presents the Twin Verses and Heedfulness within a Buddhist ethical and soteriological framework in which repeated attention, intention, conduct, and action matter. The course rejects secular productivity reduction and any suggestion that sufferers cause harm through inadequate mental training. | `E-W2-003` (L297–312); `E-W2-006` (L360–380) | `existing` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `work:kena-upanishad` | Kena Upanishad | Week 2 core reading | PRE approaches the *Kena Upanishad* as an inquiry into what enables seeing, hearing, speech, breath, and thought, and whether that ground can be grasped as an ordinary object. Its known/not-known tension is framed as a limit of objectifying knowledge, not praise of ignorance. | `E-W2-004` (L314–328); `E-W2-007` (L390–410) | `merge_candidate` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `work:the-ethics-of-belief-stanford-encyclopedia` | “The Ethics of Belief” — Stanford Encyclopedia of Philosophy | Week 1 modern companion | The companion maps continuing debates over evidential, practical, moral, and religious considerations in belief. PRE uses it to distinguish forming a belief from acting on a possibility and to prevent Clifford, James, and Hume from becoming a neat three-answer quiz. | `E-W1-005` (L155–177) | `unresolved` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `work:zhuangzi-stanford-encyclopedia` | “Zhuangzi” — Stanford Encyclopedia of Philosophy | Week 2 tradition-connected companion | The companion supplies historical and interpretive context for a layered Classical Chinese text, including debates over language, perspective, and whether labels such as skeptic, relativist, mystic, or naturalist fit. PRE uses it to resist the “anything goes” reading. | `E-W2-005` (L330–350) | `unresolved` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `work:the-dhammapada-the-buddhas-path-of-wisdom-introduction` | “The Dhammapada: The Buddha's Path of Wisdom” | Week 2 tradition-connected companion | PRE identifies this as a 1985 introduction accompanying Acharya Buddharakkhita's translation. It places heedfulness within conduct, cultivation, suffering, and liberation, while warning against treating the text as a universal psychological mechanism. | `E-W2-006` (L360–380) | `unresolved` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `work:the-principal-upanishads` | The Principal Upanishads | Week 2 tradition-connected companion container | PRE cites S. Radhakrishnan's introduction and notes to the *Kena Upanishad* in this volume as a modern translation and interpretation. The course uses that material as an initial context, not as a settlement of disagreements among later Vedanta traditions. | `E-W2-007` (L390–410) | `unresolved` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |

### 4.3 Person nodes — 9 candidates

No person node is proposed for “Zhuangzi,” the Buddha, or an author of the *Kena Upanishad*. The draft does not establish simple modern authorship for those composite, traditional, or anonymous works.

| Stable ID | Display name | Draft synthesis | Evidence | Identity state | Review state | Candidate class |
| --- | --- | --- | --- | --- | --- | --- |
| `person:w-k-clifford` | W. K. Clifford | Named by PRE as the author associated with *The Ethics of Belief*. Within this course, Clifford supplies the strict evidential pressure concerning responsibility for belief formation. | `E-W1-002` (L110–123) | `new` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `person:william-james` | William James | Named by PRE as the author associated with *The Will to Believe*. Within this course, James supplies the counterpressure that withholding commitment is not always neutral when an option is live and consequential. | `E-W1-003` (L125–138) | `new` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `person:david-hume` | David Hume | Named by PRE as the author associated with *An Enquiry Concerning Human Understanding*. Within this course, Hume complicates the Clifford–James framing through induction, custom, and ordinary expectation. | `E-W1-004` (L140–153) | `new` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `person:andrew-chignell` | Andrew Chignell | Named by PRE as the author of the Stanford Encyclopedia companion “The Ethics of Belief,” first published in 2010 and revised in 2016 according to the draft. | `E-W1-005` (L155–177) | `new` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `person:chad-hansen` | Chad Hansen | Named by PRE as the author of the Stanford Encyclopedia companion “Zhuangzi,” substantively revised in 2024 according to the draft. | `E-W2-005` (L330–350) | `new` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `person:bhikkhu-bodhi` | Bhikkhu Bodhi | Named by PRE in connection with the 1985 companion introduction “The Dhammapada: The Buddha's Path of Wisdom.” The exact contributor and edition metadata must be resolved before publication. | `E-W2-006` (L360–380) | `new` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `person:acharya-buddharakkhita` | Acharya Buddharakkhita | Named by PRE as the translator whose *Dhammapada* translation is accompanied by the cited introduction. This is a translation-role candidate, not an authorship claim for the traditional text. | `E-W2-006` (L360–380) | `new` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `person:s-radhakrishnan` | S. Radhakrishnan | Named by PRE as the modern Indian philosopher responsible for the cited translation and interpretation of the *Kena Upanishad* in *The Principal Upanishads*. | `E-W2-007` (L390–410) | `new` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |
| `person:herbert-a-giles` | Herbert A. Giles | Named in PRE's *Zhuangzi* translation note. The draft treats his translation as historically important but dated and asks learners to compare its choices with contemporary context. | `E-W2-002` (L280–295) | `new` | `candidate` | `CANDIDATE_IDENTITY_REVIEW` |

### 4.4 Concept nodes — 24 candidates

These are course-level inquiry concepts, not claims that all six core works use the same concepts in the same sense.

| Stable ID | Display name | Draft synthesis | Evidence | Identity state | Review state | Candidate class |
| --- | --- | --- | --- | --- | --- | --- |
| `concept:responsible-openness` | Responsible openness | A disciplined willingness to keep a question open while still evaluating evidence, risk, timing, and obligations. PRE distinguishes it from credulity, permanent indecision, and uncertainty treated as a virtue. | `E-PRE-001` (L3–15); `E-PRE-002` (L17–23); `E-W2-010` (L489–511) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:belief` | Belief | A stance toward a claim whose formation can affect action and shared inquiry. PRE distinguishes believing a proposition from acting because a possibility or risk deserves consideration. | `E-W1-002` (L110–123); `E-W1-005` (L155–187) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:evidence` | Evidence | Support relevant to a claim or decision. PRE treats evidential strength as essential while emphasizing that evidence may remain incomplete when action, delay, trust, or risk still requires judgment. | `E-W1-001` (L95–106); `E-W1-005` (L161–187) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:certainty` | Certainty | A condition in which doubt is treated as resolved. PRE investigates responsible belief, commitment, and action when certainty is unavailable without implying that every uncertain possibility is equally supported. | `E-PRE-002` (L17–23); `E-W1-003` (L125–138); `E-W1-007` (L214–223) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:habit-based-expectation` | Habit-based expectation | PRE's Hume-framed idea that repeated experience produces ordinary expectation even when no deductive proof guarantees the future. This differs from a conviction insulated from contrary evidence. | `E-W1-004` (L140–153) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:commitment` | Commitment | Accepting or acting on an option before proof settles it. PRE presents commitment as potentially permissible under limited conditions, not as a process that makes a belief true. | `E-W1-003` (L125–138); `E-W1-009` (L244–259) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:genuine-option` | Genuine option | PRE's James-framed category for an option that is live, forced, and momentous. The category limits the argument for commitment and does not license believing whatever feels comforting. | `E-W1-003` (L125–138) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:provisional-commitment` | Provisional commitment | A temporary, revisable commitment made before certainty, paired with an explicit condition for reconsideration. PRE offers it as one possible next move rather than a universal solution. | `E-W1-006` (L193–212); `E-W1-009` (L250–259) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:withholding-judgment` | Withholding judgment | Delaying belief when the evidence does not warrant settlement. PRE also asks when delay has costs, closes possibilities, or allows a practical choice to be made by inaction. | `E-W1-001` (L95–106); `E-W1-006` (L193–212) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:acting-under-uncertainty` | Acting under uncertainty | Choosing a response based on available evidence, risk, and time without claiming an uncertain outcome is certain. The supplied storm case separates action on serious risk from belief that the storm will definitely occur. | `E-W1-005` (L179–187); `E-PRE-008` (L533–537) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:problem-of-induction` | Problem of induction | The problem that past regularity does not logically guarantee future regularity. PRE uses it to expose a gap between rational demonstration and the expectations ordinary life still requires. | `E-W1-004` (L140–153) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:uncertainty` | Uncertainty | A condition to diagnose rather than celebrate. PRE asks what the uncertainty consists of, what would reduce it, whether action can wait, and what responsibility remains while the answer is open. | `E-PRE-002` (L17–23); `E-W2-001` (L263–276); `E-W2-010` (L489–511) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:contradiction` | Contradiction | A collision that remains after key terms, questions, evidence, levels of description, and interpretations have been clarified. PRE warns against treating every tension as either a simple error or a profound paradox. | `E-PRE-005` (L61–70); `E-W2-008` (L420–456) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:ambiguity` | Ambiguity | A tension produced when the same word is used in different senses. Clarifying the meanings can make the disagreement more precise without necessarily resolving the ethical or practical issue. | `E-W2-008` (L428–438); `E-PRE-008` (L539–543) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:incomplete-evidence` | Incomplete evidence | A state in which important facts are missing, preventing a settled conclusion. PRE distinguishes this from contradiction and shows that a time-sensitive action may still be responsible. | `E-W2-008` (L428–456); `E-PRE-008` (L533–537) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:different-levels-of-description` | Different levels of description | An apparent conflict in which statements answer different questions or operate at different descriptive, explanatory, moral, psychological, or metaphysical levels. PRE asks learners to test this before declaring contradiction. | `E-PRE-005` (L61–70); `E-W2-008` (L428–438) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:competing-interpretation` | Competing interpretation | Rival accounts of what evidence, an observation, or a source means. PRE treats interpretive disagreement as distinct from both missing facts and a direct logical contradiction. | `E-PRE-005` (L61–70); `E-W2-008` (L428–438) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:interpretation-versus-projection` | Interpretation versus projection | The course's question about what a source supports and what the comparing reader supplies. It functions as a guardrail against calling a personally compelling resemblance a discovery about the sources themselves. | `E-PRE-003` (L25–35); `E-PRE-006` (L72–79) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:connection-versus-coincidence` | Connection versus coincidence | The problem of determining what kind of relationship a resemblance actually supports. PRE separates documented historical contact, conceptual comparison, editorial juxtaposition, personal resonance, and shared-doctrine claims. | `E-PRE-004` (L37–51); `E-PRE-006` (L72–79); `E-W1-008` (L233–242); `E-PRE-008` (L545–549) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:perspective` | Perspective | A viewpoint that changes which distinctions, assumptions, and features become visible. PRE's *Zhuangzi* framing uses perspective to loosen confidence in one final standpoint without concluding that all claims are equally good. | `E-W2-002` (L280–295); `E-W2-005` (L330–350) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:heedfulness` | Heedfulness | In PRE's *Dhammapada* context, an ethical and contemplative cultivation of attention, intention, conduct, and action. It is not merely productivity advice, instant control, or a basis for blaming suffering on “negative thoughts.” | `E-W2-003` (L297–312); `E-W2-006` (L360–384) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:knowledge` | Knowledge | What it is to know and what a mode of knowing can adequately grasp. PRE's Kena framing distinguishes missing information from the deeper question of whether object-like knowledge is adequate to the subject under inquiry. | `E-W2-004` (L314–328); `E-W2-007` (L390–410) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:limits-of-conceptual-grasping` | Limits of conceptual grasping | The possibility that concepts fail to master or objectify their subject even when the issue is not simple ignorance. PRE treats this as a question about the adequacy of a tool of knowing, not proof of a theory of consciousness. | `E-W2-004` (L314–328); `E-W2-007` (L396–414) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `concept:training-versus-release` | Training versus release | PRE's Week 2 tension over whether a better response to uncertainty can be cultivated and where deliberate practice may meet a limit. The course does not assume that the three Week 2 works give the same answer. | `E-PRE-006` (L72–79); `E-W2-001` (L263–276) | `new` | `candidate` | `CANDIDATE_CONCEPTUAL_REVIEW` |

## 5. Candidate edge inventory

### 5.1 Edge semantics

Each future edge should retain two independent fields:

1. `edge_class`: `structural` or `interpretive`
2. `epistemic_kind`: `artifact_documented`, `documented_historical`, `conceptual`, or `editorial`

`artifact_documented` means only that the hashed course draft explicitly records the relationship. It is not the same as verified historical interaction.

No `historically_connected_to`, `influenced_by`, `derives_from`, or `doctrinally_related_to` cross-source edge is proposed by this package. The course's phrase “shared doctrine” maps to the controlled predicate `doctrinally_related_to`.

All 66 edge rows have `review_state: candidate`. Their final column records candidate class, not workflow approval.

#### Scope, confidence, and connection-semantics defaults

| Section | Edge class | Scope default | Confidence default |
| --- | --- | --- | --- |
| §5.2 course inclusion | `structural` | Not applicable | `established` for inclusion in the hashed course artifact only |
| §5.3 contributor edges `011`–`019` | `structural` / bibliographic candidate | Not applicable | `speculative` pending canonical identity, edition, and role verification |
| §5.3 context edges `020`–`024` | `structural` / course context | Not applicable | `established` only as an explicit companion/context role in the artifact |
| §§5.4–5.6 | `interpretive` | `course_context` | `interpretive` |

The normalized predicate is intentionally broader than some original course phrasing. In this combined Markdown pilot, each row's draft `connection_summary` is defined as `render(template[predicate], source_display_name, target_display_name, week_metadata, evidence_ids)`. The table below supplies `template[predicate]`, and every edge row supplies the remaining arguments. A reviewer may refine the materialized prose without changing the predicate or evidence silently.

| Predicate | Draft connection-summary template |
| --- | --- |
| `uses_primary_work` | PRE assigns **{target}** as a primary Week {week} work. This records course structure only; it does not establish agreement with the course's other works. |
| `uses_companion_work` | PRE assigns **{target}** as a Week {week} companion source. This records its contextual role, not final interpretive authority. |
| `authored_by` | The hashed PRE artifact names **{target}** as the author of **{source}**. Canonical identity and edition metadata remain subject to bibliographic review. |
| `translated_by` | The hashed PRE artifact associates **{target}** with the translation used or discussed for **{source}**. The exact expression or edition must be resolved before approval. |
| `contextualizes` | PRE uses **{source}** to contextualize **{target}**. This is a course-role claim and does not make the companion the only valid interpretation. |
| `explores` | In PRE, **{source}** is used to explore **{target}**. This is course framing, not an exhaustive definition of the source or a historical-contact claim. |
| `distinguishes_from` | PRE asks learners to distinguish **{source}** from **{target}** for the cited reason. The distinction is scoped to this course's diagnostic framework. |
| `refines` | PRE uses **{source}** to narrow or develop how **{target}** is understood. This does not imply historical influence. |
| `responds_to` | PRE presents **{source}** as a response to the problem or condition named by **{target}**. It does not imply complete resolution or historical reply. |
| `contrasts_with` | PRE places **{source}** and **{target}** in an explicit conceptual tension. The contrast does not imply that they are exhaustive opposites. |
| `editorially_juxtaposed_with` | Prismarium places **{source}** beside **{target}** for comparison. This edge is editorial-only and establishes neither historical contact nor shared doctrine. |

All source-specific nuance remains attached to the cited evidence and must be visible in the connection modal.

### 5.2 Structural course-to-work edges — 10 candidates

| Edge ID | Source → Target | Relation | Epistemic kind | Evidence | Candidate class |
| --- | --- | --- | --- | --- | --- |
| `edge:pre-struct-001` | `course:pre-how-to-hold-two-things-at-once` → `work:the-ethics-of-belief` | `uses_primary_work` (`week=1`) | `artifact_documented` | `E-W1-002` (L110–123) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-002` | `course:pre-how-to-hold-two-things-at-once` → `work:the-will-to-believe` | `uses_primary_work` (`week=1`) | `artifact_documented` | `E-W1-003` (L125–138) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-003` | `course:pre-how-to-hold-two-things-at-once` → `work:an-enquiry-concerning-human-understanding` | `uses_primary_work` (`week=1`) | `artifact_documented` | `E-W1-004` (L140–153) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-004` | `course:pre-how-to-hold-two-things-at-once` → `work:zhuangzi` | `uses_primary_work` (`week=2`) | `artifact_documented` | `E-W2-002` (L280–295) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-005` | `course:pre-how-to-hold-two-things-at-once` → `work:the-dhammapada` | `uses_primary_work` (`week=2`) | `artifact_documented` | `E-W2-003` (L297–312) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-006` | `course:pre-how-to-hold-two-things-at-once` → `work:kena-upanishad` | `uses_primary_work` (`week=2`) | `artifact_documented` | `E-W2-004` (L314–328) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-007` | `course:pre-how-to-hold-two-things-at-once` → `work:the-ethics-of-belief-stanford-encyclopedia` | `uses_companion_work` (`week=1`) | `artifact_documented` | `E-W1-005` (L155–191) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-008` | `course:pre-how-to-hold-two-things-at-once` → `work:zhuangzi-stanford-encyclopedia` | `uses_companion_work` (`week=2`) | `artifact_documented` | `E-W2-005` (L330–358) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-009` | `course:pre-how-to-hold-two-things-at-once` → `work:the-dhammapada-the-buddhas-path-of-wisdom-introduction` | `uses_companion_work` (`week=2`) | `artifact_documented` | `E-W2-006` (L360–388) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-010` | `course:pre-how-to-hold-two-things-at-once` → `work:the-principal-upanishads` | `uses_companion_work` (`week=2`) | `artifact_documented` | `E-W2-007` (L390–418) | `CANDIDATE_SOURCE_EXPLICIT` |

### 5.3 Structural attribution and source-context edges — 14 candidates

These candidate roles reproduce only what the course draft explicitly says. They still require canonical bibliographic review.

| Edge ID | Source → Target | Relation | Epistemic kind | Evidence | Candidate class |
| --- | --- | --- | --- | --- | --- |
| `edge:pre-struct-011` | `work:the-ethics-of-belief` → `person:w-k-clifford` | `authored_by` | `artifact_documented` | `E-W1-002` (L110–123) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-012` | `work:the-will-to-believe` → `person:william-james` | `authored_by` | `artifact_documented` | `E-W1-003` (L125–138) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-013` | `work:an-enquiry-concerning-human-understanding` → `person:david-hume` | `authored_by` | `artifact_documented` | `E-W1-004` (L140–153) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-014` | `work:the-ethics-of-belief-stanford-encyclopedia` → `person:andrew-chignell` | `authored_by` | `artifact_documented` | `E-W1-005` (L155–177) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-015` | `work:zhuangzi-stanford-encyclopedia` → `person:chad-hansen` | `authored_by` | `artifact_documented` | `E-W2-005` (L330–350) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-016` | `work:the-dhammapada-the-buddhas-path-of-wisdom-introduction` → `person:bhikkhu-bodhi` | `authored_by` | `artifact_documented` | `E-W2-006` (L360–380) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-017` | `work:the-dhammapada` → `person:acharya-buddharakkhita` | `translated_by` | `artifact_documented` | `E-W2-006` (L360–380) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-018` | `work:the-principal-upanishads` → `person:s-radhakrishnan` | `translated_by` | `artifact_documented` | `E-W2-007` (L390–410) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-019` | `work:zhuangzi` → `person:herbert-a-giles` | `translated_by` | `artifact_documented` | `E-W2-002` (L280–295) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-020` | `work:zhuangzi-stanford-encyclopedia` → `work:zhuangzi` | `contextualizes` | `artifact_documented` | `E-W2-005` (L330–350) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-021` | `work:the-dhammapada-the-buddhas-path-of-wisdom-introduction` → `work:the-dhammapada` | `contextualizes` | `artifact_documented` | `E-W2-006` (L360–380) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-022` | `work:the-principal-upanishads` → `work:kena-upanishad` | `contextualizes` | `artifact_documented` | `E-W2-007` (L390–410) | `CANDIDATE_IDENTITY_REVIEW` |
| `edge:pre-struct-023` | `work:the-ethics-of-belief-stanford-encyclopedia` → `work:the-ethics-of-belief` | `contextualizes` | `artifact_documented` | `E-W1-005` (L155–177) | `CANDIDATE_SOURCE_EXPLICIT` |
| `edge:pre-struct-024` | `work:the-ethics-of-belief-stanford-encyclopedia` → `work:the-will-to-believe` | `contextualizes` | `artifact_documented` | `E-W1-005` (L155–177) | `CANDIDATE_SOURCE_EXPLICIT` |

### 5.4 Course/work-to-concept interpretive edges — 24 candidates

These edges mean “PRE frames this source or course through this concept.” They are not universal definitions of the works and should appear in a modal under **Course framing**, not **Historical relationship**.

| Edge ID | Source → Target | Relation | Epistemic kind | Evidence | Candidate class |
| --- | --- | --- | --- | --- | --- |
| `edge:pre-interpretive-001` | `course:pre-how-to-hold-two-things-at-once` → `concept:responsible-openness` | `explores` | `editorial` | `E-PRE-001` (L3–15); `E-PRE-002` (L17–23) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-002` | `work:the-ethics-of-belief` → `concept:belief` | `explores` | `editorial` | `E-W1-002` (L110–123) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-003` | `work:the-ethics-of-belief` → `concept:evidence` | `explores` | `editorial` | `E-W1-002` (L110–123) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-004` | `work:the-will-to-believe` → `concept:commitment` | `explores` | `editorial` | `E-W1-003` (L125–138) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-005` | `work:the-will-to-believe` → `concept:genuine-option` | `explores` | `editorial` | `E-W1-003` (L125–138) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-006` | `work:the-will-to-believe` → `concept:certainty` | `explores` | `editorial` | `E-W1-003` (L125–138) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-007` | `work:an-enquiry-concerning-human-understanding` → `concept:problem-of-induction` | `explores` | `editorial` | `E-W1-004` (L140–153) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-008` | `work:an-enquiry-concerning-human-understanding` → `concept:habit-based-expectation` | `explores` | `editorial` | `E-W1-004` (L140–153) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-009` | `work:an-enquiry-concerning-human-understanding` → `concept:uncertainty` | `explores` | `editorial` | `E-W1-004` (L140–153) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-010` | `course:pre-how-to-hold-two-things-at-once` → `concept:provisional-commitment` | `explores` | `editorial` | `E-W1-006` (L193–212); `E-W1-009` (L250–259) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-011` | `course:pre-how-to-hold-two-things-at-once` → `concept:withholding-judgment` | `explores` | `editorial` | `E-W1-006` (L193–212) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-012` | `course:pre-how-to-hold-two-things-at-once` → `concept:acting-under-uncertainty` | `explores` | `editorial` | `E-W1-005` (L179–187); `E-W1-006` (L193–212) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-013` | `course:pre-how-to-hold-two-things-at-once` → `concept:contradiction` | `explores` | `editorial` | `E-PRE-005` (L61–70); `E-W2-008` (L420–456) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-014` | `course:pre-how-to-hold-two-things-at-once` → `concept:ambiguity` | `explores` | `editorial` | `E-PRE-005` (L61–70); `E-W2-008` (L420–456) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-015` | `course:pre-how-to-hold-two-things-at-once` → `concept:incomplete-evidence` | `explores` | `editorial` | `E-PRE-005` (L61–70); `E-W2-008` (L420–456) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-016` | `course:pre-how-to-hold-two-things-at-once` → `concept:different-levels-of-description` | `explores` | `editorial` | `E-PRE-005` (L61–70); `E-W2-008` (L420–456) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-017` | `course:pre-how-to-hold-two-things-at-once` → `concept:competing-interpretation` | `explores` | `editorial` | `E-PRE-005` (L61–70); `E-W2-008` (L420–456) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-018` | `course:pre-how-to-hold-two-things-at-once` → `concept:interpretation-versus-projection` | `explores` | `editorial` | `E-PRE-003` (L25–35); `E-PRE-006` (L72–79) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-019` | `course:pre-how-to-hold-two-things-at-once` → `concept:connection-versus-coincidence` | `explores` | `editorial` | `E-PRE-004` (L37–51); `E-PRE-006` (L72–79) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-020` | `work:zhuangzi` → `concept:perspective` | `explores` | `editorial` | `E-W2-002` (L280–295); `E-W2-005` (L330–350) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-021` | `work:the-dhammapada` → `concept:heedfulness` | `explores` | `editorial` | `E-W2-003` (L297–312); `E-W2-006` (L360–380) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-022` | `work:kena-upanishad` → `concept:knowledge` | `explores` | `editorial` | `E-W2-004` (L314–328); `E-W2-007` (L390–410) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-023` | `work:kena-upanishad` → `concept:limits-of-conceptual-grasping` | `explores` | `editorial` | `E-W2-004` (L314–328); `E-W2-007` (L390–410) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-interpretive-024` | `course:pre-how-to-hold-two-things-at-once` → `concept:training-versus-release` | `explores` | `editorial` | `E-PRE-006` (L72–79); `E-W2-001` (L263–276) | `CANDIDATE_EDITORIAL_ONLY` |

### 5.5 Concept-to-concept edges — 12 candidates

These are course-derived conceptual distinctions. Asymmetric predicates remain directional; symmetric predicates use lexically canonical endpoint order. Every edge retains its evidence.

| Edge ID | Source → Target | Relation | Epistemic kind | Evidence | Candidate class |
| --- | --- | --- | --- | --- | --- |
| `edge:pre-concept-001` | `concept:belief` → `concept:acting-under-uncertainty` | `distinguishes_from` | `conceptual` | `E-W1-005` (L171–187) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-002` | `concept:evidence` → `concept:certainty` | `distinguishes_from` | `conceptual` | `E-PRE-002` (L17–23); `E-W1-001` (L95–106) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-003` | `concept:genuine-option` → `concept:commitment` | `refines` | `conceptual` | `E-W1-003` (L125–138) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-004` | `concept:provisional-commitment` → `concept:commitment` | `refines` | `conceptual` | `E-W1-006` (L193–212); `E-W1-009` (L250–259) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-005` | `concept:commitment` → `concept:withholding-judgment` | `contrasts_with` | `conceptual` | `E-W1-001` (L95–106); `E-W1-006` (L193–212) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-006` | `concept:habit-based-expectation` → `concept:problem-of-induction` | `responds_to` | `conceptual` | `E-W1-004` (L140–153) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-007` | `concept:contradiction` → `concept:ambiguity` | `distinguishes_from` | `conceptual` | `E-PRE-005` (L61–70); `E-W2-008` (L428–438) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-008` | `concept:contradiction` → `concept:incomplete-evidence` | `distinguishes_from` | `conceptual` | `E-PRE-005` (L61–70); `E-W2-008` (L428–438) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-009` | `concept:contradiction` → `concept:different-levels-of-description` | `distinguishes_from` | `conceptual` | `E-PRE-005` (L61–70); `E-W2-008` (L428–438) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-010` | `concept:contradiction` → `concept:competing-interpretation` | `distinguishes_from` | `conceptual` | `E-PRE-005` (L61–70); `E-W2-008` (L428–438) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-011` | `concept:responsible-openness` → `concept:uncertainty` | `responds_to` | `conceptual` | `E-PRE-002` (L17–23); `E-W2-010` (L489–511) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-concept-012` | `concept:heedfulness` → `concept:training-versus-release` | `editorially_juxtaposed_with` | `editorial` | `E-PRE-006` (L72–79); `E-W2-003` (L297–312) | `CANDIDATE_EDITORIAL_ONLY` |

### 5.6 Cross-work interpretive edges — 6 candidates

| Edge ID | Source → Target | Relation | Epistemic kind | Evidence | Candidate class |
| --- | --- | --- | --- | --- | --- |
| `edge:pre-cross-001` | `work:the-ethics-of-belief` → `work:the-will-to-believe` | `contrasts_with` | `conceptual` | `E-PRE-003` (L31–33); `E-W1-009` (L244–248) | `CANDIDATE_CONCEPTUAL_REVIEW` |
| `edge:pre-cross-002` | `work:an-enquiry-concerning-human-understanding` → `work:the-ethics-of-belief` | `editorially_juxtaposed_with` | `editorial` | `E-W1-004` (L140–153); `E-W1-009` (L244–248) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-cross-003` | `work:an-enquiry-concerning-human-understanding` → `work:the-will-to-believe` | `editorially_juxtaposed_with` | `editorial` | `E-W1-004` (L140–153); `E-W1-009` (L244–248) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-cross-004` | `work:the-dhammapada` → `work:zhuangzi` | `editorially_juxtaposed_with` | `editorial` | `E-PRE-003` (L31–33); `E-W2-001` (L270–276); `E-W2-009` (L478–487) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-cross-005` | `work:kena-upanishad` → `work:zhuangzi` | `editorially_juxtaposed_with` | `editorial` | `E-PRE-003` (L31–33); `E-W2-001` (L270–276); `E-W2-009` (L478–487) | `CANDIDATE_EDITORIAL_ONLY` |
| `edge:pre-cross-006` | `work:kena-upanishad` → `work:the-dhammapada` | `editorially_juxtaposed_with` | `editorial` | `E-PRE-003` (L31–33); `E-W2-001` (L270–276); `E-W2-009` (L478–487) | `CANDIDATE_EDITORIAL_ONLY` |

The three Week 2 edges above are deliberately **editorial juxtaposition only**. This package proposes no conceptual-similarity score among the three works and no `historically_connected_to`, `influenced_by`, `derives_from`, or `doctrinally_related_to` edge.

## 6. Explicit non-edges and anti-inference rules

The review tool should preserve these as blocked inferences:

| Blocked proposal | Reason | Evidence |
| --- | --- | --- |
| `work:zhuangzi` → `person:zhuangzi` as `authored_by` | The course calls the work composite and layered and does not establish simple authorship. | `E-W2-002` (L280–295); `E-W2-005` (L330–350) |
| `work:the-dhammapada` → a Buddha person node as `authored_by` | The course identifies a traditional Buddhist collection and a path context; it does not supply modern authorship metadata. | `E-W2-003` (L297–312); `E-W2-006` (L360–380) |
| `work:kena-upanishad` → any person as `authored_by` | No author is named in the source artifact. | `E-W2-004` (L314–328) |
| Any Week 2 core work pair as `historically_connected_to`, `influenced_by`, or `derives_from` | The course explicitly says proximity is an editorial experiment, not evidence of interaction or transmission. | `E-PRE-003` (L25–35); `E-PRE-004` (L37–51) |
| Any Week 2 core work pair as `doctrinally_related_to` | The course explicitly rejects three versions of one universal answer. | `E-W2-001` (L270–276); `E-W2-009` (L478–487) |
| Resemblance as proof of transmission | The supplied case says resemblance without date, contact, shared source, or route supports only conceptual similarity or editorial juxtaposition. | `E-PRE-008` (L545–549) |
| A mandatory numeric similarity score | A score would imply precision and sameness not supported by the course. Type and evidence should be reviewed before any optional weight. | `E-PRE-004` (L37–51); `E-W2-009` (L478–487) |

## 7. Proposed dossier/modal behavior

Every candidate entity should eventually open the same profile shell used by mature correspondence entities, with kind-specific sections.

### Shared header

- Candidate/approved badge
- Entity kind and stable ID
- Display name and aliases
- Draft synthesis
- Source hash and last reviewed date
- “Report/flag interpretation” action

### Course node

- Synthesis
- Core question and key tensions
- Week-grouped readings and companions
- Concepts introduced
- Graph paths used by course exercises
- Provenance locators

### Work node

- Synthesis
- Canonical `texts` match or unresolved-match warning
- Named authors, translators, and contributors with role labels
- Course appearances and exact week/selection
- Source-specific concept framings
- Connections grouped into:
  - structural/contextual;
  - documented historical;
  - conceptual;
  - editorial
- A persistent warning when only editorial proximity exists

### Person node

- Synthesis limited to course-supported identity
- Works and explicit roles
- Course appearances
- Bibliographic identity status
- No inferred tradition, doctrine, or influence

### Concept node

- Draft synthesis
- “How PRE uses this term”
- Source voices shown separately rather than collapsed into consensus
- Course appearances and exercises
- Typed connections and their evidence
- “Where apparent agreement breaks down”
- Related concepts, including distinctions such as contradiction vs ambiguity

The modal must not label an editorial synthesis as a neutral consensus. For PRE, “synthesis” should mean a reviewed account of the evidence and disagreements, not a claim that multiple sources converge on one doctrine.

## 8. Human review sequence

1. **Source freeze check:** Recalculate SHA-256 and stop if it differs from this package.
2. **Canonical work resolution:** Match each work candidate to `texts` and `course_texts`; do not create duplicates merely because titles vary.
3. **Contributor-role review:** Verify author, translator, editor, and introduction roles against the resolved edition.
4. **Concept review:** Approve, rename, merge, or reject each concept. Check that syntheses remain course-specific and do not universalize a source.
5. **Structural edge review:** Confirm week, core/companion role, and contributor role.
6. **Interpretive edge review:** Require a reviewer decision on every conceptual and editorial edge.
7. **Non-edge audit:** Confirm that no blocked authorship, historical-contact, transmission, or shared-doctrine edge has appeared.
8. **Dossier preview:** Inspect every node's synthesis and relationship grouping in a local/staging review surface.
9. **Bundle generation:** Only after approval, generate a typed graph bundle capable of preserving node kind, edge class, epistemic kind, evidence, direction, and review status.
10. **Promotion:** Follow the repository's intentional staging/export/review/import workflow. Do not publish directly from this document.

## 9. Pilot acceptance criteria

The PRE candidate can move beyond review-only only when:

- all 44 node identities have been accepted, merged, or rejected;
- every accepted node has a reviewed synthesis and at least one evidence locator;
- every accepted work has a resolved canonical record or an explicit unresolved warning;
- every person relation has a verified contributor role;
- every accepted edge has a stable ID, direction, type, epistemic kind, evidence, and reviewer;
- all three Week 2 cross-work edges remain editorial-only unless independent historical evidence is separately added and cited;
- no graph UI presents editorial proximity as shared doctrine;
- the package can be previewed and diffed without writing to production.

## 10. Current identity baseline, diff, and QA report

### Identity baseline

This is a planning-time identity check against the repository snapshots, not final authority control:

| Candidate | Current baseline | Candidate identity state |
| --- | --- | --- |
| `course:pre-how-to-hold-two-things-at-once` | Existing course UUID `a8cd1728-ff6b-4f76-98e6-61bd86ae6a2c` | `existing` |
| `work:an-enquiry-concerning-human-understanding` | Catalog `T088`; text UUID `73bedaa6-f6fc-4e30-a7ae-1596b11cbcce` | `existing`, edition/selection review remains |
| `work:the-dhammapada` | Catalog `T026`; text UUID `37c63950-f8ca-4279-bc1b-da63c2ba0ae4` | `existing`, translation/selection review remains |
| `work:kena-upanishad` | Broader *Upanishads* catalog `T016`; text UUID `540bc6c0-3540-4382-a910-559a4a3a63b7` | `merge_candidate`; exact Kena work/expression must be resolved |
| `work:zhuangzi` | Catalog `T127`; exact text UUID/edition unresolved in the inspected snapshots | `merge_candidate` |
| Clifford and James primary works | No matching inspected library record | `unresolved` |
| Four companion works | Course supplies titles/links, but canonical work and edition records are unresolved | `unresolved` |
| Nine people | The current product schema has no canonical person registry | `new` candidates pending authority review |
| Twenty-four concepts | No automatic match to the four legacy convergence concepts; homonymous Correspondence nodes are a separate graph kind | `new`; reviewers may change a row to `merge_candidate` if later evidence identifies a true same-kind match |

The current graph bundle baseline contains four legacy convergence concepts and six convergence links. This PRE package proposes 44 generic course-graph nodes and 66 typed edges, no deletions, and no automatic merge with that legacy plane. Because the current version-1 bundle cannot preserve these node kinds, predicates, scopes, or evidence, the promotion diff is **blocked by schema** rather than converted lossily.

### QA executed

| Check | Result |
| --- | --- |
| Exact PRE source SHA-256 recalculated | Pass — `9952d1aa524590cd66f5c1b44eb91f180264eab575a74294e16bd2cf3fa9f1ab` |
| Course Parser V2 test command | Pass — 8 tests, 0 failures |
| Unique candidate node IDs | Pass — 44 |
| Unique candidate edge IDs | Pass — 66 |
| Missing edge endpoints | Pass — 0 |
| Orphan candidate nodes | Pass — 0 |
| Week 2 cross-work edges classified editorial-only | Pass — 3 of 3 |
| Proposed `doctrinally_related_to` edges | Pass — 0 |
| Proposed `historically_connected_to`, `influenced_by`, or `derives_from` cross-work edges | Pass — 0 |
| Database, staging, production, or Mission Control writes | Pass — none |

The PRE learner artifact and its production notes are still untracked in the adjacent Mission Control repository. The hash freezes this review input, but a reviewed Git commit or another approved immutable source record is still required before promotion work begins.
