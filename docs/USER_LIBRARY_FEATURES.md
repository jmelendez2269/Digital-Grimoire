# User Library Features Documentation

## Overview
This document describes the newly implemented user-specific library features including bookmarks, reading progress tracking, annotations/highlights, and custom document collections.

## Features Implemented

### 1. Bookmark/Favorite Documents
**Location:** Available on all document cards and detail pages

**Components:**
- `BookmarkButton.tsx` - Reusable bookmark button component
- API routes: `/api/bookmarks`

**Features:**
- One-click bookmarking from library grid or document detail pages
- Visual indicator (filled bookmark icon) for bookmarked documents
- Optional label display (e.g., "Bookmarked")
- Automatic authentication check
- Persistent across sessions

**Database:**
- Uses existing `user_bookmarks` table
- Stores: user_id, text_id, notes, created_at

**Usage:**
1. Click bookmark icon on any document card or detail page
2. View all bookmarks in "My Library" → "Bookmarks" tab
3. Remove bookmarks by clicking the bookmark icon again or from My Library

---

### 2. Reading Progress Tracking
**Location:** Document detail page sidebar

**Components:**
- `ReadingProgress.tsx` - Progress display component
- `useReadingProgressTracker` - React hook for tracking progress
- API routes: `/api/reading-progress`

**Features:**
- Automatic progress tracking while reading
- Visual progress bar (0-100%)
- Current page / total pages display
- Time spent reading (seconds, minutes, hours)
- Mark as completed button (appears at 80%+ progress)
- Completion status with timestamp

**Database:**
- New table: `reading_progress`
- Stores: user_id, text_id, current_page, total_pages, progress_percent, time_spent_seconds, completed, completed_at, last_position

**Usage:**
1. Open any document to start tracking
2. Progress automatically updates as you read
3. View progress in sidebar on document detail page
4. See all reading progress in "My Library" → "Reading Progress" tab
5. Mark documents as completed when finished

**Tracking Logic:**
- Time tracking: Starts when document is opened, saved on page change or close
- Progress calculation: (current_page / total_pages) × 100
- Automatic save on navigation

---

### 3. Personal Annotations and Highlights
**Location:** Document detail page → "Notes" tab

**Components:**
- `AnnotationPanel.tsx` - Annotation management interface
- API routes: `/api/annotations`

**Features:**
- Add highlighted text with personal notes
- Edit existing annotations
- Delete annotations
- Visual distinction between quote and note
- Chronological display (newest first)
- Position tracking (page, paragraph, offsets)

**Database:**
- Uses existing `user_annotations` table
- Stores: user_id, text_id, quote, note, position (JSONB), created_at

**Usage:**
1. Open document and go to "Notes" tab
2. Click "+ Add Note"
3. Paste highlighted text
4. Add your commentary (optional)
5. Save annotation
6. Edit or delete from the list
7. View all annotations in one place

**Annotation Structure:**
```json
{
  "quote": "The highlighted text from the document",
  "note": "Your personal commentary or thoughts",
  "position": {
    "page": 42,
    "paragraph": 5,
    "startOffset": 120,
    "endOffset": 250
  }
}
```

---

### 4. Custom Document Collections
**Location:** Document detail page sidebar and "My Library"

**Components:**
- `CollectionsPanel.tsx` - Collection management interface
- API routes: `/api/collections`, `/api/collections/items`

**Features:**
- Create custom collections with names, descriptions, and icons
- Add/remove documents from collections
- Visual indicators showing which collections contain current document
- Collection item counts
- Support for collection colors and custom icons
- Public/private collection setting

**Database:**
- New tables: `user_collections`, `collection_items`
- Collections store: user_id, name, description, icon, color, is_public
- Items store: collection_id, text_id, added_at, notes

**Usage:**
1. Open any document detail page
2. In sidebar, click "+ New Collection"
3. Name your collection and choose an icon
4. Add/remove documents by toggling
5. View all collections in "My Library" → "Collections" tab
6. Manage collections and their items

**Collection Icons:**
📚 ⭐ ❤️ 🔖 📖 ✨ 🌟 💎 🎯 🔥

**Example Collections:**
- "Must Read" - Priority reading list
- "Research" - Documents for a specific project
- "Favorites" - Personal favorite texts
- "Astrology Resources" - Domain-specific collection

---

## My Library Dashboard
**Location:** `/library/my-library`

**Features:**
- Unified view of all personal library data
- Three main tabs: Bookmarks, Collections, Reading Progress
- Quick access to all saved documents
- Delete/manage functionality
- Empty states with helpful prompts
- Direct links to all documents

**Bookmarks Tab:**
- Grid view of all bookmarked documents
- Shows title, author, bookmark date
- Quick access to remove bookmarks
- Direct links to documents

**Collections Tab:**
- List view of all user collections
- Shows collection metadata and item count
- Preview of first 5 documents in each collection
- Delete collection functionality
- Direct links to collection documents

**Reading Progress Tab:**
- Grid view of all documents with tracked progress
- Visual progress bars
- Completion status indicators
- Time spent reading
- Last read timestamp
- Direct links to continue reading

---

## API Routes

### Bookmarks
- `GET /api/bookmarks` - Get all user bookmarks
- `POST /api/bookmarks` - Add a bookmark
- `DELETE /api/bookmarks?text_id=xxx` - Remove a bookmark

