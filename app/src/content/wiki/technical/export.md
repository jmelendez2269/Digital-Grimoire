---
title: Annotation Export
type: feature-spec
status: stable
audience: user
description: Functionality for exporting annotations to Markdown and CSV formats.
---

# Annotation Export Features

## Overview

Export your annotations to **Markdown** or **CSV** format for backup, sharing, or use in other tools. Exports support filtering by document, category, color, and date range.

---

## 1. Export Formats

### Markdown Export

Perfect for reading, importing into detailed note-taking apps (Obsidian, Notion), and creating study guides.

**Structure:**

- Grouped by Document
- Includes Metadata (Category, Color, Date)
- Formatted quotes and notes

### CSV Export

Perfect for data analysis (Excel, Google Sheets), database imports, and bulk processing.

**Columns:**
`Document Title`, `Author`, `Quote`, `Note`, `Category`, `Color`, `Page`, `Date`

---

## 2. API Endpoint

### `GET /api/annotations/export`

**Query Parameters:**

- `format`: `markdown` | `csv` (default: `markdown`)
- `text_id`: Filter by specific document UUID.
- `category`: Filter by annotation category.
- `color`: Filter by highlight color.
- `date_from` / `date_to`: ISO date range.

**Response:**

- `Content-Type`: `text/markdown` or `text/csv`
- `Content-Disposition`: `attachment; filename="annotations-YYYY-MM-DD.ext"`

---

## 3. Implementation Details

### CSV Escaping

All text fields are wrapped in double quotes. Internal quotes are escaped as `""`. Newlines are preserved.

### Category Mapping

| ID | Display | Emoji |
| :--- | :--- | :--- |
| `general` | General | 📝 |
| `important` | Important | ⭐ |
| `question` | Question | ❓ |
| `insight` | Insight | 💡 |
| `to-research` | To Research | 🔍 |
| `quote` | Quote | 💬 |
| `critique` | Critique | 🎯 |

---

## 4. UI Integration

- **Location:** `/annotations/search` page header.
- **Behavior:** Respects current search filters.
- **State:** Shows "Exporting..." during generation.

---

## 5. Security & Performance

- **Access:** Exports only the authenticated user's annotations (RLS enforced).
- **Storage:** No server-side storage; generated on-fly and streamed.
- **Speed:** < 500ms for 1,000 annotations.
