---
title: Study Journal System
type: architecture
status: stable
audience: developer
description: Technical documentation for the Tiptap-based study journal and WikiLink system.
---

# Study Journal Feature Documentation

**Status:** ✅ Complete  
**Sprint:** Sprint 5  
**Date:** October 28, 2025

---

## Overview

The Study Journal is a personal note-taking workspace that allows users to create, edit, and organize rich-text notes. Built with Tiptap editor, it provides a modern writing experience with auto-save, emoji icons, and hierarchical organization capabilities.

---

## Key Features

### 📝 Rich Text Editor

- **Tiptap-powered** editing with full formatting support
- Toolbar with common formatting options:
  - **Text styling:** Bold, Italic
  - **Headings:** H1, H2, H3
  - **Lists:** Bulleted and numbered
  - **Code blocks** and **blockquotes**
  - **Undo/Redo**
- **Auto-save** with 2-second debounce
- **Live word and character count**
- **Visual save status** indicator (Saving... → Saved)

### 📚 Page Management

- Create unlimited journal pages
- **Editable titles** with inline editing
- **Emoji icons** with picker for personalization
- **Archive/unarchive** pages
- **Hard delete** with confirmation
- **Search** across page titles
- Sort by most recently updated

### 🗂️ Organization

- **Hierarchical structure** support (via `parent_id`)
- Archive functionality for cleanup without deletion
- Quick access from header navigation

---

## Database Schema

### `journal_pages` Table

```sql
CREATE TABLE journal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',
  parent_id UUID REFERENCES journal_pages(id) ON DELETE SET NULL,
  icon TEXT DEFAULT '📝',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**

- `content`: Tiptap document stored as JSONB
- `parent_id`: For future nested page support
- `icon`: Emoji for visual identification
- `is_archived`: Soft delete functionality

**Indexes:**

- `idx_journal_pages_user_id` - Fast user filtering
- `idx_journal_pages_parent_id` - Hierarchical queries
- `idx_journal_pages_updated_at` - Sort by recency
- `idx_journal_pages_created_at` - Creation date sorting

**RLS Policies:**

- Users can only view/edit/delete their own pages
- Full CRUD operations supported with auth checks

---

## API Endpoints

### `GET /api/journal`

List user's journal pages with optional filtering.

**Query Parameters:**

- `parent_id` (optional) - Filter by parent page
- `include_archived` (optional) - Include archived pages

**Response:**

```json
{
  "pages": [
    {
      "id": "uuid",
      "title": "My First Note",
      "content": { "type": "doc", "content": [...] },
      "icon": "📝",
      "is_archived": false,
      "created_at": "2025-10-28T...",
      "updated_at": "2025-10-28T..."
    }
  ]
}
```

### `POST /api/journal`

Create a new journal page.

**Request Body:**

```json
{
  "title": "My Note",
  "content": { "type": "doc", "content": [] },
  "icon": "📝",
  "parent_id": "uuid" // optional
}
```

### `GET /api/journal/[id]`

Fetch a single journal page by ID.

### `PUT /api/journal/[id]`

Update page title, content, icon, or archive status.

**Request Body:**

```json
{
  "title": "Updated Title", // optional
  "content": { ... },        // optional
  "icon": "📖",             // optional
  "is_archived": false      // optional
}
```

### `DELETE /api/journal/[id]`

Delete a journal page.

**Query Parameters:**

- `archive=true` - Soft delete (archive) instead of hard delete

---

## UI Components

### `/journal` - Journal Home Page

- Grid layout of all pages
- Search bar for title filtering
- "New Page" button
- Page cards showing:
  - Icon and title
  - Content preview (first 120 chars)
  - Last updated date
  - Archive/delete buttons on hover

### `/journal/[id]` - Page Editor

- Full-screen editor experience
- Inline title editing
- Emoji icon picker
- Rich text toolbar
- Archive and delete buttons in header
- Metadata display (created, updated dates)
- Back button to journal home

### `JournalEditor` Component

**Props:**

- `content`: Tiptap JSON as string
- `onUpdate`: Callback with new content
- `placeholder`: Placeholder text (optional)
- `autoSave`: Enable auto-save (default: true)

**Features:**

- Dark theme matching app aesthetic
- Responsive toolbar
- Auto-save with debouncing
- Word/character count
- Loading states

---

## Usage Examples

### Creating Your First Page

1. Click "Journal" in the header navigation
2. Click "New Page" button
3. Click the emoji to change the page icon
4. Edit the title
5. Start writing!
6. Content auto-saves every 2 seconds

### Organizing Pages

- **Archive old pages:** Hover over page card → Archive icon
- **Delete permanently:** Page editor → Delete button
- **Search pages:** Use search bar on journal home

---

## Technical Details

### Tiptap Extensions Used

- `StarterKit` - Core functionality (headings, lists, etc.)
- `Placeholder` - Helpful placeholder text
- `Typography` - Smart quotes and special characters

### Auto-Save Mechanism

1. Editor detects content changes
2. Sets status to "unsaved"
3. Debounces for 2000ms
4. Shows "Saving..." indicator
5. Calls `onUpdate` callback
6. Shows "Saved" indicator after 500ms

### Content Storage

Content is stored as **Tiptap JSON format** in JSONB column:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello world!" }
      ]
    }
  ]
}
```