### Reading Progress
- `GET /api/reading-progress?text_id=xxx` - Get progress for specific text or all
- `POST /api/reading-progress` - Create or update progress
- `DELETE /api/reading-progress?text_id=xxx` - Delete progress

### Annotations
- `GET /api/annotations?text_id=xxx` - Get annotations for specific text or all
- `POST /api/annotations` - Create an annotation
- `PUT /api/annotations?id=xxx` - Update an annotation
- `DELETE /api/annotations?id=xxx` - Delete an annotation

### Collections
- `GET /api/collections?include_items=true` - Get all user collections
- `POST /api/collections` - Create a new collection
- `PUT /api/collections?id=xxx` - Update a collection
- `DELETE /api/collections?id=xxx` - Delete a collection

### Collection Items
- `POST /api/collections/items` - Add document to collection
- `DELETE /api/collections/items?collection_id=xxx&text_id=xxx` - Remove document

---

## Database Schema

### reading_progress
```sql
CREATE TABLE reading_progress (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    text_id UUID REFERENCES texts(id),
    current_page INT DEFAULT 1,
    total_pages INT,
    progress_percent FLOAT,
    last_position JSONB,
    time_spent_seconds INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(user_id, text_id)
);
```

### user_collections
```sql
CREATE TABLE user_collections (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#f59e0b',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### collection_items
```sql
CREATE TABLE collection_items (
    id UUID PRIMARY KEY,
    collection_id UUID REFERENCES user_collections(id),
    text_id UUID REFERENCES texts(id),
    added_at TIMESTAMP,
    notes TEXT,
    UNIQUE(collection_id, text_id)
);
```

---

## Security (Row Level Security)

All tables have RLS policies ensuring:
- Users can only access their own data
- Proper authentication required for all operations
- Public collections can be viewed by others (if enabled)
- Cascade deletes for referential integrity

**Example Policy:**
```sql
CREATE POLICY "Users can view own bookmarks" 
ON user_bookmarks FOR SELECT 
USING (auth.uid() = user_id);
```

---

## User Experience Enhancements

### Visual Feedback
- Filled bookmark icon for bookmarked documents
- Progress bars with gradient colors
- Completion checkmarks
- Collection membership indicators
- Loading states and animations

### Empty States
- Helpful prompts when no data exists
- Call-to-action buttons to get started
- Icons and descriptive text
- Direct links to library

### Responsive Design
- Mobile-friendly interfaces
- Grid layouts adapt to screen size
- Touch-friendly buttons and controls
- Accessible on all devices

---

## Integration Points

### Document Detail Page
- Bookmark button in header
- Reading progress in sidebar
- Collections panel in sidebar
- Annotations in "Notes" tab
- All features work together seamlessly

### Library Grid
- Bookmark buttons on each card
- Quick access without opening document
- Visual indicators for user interaction

### Header Navigation
- "My Library" link in user dropdown
- Easy access from anywhere in app

---

## Future Enhancements

### Potential Features
- Export annotations to PDF/Markdown
- Share collections with other users
- Reading goals and statistics
- Annotation search across all documents
- Collection recommendations
- Reading streaks and achievements
- Collaborative annotations
- Annotation threading/discussions

### Performance Improvements
- Lazy loading for large collections
- Pagination for annotations
- Caching for reading progress
- Optimistic UI updates
- Background sync for progress tracking

---

## Testing Checklist

- [x] Bookmark documents from library grid
- [x] Bookmark documents from detail page
- [x] Remove bookmarks
- [x] View all bookmarks in My Library
- [x] Track reading progress automatically
- [x] Update progress manually
- [x] Mark documents as completed
- [x] View progress history
- [x] Create annotations with quotes and notes
- [x] Edit existing annotations
- [x] Delete annotations
- [x] Create custom collections
- [x] Add documents to collections
- [x] Remove documents from collections
- [x] Delete collections
- [x] View collections in My Library
- [x] Access My Library from header
- [x] All features work for authenticated users
- [x] Proper authentication handling
- [x] RLS policies working correctly

---

## Migration Instructions

### Database Setup
1. Run migration: `008_add_library_features.sql`
2. Verify tables created: `reading_progress`, `user_collections`, `collection_items`
3. Verify RLS policies are active
4. Test with sample data

### Deployment
1. Ensure all API routes are deployed
2. Verify component imports are correct
3. Test authentication flow
4. Check mobile responsiveness
5. Monitor for errors

---

## Support & Troubleshooting

### Common Issues

**Bookmarks not saving:**
- Check user authentication
- Verify API route is accessible
- Check RLS policies
- Ensure text_id is valid

**Progress not tracking:**
- Verify automatic updates are working
- Check time tracking logic
- Ensure total_pages is set correctly
- Test with different documents

**Collections not showing:**
- Verify user has created collections
- Check RLS policies
- Ensure include_items parameter is set
- Test with sample collections

---

## Credits
Built using:
- Next.js 16.0.0
- React 19
- Supabase (Auth + Database + RLS)
- Tailwind CSS
- Lucide React Icons

Created as part of the Digital Grimoire project to enhance user engagement and provide powerful personal library management features.

