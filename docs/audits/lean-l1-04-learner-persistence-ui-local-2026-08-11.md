# LEAN-L1-04 local verification — V2 learner persistence UI

**Date:** August 11, 2026  
**Packet:** `LEAN-L1-04`  
**Result:** Passed locally  
**Production effect:** None

## Outcome

The PRE V2 learner screen now uses the authorized L1-02/L1-03 course routes
for saved place and workbook/Journal state:

```text
GET /api/courses/pre-how-to-hold-two-things-at-once/journal
PUT /api/courses/pre-how-to-hold-two-things-at-once/progress
PUT /api/courses/pre-how-to-hold-two-things-at-once/journal
```

Persistence is enabled only for the exact PRE learner slug. Other V2 course
screens and the local parser preview keep their existing presentation behavior
and do not attempt PRE persistence.

Opening a saved course restores the last server-saved week and stage plus the
saved reflection for each week. Opening a week or stage saves resumable
progress. The Finish step provides a labeled workbook field that creates or
updates one stable `synthesis:week-reflection` Journal source per week.

## Learner states

| State | Learner-visible behavior | Input behavior |
|---|---|---|
| Loading | `Loading your saved place and Journal work…` | Existing browser draft is untouched |
| Saving | Spinner plus `Saving your place…` or `Saving your words…` | Field stays visible; duplicate saves are blocked |
| Saved | Check icon, saved time, and saved-page link | The saved text becomes the clean baseline |
| Retryable error | `Not saved`, safe reason, and `Retry save` | Exact unchanged request is retried; edited text gets a new request |
| Conflict | Explains that the saved copy changed and offers `Reload saved copy; keep draft` | Reload adopts the latest page/revision but never replaces newer browser words |
| Missing saved page | Clean old copies clear; newer browser words remain with a conflict explanation | A kept draft can be saved as a new page |
| Reader cap | Explains the 50-active-page rule and gives archive plus retry actions | Draft remains in the field; Journal opens in a new tab so the course stays open |

Progress saves are serialized so quick navigation does not create stale
parallel revisions. Journal buttons and reload controls disable while their
operation is active. Failure responses never clear the textarea or silently
replace it with a server copy.

## Files

| File | Purpose |
|---|---|
| `app/src/app/courses/[slug]/learn/page.tsx` | Enables the persistence UI for the exact PRE slug and supplies the learner's Journal name |
| `app/src/components/courses/CourseLearnerRenderer.tsx` | Connects V2 journey/stage changes and the week Finish panel to persistence |
| `app/src/components/courses/LearnerCoursePersistence.tsx` | Client reload/save queue, status UI, conflict recovery, retry, and archive guidance |
| `app/src/lib/courses/learner-save-client.ts` | Browser-safe response types, Journal text conversion, error parsing, and draft-preserving reload merge |
| `app/tests/learner-save-client.test.ts` | Focused clean reload, dirty reload, deleted-save, error, PRE-only, wiring, and recovery-copy checks |
| `docs/audits/lean-l1-04-narrow-journal-cap-2026-08-11.png` | 375-pixel-wide full-Journal evidence |

## Browser proof

A temporary local-only Next.js harness rendered the real final components while
Chromium intercepted the exact L1-02/L1-03 HTTP shapes. The harness and its
Playwright script were removed after the run.

The single 375 × 812 acceptance story passed in **14.4 seconds** and proved:

- clean mount restored Week 1 `finish`, saved progress, and saved Journal text;
- keyboard focus moved from the labeled textarea to `Save changes`, and Enter
  produced visible saving then saved states;
- full refresh remounted the UI and restored the newly saved words;
- a 409 conflict kept the newer draft, reloaded the newest saved revision, and
  then saved the kept draft;
- a retryable 500 kept the draft and succeeded through `Retry save`;
- keyboard activation opened the narrow-screen journey and selected Week 2;
- a 403 Journal-cap response kept the Week 2 draft, explained Reader's 50-page
  limit, opened `/journal` in a new tab, and exposed retry-after-archive;
- the 375-pixel viewport had no horizontal document overflow;
- no uncaught page error or JavaScript/React console error occurred. Expected
  mocked 409/500/403 resource responses and sandbox-blocked external resources
  were excluded from the console assertion.

[View the narrow-screen full-Journal state](lean-l1-04-narrow-journal-cap-2026-08-11.png).

The agent-browser preflight also confirmed meaningful rendered content, no
Next.js error overlay, and keyboard-discoverable controls before the acceptance
story ran.

## Automated verification

| Check | Result |
|---|---|
| L1-04 client/UI tests | **11/11 passed** |
| Existing L1-01 through L1-03 contract/endpoint tests | **21/21 passed** |
| Focused ESLint | **passed** |
| Global TypeScript | **passed** |
| Targeted tracked diff whitespace check | **passed** |
| Next.js production-style build | **passed**, **136/136 pages** |

The build used local placeholder Supabase settings and made no database
connection. Existing warnings about middleware naming, Sentry naming, old
browser-baseline data, dynamic cookie access, and placeholder fetch failures
remain unrelated.

One pre-final build compiled the app, then read a stale generated
`.next/dev/types` entry for the removed browser harness. Only the verified
generated `app/.next/dev` cache directory was removed. The clean rebuild passed
all 136 pages, and the standalone TypeScript rerun passed.

## Acceptance mapping

| Requirement | Evidence | Result |
|---|---|---|
| Clear saving, saved, error, conflict, and retry states | Live status regions, action labels, unit checks, and mocked Chromium transitions | Pass |
| Progress and Journal reload | Initial clean mount and full refresh restore saved week/stage/text | Pass |
| Preserve unsaved input on every failure | 409, 500, 403-cap, reload-merge, and missing-page checks | Pass |
| Archive to make room | 50-page explanation, new-tab Journal link, and retry-after-archive button | Pass |
| Keyboard use | Tab/Enter save plus keyboard journey navigation | Pass |
| Narrow screen | 375 × 812 full story, screenshot, and zero horizontal overflow | Pass |

## Limits and next boundary

L1-04 proves the real client UI and failure behavior against exact mocked route
responses. It does not claim an authenticated learner, local database, or real
new browser session completed the whole course story. `LEAN-L1-05` owns that
separate verified non-admin Reader flow from public preview through sign-in,
enrollment, saves, and a new-session reload.

No migration, database row, environment file, Stripe object, push, deployment,
remote request, or production setting changed. Rollback is application-only:
remove the new client persistence component/helper/tests and their small V2
integration points. Unrelated course presentation and content work was
preserved.