This format is:

- Structured and queryable
- Extensible for future features
- Compatible with Tiptap's collaborative editing
- Can be exported to HTML, Markdown, etc.

---

## WikiLink System ✅ **COMPLETE** (Sprint 6)

### Overview

Connect journal pages using double-bracket syntax: `[[Page Name]]`

Click any wiki link to:

- Navigate to existing pages
- Create new pages on-the-fly
- Preview page content
- Get AI assistance

### Features

**Interactive Activation:**

- Click any `[[Wiki Link]]` to open action card
- Three actions: Navigate, Preview, AI Assist
- Keyboard shortcut: `Ctrl/Cmd+Enter`

**Smart Navigation:**

- Opens existing pages instantly
- Prompts to create missing pages
- Loading states during navigation

**Preview Modal:**

- Page icon, title, and timestamp
- Content excerpt
- Backlinks with context
- Cached for performance

**AI Actions:**

- 📝 Summarize Page
- 🔗 Suggest Connections
- ✨ Draft Content
- Placeholder implementations (real AI coming soon)

**Telemetry:**

- Tracks last 50 activations
- Persists in localStorage
- Optional Google Analytics events

### Documentation

See [WikiLink Features Guide](./WIKILINK_FEATURES.md) for complete usage instructions.

---

## Future Enhancements

### Planned Features

- [ ] **Real AI integration** - OpenAI/Claude for wiki-link actions
- [ ] **Graph visualization** - Visual wiki-link network
- [ ] **Auto-complete** - Suggest pages while typing `[[`
- [ ] **Slash commands** - Quick formatting with /
- [ ] **Templates** - Pre-formatted page templates
- [ ] **Nested pages** - Full hierarchical organization
- [ ] **Tags** - Tag pages for cross-referencing
- [ ] **Full-text search** - Search page content (not just titles)
- [ ] **Collaborative editing** - Share pages with others
- [ ] **Version history** - Track changes over time

### Potential Integrations

- Link journal pages to library documents
- Embed annotations in journal pages
- Cross-reference with grimoire entries
- Wiki-link to correspondence graph entities

---

## Dependencies

```json
{
  "@tiptap/react": "^3.9.0",
  "@tiptap/pm": "^3.9.0",
  "@tiptap/starter-kit": "^3.9.0",
  "@tiptap/extension-placeholder": "^3.9.0",
  "@tiptap/extension-typography": "^3.9.0",
  "emoji-picker-react": "^4.15.0"
}
```

---

## Migration

**File:** `migrations/015_add_journal_pages.sql`

To apply the migration:

1. Run the migration SQL in your Supabase SQL editor
2. Verify the table and indexes were created
3. Test RLS policies with a test user

---

## Troubleshooting

### Auto-save not working?

- Check browser console for errors
- Verify user is authenticated
- Check network tab for API call failures

### Emoji picker not showing?

- Ensure `emoji-picker-react` is installed
- Check z-index conflicts with other UI elements

### Pages not loading?

- Verify RLS policies are active
- Check user authentication status
- Ensure `user_id` matches authenticated user

---

## Support & Resources

- **Tiptap Docs:** <https://tiptap.dev/>
- **Database Migration:** `/migrations/015_add_journal_pages.sql`
- **API Routes:** `/app/src/app/api/journal/`
- **UI Components:** `/app/src/components/JournalEditor.tsx`

---

**Last Updated:** October 28, 2025  
**Maintained By:** Project Parallax Development Team
