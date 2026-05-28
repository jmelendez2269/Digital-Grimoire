---
title: Corpus Collections (Technical)
type: architecture
status: stable
audience: developer
description: Nested corpus shells (e.g. King James Bible, Bible Apocrypha) and how their sub-books surface in the library grid.
---

# Corpus Collections — Technical Reference

**Last reviewed:** May 2026
**Status:** Live

## What is a corpus collection?

A **corpus collection** is a single library entry that acts as a shell over a set of related sub-books — for example, the **King James Bible** shell groups its child books into Old Testament and New Testament, and the **Bible Apocrypha** shell groups its constituent books in the same way. The shell appears as one card in the library grid; the user expands it to see the nested works.

Corpus collections solve two problems:

1. A library grid that lists every book of the Bible (or every Apocryphal text) as a top-level card crowds out everything else.
2. Users expect canonical groupings (OT / NT, deuterocanon) to be visible, not flattened.

## Data shape

Corpus shells use the existing `texts` table plus structured metadata:

| Field | Value |
|---|---|
| `text.metadata.isCorpusCollection` | `true` for the shell row |
| `text.metadata.corpus.groups` | Array of `{ name, works: [...] }` groups (e.g. OT, NT) |
| `text.metadata.corpus.groups[].works` | Child entries with title, author, year, linked `text_id` when available |
| Child `texts` rows | Linked via `text_id` so the viewer can open the child book directly |

The detection rule is `Boolean(metadata.isCorpusCollection && metadata.corpus)`.

## Library grid integration

`app/src/components/LibraryGrid.tsx`:

* Detects corpus shells and renders a single card with a `{count} works` badge.
* Expanding the card reveals the grouped sub-books inline, nested under the parent shell.
* Sub-books that have their own `text_id` link straight into the reader; the rest render as references inside the shell.

## Import paths

* **Sacred-Texts parser:** `app/src/lib/parsers/sacred-texts-parser.ts` recognises book-index pages, splits sub-books, and skips AI metadata enhancement for the corpus children (the shell carries the metadata).
* **API import:** `POST /api/import-sacred-text` accepts a corpus shell payload; a follow-up batch import button on the corpus viewer pulls each linked sub-book.
* **File uploads:** `.txt` book uploads are supported alongside PDFs, so a plain-text corpus child can be ingested without OCR.

## Reader behaviour

* Opening a corpus shell shows the grouped table of contents.
* Sub-book chapter lists are restricted to chapter-pattern files (e.g. `chN.htm`) so navigation pages don't pollute the chapter index.
* The Puppeteer fallback restores access when Sacred Texts returns a 403 to the default fetch path.

## Current shells

* **King James Bible** — OT / NT groups; nested under one parent shell.
* **Bible Apocrypha** — deuterocanonical / apocryphal works grouped under one shell.

Additional shells can be added without schema changes by importing a new corpus payload with the same metadata shape.

## Related

* [Library Features](/admin/wiki/library-features) — the grid, filters, and reader the shells live in.
* `app/scripts/` and `app/src/lib/parsers/sacred-texts-parser.ts` — import pipeline.
