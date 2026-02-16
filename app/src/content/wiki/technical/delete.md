---
title: Delete Functionality
type: feature-spec
status: stable
audience: developer
description: Technical implementation of admin and user delete operations with cascade rules.
---

# Delete Functionality Implementation

## Overview

Comprehensive delete functionality for both admin users (content management) and regular users (personal data management).

---

## 1. Features

### Admin Delete (Library)

- **Scope:** Permanently delete text documents.
- **Actions:**
  - Removes text record from Supabase.
  - Deletes PDF and Cover Image from Cloudflare R2.
  - Cascades deletion to all linked data (bookmarks, annotations, etc.).
- **Access:** Admin role required.
- **UI:** Red trash icon on book cards (Edit mode).

### User Delete (My Library)

- **Scope:** Personal tracking data.
- **Actions:**
  - Delete **Reading Progress** (resets tracking).
  - Delete **Bookmarks**.
  - Delete **Collections**.
- **Access:** Authenticated user (own data only).

---

## 2. Technical Implementation

### API Endpoints

#### `DELETE /api/texts/[id]`

- **Auth:** Admin only.
- **Process:**
    1. Verify Admin role.
    2. Fetch metadata (to get R2 keys).
    3. Delete files from R2.
    4. Delete record from DB (triggers cascade).

#### `DELETE /api/reading-progress`

- **Auth:** User only.
- **Params:** `id` (progress ID) OR `text_id`.
- **Process:** Deletes `reading_progress` row.

### Database Cascade Strategy

Foreign key constraints ensure data integrity:

```sql
-- Example Cascades
ALTER TABLE bookmarked_texts 
  ADD CONSTRAINT fk_text FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE;

ALTER TABLE annotations 
  ADD CONSTRAINT fk_text FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE;
```

---

## 3. Troubleshooting

### "Deleted books still appear"

This is almost always **client-side caching**.

1. **Hard Refresh:** `Ctrl + Shift + R`.
2. **Clear Cache:** Browser settings.
3. **Verify DB:** `SELECT COUNT(*) FROM texts WHERE id = '...';`

---

## 4. Security

- **RLS Policies:** Enforce `user_id` matching for user deletes.
- **Role Checks:** Server-side verification for admin deletes.
