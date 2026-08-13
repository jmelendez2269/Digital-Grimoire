# LEAN-L1-01 — V2 learner progress and week-save contract

**Status:** Local contract ready for focused verification  
**Contract version:** 1  
**Normative typed source:** `app/src/lib/courses/learner-save-contract.server.ts`  
**Production effect:** None. This packet defines rules; L1-02 and L1-03 implement them later.

This document explains the typed source in plain language. If prose and code ever disagree, stop and repair the mismatch before implementing an endpoint. Do not invent a second access list or save shape.

## 1. Identities

### Course identity

Every authorized learner operation uses three course identifiers, with different jobs:

| Field | Meaning | May grant access? |
|---|---|---|
| `courseSlug` | Stable server allowlist key | Yes, but only after the server finds an exact allowlist entry |
| `courseId` | Database UUID resolved by the server | No; it is only a storage/relationship key |
| `courseIdTag` | Editorial cross-check such as `PRE` | No; it helps detect a mismatched course row |

The free-course allowlist has exactly one entry:

```text
PRE -> pre-how-to-hold-two-things-at-once
```

The lookup is exact and case-sensitive. C01, FD01, taster-name guesses, title guesses, and every unknown slug fail closed. The database field `is_published` controls content publication/preview state only. It never grants enrollment, full-course, progress, or Journal-save authority.

### Week identity

`weekNumber` is a positive integer. The server must confirm that the number exists in the resolved course's V2 `content.weeks[].week_number` array. A positive number that does not exist in PRE is still rejected.

### Request and source identity

- `requestId` is a client-created UUID. A retry must reuse it only with the identical payload.
- `sourceKey` is a stable lowercase machine key, not a display title. It identifies one logical workbook source inside one week, for example `synthesis:week-reflection`.
- `pageId` is a Journal UUID returned by the server. Supplying a page ID never proves ownership.

## 2. Authorization order

The server performs these checks in order before it reads or writes learner state:

1. Verify the user through the server-side auth session; never trust a browser-supplied user ID.
2. Require a confirmed email.
3. Match the exact course slug in the server-owned allowlist.
4. Resolve the course row and cross-check `courseIdTag`.
5. Verify that the learner owns an enrollment for that course.
6. Verify that the requested week exists in that course.
7. Read or write only that learner's row/page through server-owned database authority, with RLS as a second safety layer.

Unknown, malformed, cross-user, and non-PRE requests fail before mutation. An admin shortcut, database ordering, presentation release status, or `is_published = true` must not silently widen this free-course authority.

## 3. Progress semantics

Progress means “where should this learner resume?” It is not a graduation system.

- There is one progress record per user and course in `course_enrollments`.
- `currentWeekNumber` is the last week explicitly opened. It may move backward when the learner revisits an earlier week.
- `currentStage` is one of `start`, `read`, `companions`, `practice`, or `finish`.
- `visitedWeekNumbers` is sorted, unique, and never shrinks.
- `course_enrollments.current_week` mirrors `currentWeekNumber`; the versioned object lives in `course_enrollments.progress`.
- `revision` starts at 1 and increases once per successful change. `savedAt` comes from the server clock.
- No `completed`, `passed`, certificate, slot-release, or billing field belongs in this contract.

A progress command includes `requestId`, `expectedRevision`, the PRE slug, current week/stage, and visited weeks. It does not accept `userId`, a trusted `courseId`, a revision chosen by the browser, or a timestamp chosen by the browser.

## 4. Week-save and Journal semantics

A week save is one durable Journal page addressed by:

```text
authenticated user + resolved course + week number + source key
```

Its required Journal metadata is:

