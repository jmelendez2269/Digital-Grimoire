# 🧠 CURSOR RULESET: DEVELOPMENT SYNC & CHANGELOG

**Version:** 1.0  
**Last Updated:** 2025-10-24  
**Author:** Jack Melendez / Digital Grimoire Project  

This ruleset keeps your development documentation synchronized automatically as you code.  

It consists of two coordinated rules:
- **Rule 1:** Keeps `FEATURE_BACKLOG.md` and `PROJECT_ROADMAP.md` up to date.  
- **Rule 2:** Maintains a `CHANGELOG.daily.md` of what was implemented each day.

---

## ⚙️ RULE 1 — Sync Code Progress with Backlog & Roadmap

**Title:** Auto-update Development Docs (Backlog + Roadmap)  
**Scope:** Project (global)

---

### 🧩 Purpose

Ensure that as code is written or completed, the two master tracking documents —  
[`FEATURE_BACKLOG.md`](../FEATURE_BACKLOG.md) and [`PROJECT_ROADMAP.md`](../PROJECT_ROADMAP.md) — stay accurate and aligned with implementation status.

---

### 🧭 Behavior

#### 1. Identify Target Feature or Task

- When coding or committing changes, locate the matching **feature** in `FEATURE_BACKLOG.md` or **task** in `PROJECT_ROADMAP.md`.
- Match using:
  - Exact or fuzzy feature name (e.g., "Document upload (admin)")
  - Sprint section (e.g., "Sprint 3: Document Ingestion")
  - File paths or keywords in commit message

---

#### 2. Update `FEATURE_BACKLOG.md`

- Change **Status** column as development progresses:
  - `⬜ Planned` → `🟩 In Progress` when feature work begins  
  - `🟩 In Progress` → `✅ Done` once merged or stable

- Update **Notes** column:
  - Add implementation notes, modules, or key details
  - Keep lines short: _"Implemented S3 upload in `/src/pages/admin/upload.tsx`"_

- Preserve table formatting (`|` columns) and section headers.

**Example:**

```md
| Feature | Priority | Effort | Sprint | Status | Notes |
|----------|----------|--------|--------|--------|-------|
| Document upload (admin) | P0 | M | 3 | ✅ Done | Implemented upload UI + API integration |
```

---

#### 3. Update `PROJECT_ROADMAP.md`

- Locate the sprint and tick off the relevant checklist item:
  - `- [ ]` → `- [x]` when done
  - If partial, add "(in progress)" beside it.

- Under each **Deliverables** section, append:
  ```md
  - ✅ <feature> implemented — <short summary>
  ```

- Update sprint completion indicators where applicable.

---

#### 4. Maintain Metadata

- Update top line:
  ```md
  **Last Updated:** YYYY-MM-DD
  ```

- Maintain emoji consistency and alignment.
- Never remove existing content — only update statuses, add links, or append new lines.

---

#### 5. Cross-Linking Logic

- When a backlog item becomes `✅ Done`, ensure its corresponding roadmap task is also `[x]`.
- When a roadmap task is marked `[x]`, ensure its backlog feature row updates to `✅ Done`.

---

#### 6. Error Handling

- If feature not found → append under relevant section (CORE FEATURES, PERSONAL GRIMOIRE, etc.).
- If new work emerges → create a "Discovered Features" section at bottom.
- Never delete or overwrite past notes.

---

### ✅ Example Result

```md
**Last Updated:** 2025-10-24

| Feature | Priority | Effort | Sprint | Status | Notes |
|----------|----------|--------|--------|--------|-------|
| Document upload (admin) | P0 | M | 3 | ✅ Done | Added `/admin/upload` page + S3 integration |
| Metadata extraction (AI) | P0 | M | 3 | 🟩 In Progress | Claude Vision connected for title/author |
```