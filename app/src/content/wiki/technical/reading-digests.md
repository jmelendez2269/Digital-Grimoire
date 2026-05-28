---
title: Reading Digests (Technical)
type: architecture
status: stable
audience: developer
description: How Reading Digests are drafted, stored, reviewed, and surfaced.
---

# Reading Digests — Technical Reference

**Last reviewed:** May 2026
**Status:** Live

## Purpose

Reading Digests are per-reading long-form summaries (~600–1,300 words) that surface on the course learn pages. They are drafted with AI assistance against the source text and reviewed before promotion to the public learn surface.

## Data model

* **Table:** `reading_blurbs`
* **Key fields (canonical):**
  * `reading_id` — foreign key into the course reading model
  * `status` — `draft`, `approved`, `rejected`
  * `body` — markdown digest
  * `model`, `prompt_version`, `generated_at` — provenance for the drafted body
  * timestamps for create / update / promote / reject

A reading can have multiple draft attempts in `reading_blurbs`; the most recent `approved` row wins on the learn surface.

## Drafting workflow

1. **`app/scripts/draft-reading-blurbs.ts`** — batch script that walks readings without an approved digest and drafts one through the OpenRouter client (`app/src/lib/ai/openrouter`).
2. **`app/scripts/backfill-reading-ids.ts`** — backfills missing `reading_id` references for legacy course readings before the drafter runs.
3. **`app/src/lib/courses/attach-reading-digests.ts`** — server helper that joins approved digests onto the course payload.

## Review queue

* **Route:** `/admin/reading-blurbs`
* **API:**
  * `GET /api/admin/reading-blurbs` — list pending and recent digests
  * `GET / PATCH /api/admin/reading-blurbs/[id]` — read / edit a draft
  * `POST /api/admin/reading-blurbs/[id]/promote` — mark the draft as approved (publishes to learn surface)
  * `POST /api/admin/reading-blurbs/[id]/reject` — reject with reason

Admins can edit the digest body before promoting. Promotion atomically marks the row `approved` and supersedes prior approved digests for the same reading.

## User surfaces

* **Course learn page:** `app/src/app/courses/[slug]/learn/page.tsx`
* **Course detail (reading card link):** `app/src/app/courses/[slug]/page.tsx`
* **Course payload (digest attachment):** `app/src/app/api/courses/[id]/route.ts`

## Access control

* The draft / review API is gated by admin role checks.
* Public learn surfaces only render rows where `status = 'approved'`.

## Related

* [Curator Notes](/admin/wiki/curator-notes) — sibling editorial workflow for in-reader annotations.
* [Seven Lenses](/admin/wiki/lenses) — lens-weighted synthesis that can cite readings that have approved digests.
