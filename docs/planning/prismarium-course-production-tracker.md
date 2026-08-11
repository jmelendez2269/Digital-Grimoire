# Prismarium course and YouTube production tracker

**Created:** August 6, 2026  
**Last updated:** August 6, 2026  
**Status:** Ready to begin with PRE  
**Active course:** PRE — How to Hold Two Things at Once  
**Engineering dependency:** None for writing, rehearsal, recording, or editing  
**Related build tracker:** [Lean membership implementation tracker](prismarium-membership-implementation-tracker.md)

This board tracks the work required to teach and prepare Prismarium courses and videos for release. It is intentionally separate from membership engineering. Writing, rehearsal, recording, editing, captioning, and public-video upload can begin now. Turning on paid course access and membership-dependent site links still follows the lean membership launch gates.

The site, course archive, saved work, and tools must retain value without a constant video schedule. This tracker therefore records releases without creating a promise to publish weekly, monthly, or forever. Public videos and resources are an accessibility path; other future creator formats may be paid or member-only.

## Status language

| Status | Meaning |
|---|---|
| `evidenced` | A concrete artifact or live behavior exists and has been checked. |
| `in_progress` | This is active production work. |
| `ready` | Prior editorial decisions are sufficient to begin. |
| `not_started` | Work has not begun or no evidence has been recorded. |
| `needs_review` | An artifact exists but still needs a human teaching/editorial decision. |
| `blocked` | Work cannot proceed; the exact unblock condition must be named. |
| `not_applicable` | The stage is deliberately unnecessary for this release. |

Do not convert these states into a percentage. A manuscript can be technically present and still not be ready to teach. Release readiness is a checklist judgment supported by artifacts, not a guessed completion number.

## Production stages

Every course moves through these stages. A stage can overlap with another when it does not create rework.

| Stage | Completion evidence |
|---|---|
| 1. Teaching promise | Final title, core question, audience, outcomes, scope boundaries, and honest workload |
| 2. Source pack | Sources selected, rights/access route recorded, citations traceable, and weak/contested claims flagged |
| 3. Curriculum | Weeks/lessons sequenced with readings, practices, workbook prompts, and capstone where applicable |
| 4. Accessible practice | Generative exercises have a manual/Library/Search/Graph alternative or intentionally granted capacity |
| 5. Site presentation | Course parses/imports, public preview is safe, learner rendering works, and links/assets resolve |
| 6. Teaching edit | Spoken-language pass, pacing, examples, transitions, sensitivity/context, and final fact check |
| 7. Video package | Episode outline/script, hook, visual/source notes, description, chapters, and disclosure language |
| 8. Production | Record, edit, caption, audio/visual QA, thumbnail, metadata, and upload |
| 9. Link and release | Site links point to safe canonical videos/playlists; course availability and announcement are verified |
| 10. Retrospective | Corrections, learner friction, reusable production lessons, and next-course decision are recorded |

## Current course slate

The entries below are conservative. They record a preliminary August 6 snapshot; the prior test results are context without a linked command artifact and must be rerun before a release task becomes `evidenced`. They do not declare editorial or video work complete merely because a content file or preview exists. A database `published` row or a public preview is not the new membership-release authority.

| Course | Site state observed | Content/learner evidence | Editorial state | YouTube state | Next production decision |
|---|---|---|---|---|---|
| **PRE — How to Hold Two Things at Once** (2 weeks) | Public preview available; full course presented as open to everyone | Course content/import path exists; parser/presentation tests were reported passing in the preliminary audit and require release-session revalidation | `needs_review` — final teaching run-through and accessibility alternatives have not been signed off here | Identified as the first series; no finished outline, recording, or upload is claimed | Make PRE the active course. Complete the teaching run-through, then create the episode map/script package. |
| **C01 — How Humans Know What They Know** (8 weeks) | Public preview available; full-course page uses the existing membership policy, not a lean release decision | Course manuscript/fixture and V2 presentation exist; targeted tests were reported passing and require release-session revalidation | `needs_review` — final teaching edit and post-PRE sequencing are not signed off | Vote candidate; no publication is claimed | Hold as the likely core path until PRE reveals pacing and production lessons; then perform the teaching edit. |
| **FD01 — Mythic Imagination: When Old Stories Find You** (6 weeks) | Public preview available; full-course page uses the existing membership policy, not a lean release decision | Course fixture/presentation and graph preview exist; targeted tests were reported passing and require release-session revalidation | `needs_review` — final teaching edit and release order are not signed off | Vote candidate; no publication is claimed | Decide its order against C01 after PRE, then perform source/context and teaching QA. |

## Active board: PRE

