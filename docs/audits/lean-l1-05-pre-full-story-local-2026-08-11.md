# LEAN-L1-05 local verification — complete PRE learner story

**Date:** August 11, 2026  
**Packet:** `LEAN-L1-05`  
**Result:** Passed locally  
**Production effect:** None

## Outcome

A real non-admin Reader completed the whole PRE path in Chromium against the
real local Next.js routes and local Supabase data:

```text
public PRE preview
  → sign in
  → free PRE enrollment
  → authenticated full-course access
  → Week 1 progress save
  → Week 1 Journal save
  → close the browser profile
  → sign in from a new 375 × 812 browser session
  → restore Week 1 Finish and the exact saved reflection
```

No browser request was mocked or intercepted. The browser called the same
application routes used by the learner UI, and the routes read and wrote the
local PostgreSQL database through local Supabase.

## Test fixture

The local fixture used the approved two-week PRE manuscript and one new test
account. The account's database state was verified before enrollment:

| Check | Result |
|---|---|
| Application role | `user` (the current Reader role) |
| Subscription | `free` |
| Admin | `false` |
| Stripe customer/subscription | none |
| Existing enrollment | none |
| Existing Journal pages | none |

The fixture helper, [lean-l1-05-local-fixture.ts](../../app/scripts/lean-l1-05-local-fixture.ts),
refuses any non-local Supabase URL. It also tags the temporary PRE row and
refuses to replace or delete an untagged PRE course.

## Real browser and database proof

| Boundary | Evidence | Result |
|---|---|---|
| Public preview | The published PRE page rendered its title, safe week summaries, readings, and `Log in to start`; no error overlay appeared. | Pass |
| Sign in | The clean Reader used the normal email/password form. Focus reached `Sign In` and Enter submitted it. The requested PRE URL was preserved. | Pass |
| Free enrollment | `Start this path` called the real enrollment route, which returned `201`; the database created one enrollment at Week 1 with empty progress. | Pass |
| Full access | The enrolled Reader received `200` from `?access=full` and the real V2 learner screen rendered. The same user was still verified as non-admin and free. | Pass |
| Progress save | Opening Week 1 and its Finish stage produced real progress `PUT` responses. PostgreSQL stored Week 1, `finish`, revision 2. | Pass |
| Journal save | Keyboard focus moved from the labeled reflection field to the save button; Enter produced a real Journal `201`. PostgreSQL stored one 72-character Week 1 page at revision 1. | Pass |
| New session reload | The first browser profile was closed. A separate profile first redirected to sign-in, then returned to `/learn` and restored Week 1 `finish`, both saved indicators, and the exact 72-character reflection. | Pass |

The saved reflection's SHA-256 evidence was
`733c68f11f04142700675c7105c367d84e68b985cad47c4c4f94a4f2178381ea`.
This proves the database text matched the browser input without publishing the
full learner payload in the report.

[View the new-session narrow-screen reload](lean-l1-05-new-session-narrow-2026-08-11.png).

## Real failure and input preservation

After the successful save and reload, the tagged Reader fixture was filled to
exactly 50 active Journal pages. The narrow browser then opened Week 2 Finish,
entered a new draft, and submitted with Tab and Enter.

- The real Journal route returned `403` from the database-backed Reader cap.
- The exact draft remained in the textarea.
- The UI explained `Journal full.` and showed `Open Journal to archive a page`
  plus `Retry after archiving`.
- The database contained no Week 2 Journal page.
- The separate progress route still returned `200` and safely stored Week 2
  `finish`, revision 4, with visited weeks `[1, 2]`.

[View the real cap-failure state](lean-l1-05-real-cap-failure-narrow-2026-08-11.png).

## Public privacy boundary

Anonymous checks ran both before sign-in and again from a new clean browser
profile after the learner data existed.

The public PRE response returned `200`, `full: false`, `enrolled: false`, and
`admin: false`. Its content was limited to the approved preview keys. No
private stage, synthesis, Journal, progress, user ID, or email key appeared.

The following protected requests returned safe anonymous responses:

| Request | Status | Private learner marker or email present |
|---|---:|---|
| Full PRE course | `401` | No |
| PRE Journal snapshot | `401` | No |
| PRE progress snapshot | `401` | No |
| Enrollment status | `200`, `enrollment: null` | No |

After the private save, neither the public page nor its JSON response contained
the saved reflection marker, the rejected draft marker, or the test Reader's
email.

## Keyboard and narrow-screen result

- The sign-in form and both Journal save attempts were completed with keyboard
  focus plus Tab/Enter.
- The restored learner story ran at `375 × 812`.
- The document width was 369 pixels inside a 375-pixel viewport, so there was
  no horizontal page overflow.
- The saved text, progress state, error explanation, archive link, and retry
  action remained usable on the narrow screen.
- Both authenticated and anonymous acceptance sessions reported no uncaught
  browser errors and no Next.js error overlay.

## Automated checks

| Check | Result |
|---|---|
| Existing L1 contract/endpoint/client tests | **32/32 passed** |
| L0 local permission suite used for the stack prerequisite | **54/54 secure** with zero test residue |
| L1-02 local SQL story | **passed** with zero test residue |
| L1-03 local SQL story | **passed** with zero test residue |
| Focused ESLint, including the fixture helper | **passed** |
| Global TypeScript | **passed** |
| Targeted diff whitespace check | **passed** |

No application runtime code changed in L1-05. L1-04 already recorded the clean
136/136-page production-style build for the exact learner UI and routes now
exercised against real local APIs and data.

## Cleanup and rollback

Cleanup was executed after evidence capture:

1. Close all three L1-05 browser profiles.
2. Delete the tagged learner request rows, Journal pages, enrollment, Reader
   profile/auth account, and tagged PRE course.
3. Verify zero rows remain in `learner_journal_requests`,
   `learner_progress_requests`, `journal_pages`, `course_enrollments`, `users`,
   and `courses` for the fixture.
4. Stop the exact local process listening on port 3000.
5. Stop local Supabase while retaining its existing Docker volume.
6. Restore the temporary local Supabase port substitutions made to work around
   a Windows-reserved `543xx` port range.

The cleanup report returned **0 total residue**. The helper will not delete an
untagged PRE course, which keeps the cleanup scoped if it is used again.

To roll back the L1-05 evidence tooling itself, remove the fixture helper, this
dated report, and its two dated screenshots. That does not roll back or alter
the L1-01 through L1-04 learner implementation.

## Limits

This was a local Chromium/Supabase proof, not a staging or production canary.
No remote Supabase project, production database, Stripe object, environment
setting, deployment, domain, or production user was read or changed for this
packet. No push or commit occurred. Production behavior remains gated by a
separate exact plan and explicit approval.
