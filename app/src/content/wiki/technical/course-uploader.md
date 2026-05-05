---
title: Course Uploader
type: guide
status: stable
audience: admin
description: Admin guide for parsing and importing course markdown into the courses system.
---

# Course Uploader

## Overview

The Course Uploader is the admin workflow for turning a course production markdown document into a live course record in the Prismarium courses database.

**Admin Route:** `/admin/import-course`  
**Parse API:** `/api/admin/parse-course`  
**Import API:** `/api/admin/import-course`

This tool is designed for structured course briefs that follow the house markdown template in `docs/planning/course_template.md`.

---

## What It Does

The uploader handles three jobs:

1. **Preview parsing**
   Validate a markdown course draft before it is written to the database.

2. **Structured transformation**
   Convert the markdown into the JSON shape expected by the `courses` table, especially the `content` payload used by the public course pages and learner flow.

3. **Course creation**
   Insert a new course record with title, slug, premise, learning outcomes, level, duration, and structured weekly content.

---

## User Flow

### 1. Open the importer

Navigate to `/admin/import-course` from the Admin dashboard.

### 2. Choose an input method

The page supports:

- **Paste Text** for direct copy/paste from a course draft
- **Upload File** for `.md`, `.markdown`, or `.txt` files

### 3. Preview the parse

Use **Preview Parse** before import to:

- verify the title and generated slug
- confirm course metadata was recognized
- inspect week count and reading count
- catch parser warnings before writing data

### 4. Import the course

Use **Confirm Import** to create the course record.

Optional:

- enable **Publish immediately** to make the course public on creation
- leave it unchecked to save the course as a draft

### 5. Open the result

After a successful import, the page offers:

- **View Course** to open the public course detail page
- **Edit in Admin** to continue refining the course manually

---

## Expected Markdown Format

The parser expects a consistent structure built around `##` and `###` headings.

### Required top-level sections

- `# Course CXX – Title`
- `## COURSE METADATA`
- `## COURSE PREMISE`
- `## CURATOR'S NOTE`
- `## LEARNING OUTCOMES`
- `## KEY TENSIONS (Course Spine)` or `## KEY TENSIONS`
- `## COMPLETION PATHWAYS`
- one or more `## WEEK N – Title` sections

### Expected week subsections

Each week may contain:

- `### Core Question`
- `### Key Tension`
- `### Lens Focus`
- `### Readings (Selections)`
- `### Lens Exercise`
- `### Synthesis Prompt`
- `### Convergence Micro-Artifact`

Capstone weeks may also include:

- `### Final Reflection`

---

## Parser Output Shape

The uploader writes standard course fields plus a structured `content` object.

### Top-level course fields

- `title`
- `slug`
- `description`
- `premise`
- `learning_outcomes`
- `course_type`
- `level`
- `duration_weeks`
- `is_published`

### `content` payload

The `content` JSON includes:

- `arc`
- `arc_position`
- `core_question`
- `course_id_tag`
- `orientation`
- `mode`
- `curator_note_public`
- `tone_safety`
- `key_tensions`
- `completion_pathways`
- `weeks`

Each parsed week can include:

- `week_number`
- `title`
- `week_type`
- `core_question`
- `key_tension`
- `lens_focus`
- `readings`
- `lens_exercise`
- `synthesis_prompt`
- `micro_artifact`
- `final_reflection`

---

## Files Involved

### UI

- `app/src/app/admin/import-course/page.tsx`

The admin page for paste/upload, parse preview, warnings display, and import confirmation.

### Parser

- `app/src/lib/parsers/course-markdown-parser.ts`

Pure parser that transforms markdown into structured course data.

### Admin APIs

- `app/src/app/api/admin/parse-course/route.ts`
- `app/src/app/api/admin/import-course/route.ts`

`parse-course` validates and previews.  
`import-course` writes the course to the database after auth and admin checks.

### Course delivery APIs

- `app/src/app/api/courses/[id]/route.ts`
- `app/src/app/api/courses/[id]/enroll/route.ts`

These support the public course detail page and the learner flow after import.

---

## Validation Rules

### Slug generation

The importer generates a slug from:

- the course id tag from the `# Course CXX – Title` heading
- the normalized title text

Example:

- `# Course C02 – Symbol, Myth, and Psychotechnology`
- becomes `c02-symbol-myth-and-psychotechnology`

### Slug collision handling

If a course with the same slug already exists, the import API returns a `409` conflict and the UI surfaces a slug conflict error instead of overwriting the existing record.

### Warning behavior

Warnings do not block import by themselves. They are meant to flag incomplete structure such as:

- missing premise
- missing learning outcomes
- missing key tensions
- missing completion pathways
- a standard week with no parsed readings

---

## Operational Notes

### Adding Curator's Notes to uploaded courses

Courses that were imported before `## CURATOR'S NOTE` existed do not need to be re-uploaded. Open `/admin/courses`, look for the `Needs note` badge, choose **Edit**, and use the dedicated **Curator's Note** field. Saving the course writes the note into `content.curator_note_public`, which is the same field used by newly imported markdown courses.

For a batch pass across already published courses, use the backfill script:

```bash
npm run courses:curator-notes -- --list-missing
npm run courses:curator-notes -- --input ../docs/planning/course_curator_notes_backfill.json
npm run courses:curator-notes -- --input ../docs/planning/course_curator_notes_backfill.json --apply
```

The script is preview-only unless `--apply` is present. By default it targets published courses only and skips any course that already has a curator note. Add `--include-drafts` to include drafts, or `--overwrite` to replace existing notes.

### Admin-only protection

Both uploader APIs require:

- an authenticated user
- a matching `users.role = 'admin'`

### Draft vs published behavior

- **Published** courses are immediately available to the public course routes
- **Draft** courses remain stored but can be withheld from catalog visibility depending on downstream query filters

### Matching to texts

The parse API performs lightweight title matching against the `texts` table to suggest possible reading links. The import API currently focuses on creating the course record itself.

---

## Troubleshooting

### `/admin/import-course` loads but import fails

Check:

- the user is logged in
- the user has admin role in `users`
- the markdown includes the expected required sections

### Import succeeds but View Course fails

Check:

- `/api/courses/[id]` exists and returns the imported course
- the course slug was created as expected
- the public course route can read the stored `content` payload

### Parser preview fails immediately

Most often this means the document header or week headings do not match the expected format exactly.

Key examples:

- `# Course CXX – Title`
- `## WEEK 1 – Title`

### Course imports with missing content

This usually means the markdown headings were present but the parser could not match the expected subsection labels or table/list formatting.

---

## Recommended Workflow

For reliable imports:

1. Draft the course from the canonical markdown template.
2. Paste it into the uploader first instead of importing blind.
3. Review slug, weeks, readings, and warnings in preview.
4. Import as draft unless the course is already QA checked.
5. Open **Edit in Admin** for final polish.

---

## Related Docs

- [Workflows](/admin/wiki/workflow)
- [Courses](/wiki/courses)
- [Technical Home](/admin/wiki/home)