| ID | Work item | Owner | Status | Evidence/notes |
|---|---|---|---|---|
| `COURSE-PRE-01` | Confirm teaching promise, audience, two-week outcomes, and what PRE intentionally does not cover | Jen | `ready` | Existing site title/core question are inputs, not automatic final approval. |
| `COURSE-PRE-02` | Run the complete course aloud as a learner and record pacing/confusion notes | Jen | `not_started` | Use the actual course order and workbook prompts. |
| `COURSE-PRE-03` | Review sources, citations, rights/access links, and contested-claim framing | Both | `not_started` | Record replacements or cautions in the course source artifact. |
| `COURSE-PRE-04` | Verify every generative practice has a useful zero-credit route | Both | `not_started` | No learner should be unable to complete PRE because credits run out. |
| `COURSE-PRE-05` | Apply teaching-edit decisions to the canonical course source | Build | `not_started` | Depends on PRE-02 through PRE-04 decisions. |
| `COURSE-PRE-06` | Re-run parser, presentation, link, and public-payload checks | Build | `not_started` | Membership L1 later proves saved work/progress; that is not required to draft or record. |
| `COURSE-PRE-07` | Choose episode boundaries and produce the first video outline/script package | Jen | `not_started` | No cadence promise; split by teaching coherence, not algorithmic pressure. |
| `COURSE-PRE-08` | Prepare visual/source notes, descriptions, chapters, and spoken disclosure language | Both | `not_started` | Keep citations and on-screen sourcing practical. |
| `COURSE-PRE-09` | Record and edit the first episode | Jen | `not_started` | Capture reusable production notes after the first rough cut. |
| `COURSE-PRE-10` | Caption and perform audio, visual, source, and accessibility QA | Both | `not_started` | Correct the master before upload where practical. |
| `COURSE-PRE-11` | Upload safely and connect canonical YouTube/playlist links to the site | Both | `not_started` | Verify privacy/publication state and links before announcement. |
| `COURSE-PRE-12` | Release check and retrospective | Both | `not_started` | Record corrections, learner friction, realistic effort, and the C01-versus-FD01 recommendation. |

## C01 queue

| ID | Work item | Status | Start condition |
|---|---|---|---|
| `COURSE-C01-01` | Confirm C01 is the next course after PRE | `not_started` | PRE retrospective or an explicit earlier business decision |
| `COURSE-C01-02` | Complete source/rights and contested-claim audit | `not_started` | C01 selected |
| `COURSE-C01-03` | Complete spoken teaching and pacing edit across 8 weeks | `not_started` | C01 selected |
| `COURSE-C01-04` | Verify manual alternatives and realistic credit load | `not_started` | Lean action catalog stable enough to quote costs |
| `COURSE-C01-05` | Re-verify import, learner, links, assets, and public payload | `not_started` | Editorial source updated |
| `COURSE-C01-06` | Create video package, produce, caption, upload, and link | `not_started` | Teaching edit approved |
| `COURSE-C01-07` | Release and retrospective | `not_started` | Course and video QA complete |

## FD01 queue

| ID | Work item | Status | Start condition |
|---|---|---|---|
| `COURSE-FD01-01` | Confirm FD01 release order against C01 | `not_started` | PRE retrospective or an explicit earlier business decision |
| `COURSE-FD01-02` | Complete source/rights, cultural-context, and contested-claim audit | `not_started` | FD01 selected |
| `COURSE-FD01-03` | Complete spoken teaching and pacing edit across 6 weeks | `not_started` | FD01 selected |
| `COURSE-FD01-04` | Verify manual alternatives and realistic credit load | `not_started` | Lean action catalog stable enough to quote costs |
| `COURSE-FD01-05` | Re-verify import, learner, graph view, links, assets, and public payload | `not_started` | Editorial source updated |
| `COURSE-FD01-06` | Create video package, produce, caption, upload, and link | `not_started` | Teaching edit approved |
| `COURSE-FD01-07` | Release and retrospective | `not_started` | Course and video QA complete |

## Release checklist

Use this for every public course/video release:

- [ ] The title, core question, outcomes, workload, and access promise match the actual course.
- [ ] Required sources are traceable and public links are safe; rights/access notes are recorded.
- [ ] Claims that are interpretive, contested, traditional, historical, or empirical are framed honestly.
- [ ] Workbook practices can be completed without an undisclosed additional purchase.
- [ ] Generative actions show their credit cost and have an appropriate alternative.
- [ ] Public preview payload contains no protected full-course material.
- [ ] Course links, readings, images, Graph views, and tool links resolve on desktop and mobile.
- [ ] Spoken content has been fact-checked after the final edit, not only at manuscript stage.
- [ ] Captions, chapters, descriptions, source notes, thumbnail, audio, and visual QA are complete.
- [ ] YouTube/channel/playlist links use the canonical safe destinations configured for the site.
- [ ] Availability flags and membership copy match what a real account can access.
- [ ] Release classification is correct: a paid course is on the explicit member-release allowlist (and Student selection/switching is complete before paid course two); a free course is on the free/public allowlist; a video-only release marks course entitlement `not_applicable`.
- [ ] No copy promises an ongoing publishing cadence or that all future creator content will be free.
- [ ] Corrections and rollback/unpublish steps are known.

## Session log

| Date | Course | Outcome | Next action |
|---|---|---|---|
| 2026-08-06 | Slate setup | Separated course/YouTube production from membership engineering. Recorded conservative observed states for PRE, C01, and FD01; no editorial or video completion was inferred. | Start `COURSE-PRE-01`, then perform the complete learner read-through in `COURSE-PRE-02`. |

## Immediate next move

Open PRE as a learner and decide whether its existing teaching promise is final (`COURSE-PRE-01`). Then run the entire two-week experience aloud and capture pacing, confusion, source, and workbook notes (`COURSE-PRE-02`). This work can begin before any membership code changes.