| Contract field | Persistence meaning |
|---|---|
| `pageId` | `journal_pages.id`; null only for create |
| server user | `journal_pages.user_id`; never accepted from the body |
| resolved `courseId` | `journal_pages.course_id`; never authorized from the body |
| `weekNumber` | `journal_pages.week_number` |
| `sourceKey` | Stable source metadata used to prevent duplicate logical pages |
| `entryType` | `lens_exercise`, `synthesis`, `note`, or `capstone` |
| `artifactName` | Optional human-readable artifact label |
| `title` and `content` | The learner's durable Journal work |
| `revision`, `savedAt`, `requestId` | Server concurrency and replay metadata |

Create requires `pageId = null` and `expectedRevision = null`. Update requires the owned page ID and its current revision, and the page's course/week/source identity cannot change. Repeating the same `requestId` with the identical payload returns the original success without creating another page or revision. Reusing it with changed content returns `REQUEST_REPLAY_MISMATCH`.

An update does not consume another active Journal slot. A create obeys the Reader active-page limit. When the limit blocks creation, the server returns `JOURNAL_LIMIT_REACHED`; the browser keeps the unsaved words so the learner can archive a page and retry.

## 5. Errors and retry rules

Every error has an HTTP status, stable code, safe message, and `retryable` flag. Responses do not reveal whether another user's row or page exists.

| Status | Code | Meaning / client action |
|---:|---|---|
| 400 | `INVALID_REQUEST` | Fix malformed identifiers or content; do not auto-retry |
| 401 | `AUTH_REQUIRED` | Sign in, then reload |
| 403 | `EMAIL_VERIFICATION_REQUIRED` | Verify email before saving |
| 403 | `COURSE_NOT_ALLOWLISTED` | This free learner contract does not authorize the course |
| 404 | `COURSE_NOT_FOUND` | The allowlisted course row cannot be resolved safely |
| 403 | `ENROLLMENT_REQUIRED` | Enroll through the authorized PRE flow first |
| 404 | `WEEK_NOT_FOUND` | The week is not part of the resolved course |
| 403 | `JOURNAL_LIMIT_REACHED` | Preserve input; archive below the active-page cap; retry |
| 409 | `SAVE_CONFLICT` | Preserve input; reload the latest revision; let the learner retry/merge |
| 409 | `REQUEST_REPLAY_MISMATCH` | Generate a new request only after resolving the changed payload |
| 500 | `SERVER_ERROR` | Preserve input and retry the identical request ID/payload |

Validation/auth/access errors are not retryable. A transient server failure is retryable only with the identical request ID and payload. A conflict requires a reload before another save.

## 6. Reload behavior

On refresh or a new signed-in session, the client requests one non-cacheable `LearnerReloadSnapshotV1` for PRE. The server returns:

- the resolved course identity;
- the learner's progress state or `null`;
- only that learner's week-save pages, ordered predictably;
- a server `loadedAt` timestamp.

The server snapshot is the saved truth. Browser memory and local storage never grant access or count as a successful save. On a clean load, the UI restores the last week/stage and saved Journal content. If the browser already holds newer unsaved input, reload must not overwrite it; the UI keeps the draft and shows a conflict/retry choice.

All learner-state responses use `Cache-Control: no-store` so one person's saved work cannot be reused as another person's response.

## 7. Explicit exclusions

Contract version 1 does not create or imply:

- billing, Stripe, plan, credit, or subscription effects;
- retained access to a completed paid course;
- membership course-slot allocation or release;
- certificates or records of completion;
- a generalized course-completion, graduation, or downgrade lifecycle.

Those are separate product decisions. Adding them requires a new reviewed packet and contract version, not an extra field slipped into an L1 endpoint.

## 8. Implementation boundary

- L1-02 implements the authorized PRE progress read/write endpoint and its database/RLS support.
- L1-03 implements the Journal week-save path, source/revision/replay metadata, ownership checks, and active-page-cap behavior.
- L1-04 implements saving/saved/error/retry UI and safe reload conflict handling.
- L1-05 proves preview → sign-in → PRE enrollment → work save → progress save → new-session reload in a real browser.

Until those packets pass, this contract is a locally verified rulebook, not a claim that persistence is already complete in production.

