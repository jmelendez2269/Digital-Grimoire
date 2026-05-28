---
title: Curator Notes (Technical)
type: architecture
status: stable
audience: developer
description: Draft → review → promote workflow for curator notes and long summaries that appear in the reader.
---

# Curator Notes — Technical Reference

**Last reviewed:** May 2026
**Status:** Live

## Purpose

Curator notes and long summaries are the editorial layer that wraps each text in the Library. They explain why the text is in the collection, what to watch for, and (for long summaries) provide a fuller orientation than the digest. The note appears in the reader and on text detail pages.

Notes flow through a **draft → review → promote** lifecycle so AI-drafted content never reaches users without an admin sign-off.

## Data model

Notes live on the text row itself (no separate table), with paired live + draft columns and a status field:

| Column | Role |
|---|---|
| `curator_note` | Currently published curator note |
| `curator_note_draft` | Pending draft |
| `long_summary` | Currently published long summary |
| `long_summary_draft` | Pending long-summary draft |
| `curator_note_status` | `draft`, `approved`, `rejected` |
| `related_texts` | Curator-selected related-text resonances surfaced alongside the note |

## Drafting workflow

* Drafts are generated through the **OpenRouter client** (`app/src/lib/ai/openrouter`) using prompt templates tuned for Prismarium's voice and the seven-lens framework. See `docs/CURATORS_NOTE_FRAMEWORK.md` for the editorial framework that shapes the prompts.
* OCR-derived text is the input; the OCR pipeline was refactored alongside the draft workflow so AI drafting receives clean source text.

## Review queue

* **Route:** `/admin/curator-notes`
* **Component:** `app/src/app/admin/curator-notes/page.tsx`
* **API:**
  * `GET /api/admin/curator-notes` — list drafts (admin only)
  * `GET / PATCH /api/admin/curator-notes/[id]` — read or edit a draft
  * `POST /api/admin/curator-notes/[id]/promote` — publish the draft into `curator_note` / `long_summary`
  * `POST /api/admin/curator-notes/[id]/reject` — reject the draft with a reason

Admins can edit both the note and the long summary inline before promoting. Promotion copies `*_draft` into the live columns and sets `curator_note_status = 'approved'`.

## Reader integration

* The Library reader surfaces the live `curator_note` and `long_summary` on the text detail page.
* `related_texts` resonances appear alongside the note as "Why this also matters."

## Access control

All draft / promote / reject endpoints are gated by the admin role check used elsewhere in `/api/admin/*`.

## Related

* [Reading Digests](/admin/wiki/reading-digests) — sibling editorial workflow for course readings.
* [Branding](/admin/wiki/branding) — voice, naming, and the seven-lens framework that shapes prompts.
* `docs/CURATORS_NOTE_FRAMEWORK.md` — editorial framework that anchors the prompts and review criteria.
