# 📜 RULE 2 — Daily Implementation & Completion Changelog

**Title:** Automatic Daily Development Log  
**Scope:** Project (global)

---

## 🧩 Purpose

Record every completed feature or sprint item daily in `docs/CHANGELOG.daily.md`, providing a historical view of what was built and when.

---

## 🧭 Behavior

### 1. Detect Completion Events

Triggered automatically whenever a feature's status changes to `✅ Done` in:
- `FEATURE_BACKLOG.md`
- `PROJECT_ROADMAP.md`

---

### 2. Create or Update Today's Section

- Find or create section header for today's date:
  ```md
  ## YYYY-MM-DD
  ```

- Keep most recent day at the top of file.
- Each section contains:
  - `### Summary`
  - `### Implemented`
  - `### Linked Features`
  - `### Notes`

---

### 3. Append Completed Items

Under `### Implemented`, add entries like:

```md
- ✅ **Document upload (admin)** — Implemented S3 upload UI and Textract Lambda.
  _Sprint 3 • FEATURE_BACKLOG.md → "Document upload (admin)"_
```

Group multiple items under the same sprint together.

---

### 4. Link Back to Source

Under `### Linked Features`:

```md
- [P0 Feature](/FEATURE_BACKLOG.md#public-library) — Document upload (admin)
- [Sprint 3](/PROJECT_ROADMAP.md#sprint-3-document-ingestion)
```

---

### 5. Add Developer Notes

Under `### Notes`, include any architecture or design decisions:

```md
- Adjusted CORS policy for PDF preview.
- Reused Textract Lambda callback for metadata updates.
```

---

### 6. Maintain Metadata

At top of file:

```md
**Last Updated:** YYYY-MM-DD
```

- Keep sections wrapped in HTML anchors for safe incremental editing:
  ```html
  <!-- DAY:START YYYY-MM-DD -->
  ...
  <!-- DAY:END YYYY-MM-DD -->
  ```

---

## ✅ Example Output

```md
# Daily Implementation Log

**Last Updated:** 2025-10-24

## 2025-10-24
<!-- DAY:START 2025-10-24 -->
### Summary
- Completed initial upload pipeline and metadata integration.

### Implemented
- ✅ **Document upload (admin)** — Added upload page and S3 pipeline.
- ✅ **Metadata extraction (AI)** — Connected Claude Vision for automated tagging.

### Linked Features
- [Public Library](/FEATURE_BACKLOG.md#core-features)
- [Sprint 3](/PROJECT_ROADMAP.md#sprint-3-document-ingestion)

### Notes
- Textract Lambda linked to SNS trigger.
- Supabase schema updated for `texts.metadata`.
<!-- DAY:END 2025-10-24 -->
```

---

## 🧩 File Rotation (Optional)

If `CHANGELOG.daily.md` exceeds ~1MB:
- Compress old entries into `CHANGELOG.archive.md`
- Leave last 7 days expanded.