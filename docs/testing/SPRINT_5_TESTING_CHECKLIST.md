# Sprint 5 Feature Testing Checklist

**Version:** 1.0  
**Date:** October 31, 2025  
**Status:** Ready for Testing  
**Estimated Testing Time:** ~2.5 hours

---

## Overview

This document provides comprehensive testing procedures for all features implemented in Sprint 5 and related features that need verification.

### Features Covered
1. Text-to-Speech (TTS) System
2. Journal/Grimoire Export (Markdown, HTML, PDF)
3. WikiLinks System
4. Backlinks Panel
5. Clip to Grimoire
6. Slash Menu
7. Drag Handle
8. Book Cover System
9. Phase 3 Infrastructure (Correspondences & Convergence)

---

## Pre-Testing Setup

### Required Database Migrations

Run these migrations in Supabase SQL Editor if not already applied:

```sql
-- Migration 012: Reading positions (for TTS)
-- File: migrations/012_add_reading_positions.sql
-- Creates: reading_positions table, tts_preferences column

-- Migration 015: Journal pages
-- File: migrations/015_add_journal_pages.sql
-- Creates: journal_pages table

-- Migration 016: Annotation FTS
-- File: migrations/016_add_annotation_fts.sql
-- Adds: Full-text search to annotations

-- Migration 017: Cover source
-- File: migrations/017_add_cover_source.sql
-- Adds: cover_source column to texts

-- Migration 018: Correspondences
-- File: migrations/018_add_correspondences.sql
-- Creates: correspondences and correspondence_relationships tables

-- Migration 019: Convergence concepts
-- File: migrations/019_add_convergence_concepts.sql
-- Creates: convergence_concepts and convergence_relationships tables
```

### Verify Migrations

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('reading_positions', 'journal_pages', 'correspondences', 'convergence_concepts')
ORDER BY table_name;
```

Expected result: All 4 tables should be listed.

### Test Environment

- [ ] Local development server running (`pnpm dev`)
- [ ] Logged in as test user
- [ ] At least one document in library for testing
- [ ] At least one journal page for testing

---

## A. Text-to-Speech Feature Testing

**Priority:** P1  
**Estimated Time:** 30 minutes  
**Migration Required:** 012

### Pre-Test Verification

- [ ] Migration 012 applied successfully
- [ ] `reading_positions` table exists
- [ ] Users table has `tts_preferences` column

### Core Functionality Tests

#### 1. AudioPlayer Display
- [ ] Open any document in library (`/library/[id]`)
- [ ] AudioPlayer appears at bottom of page
- [ ] Player shows document title
- [ ] Play button is visible and enabled

#### 2. Basic Playback
- [ ] Click Play button
- [ ] Audio starts playing
- [ ] Play button changes to Pause
- [ ] Progress bar shows movement
- [ ] Text starts highlighting in Content tab (if OCR text available)

#### 3. Pause/Resume
- [ ] Click Pause while playing
- [ ] Audio stops
- [ ] Position is maintained
- [ ] Click Play again
- [ ] Audio resumes from same position

#### 4. Stop Functionality
- [ ] Click Stop button
- [ ] Audio stops completely
- [ ] Position resets to beginning
- [ ] Click Play
- [ ] Audio starts from beginning

#### 5. Speed Control
- [ ] Adjust speed slider to 0.5x
- [ ] Verify audio plays slower
- [ ] Adjust to 1.0x (normal)
- [ ] Adjust to 2.0x
- [ ] Verify audio plays faster
- [ ] Current speed displays correctly

#### 6. Volume Control
- [ ] Adjust volume slider to 50%
- [ ] Verify audio volume decreases
- [ ] Adjust to 0% (mute)
- [ ] Verify audio is muted
- [ ] Adjust to 100%
- [ ] Verify full volume

#### 7. Voice Selection
- [ ] Click voice dropdown
- [ ] List of available voices appears
- [ ] Select different voice
- [ ] Stop and restart playback
- [ ] Verify new voice is used

#### 8. Text Source Toggle
- [ ] Toggle between "OCR Text" and "PDF Text"
- [ ] Verify playback uses selected source
- [ ] If PDF text unavailable, shows appropriate message

### Text Highlighting Tests

#### 9. Real-time Highlighting
- [ ] Start playback
- [ ] Switch to Content tab
- [ ] Text highlights as audio plays
- [ ] Highlight color is visible (amber)
- [ ] Only current phrase/sentence is highlighted

#### 10. Auto-scroll
- [ ] Continue playback past visible area
- [ ] Page automatically scrolls to keep highlighted text visible
- [ ] Scrolling is smooth, not jarring

### Position Bookmarking Tests

#### 11. Save Position (LocalStorage)
- [ ] Start playback
- [ ] Let it play for 30+ seconds
- [ ] Pause playback
- [ ] Refresh the page
- [ ] Player should show saved position
- [ ] Click Play
- [ ] Should resume from saved position

#### 12. Save Position (Database)
- [ ] Play for 1+ minute
- [ ] Wait 5 seconds (auto-save interval)
- [ ] Close browser completely
- [ ] Reopen browser and navigate to same document
- [ ] Position should be restored from database

#### 13. Cross-tab Persistence
- [ ] Open document in Tab 1
- [ ] Start playback, let it play
- [ ] Open same document in Tab 2
- [ ] Position should sync (within a few seconds)

### Settings Modal Tests

#### 14. Open Settings
- [ ] Click Settings button (gear icon)
- [ ] Settings modal opens
- [ ] Modal shows Free and Premium sections
- [ ] Close button works

#### 15. Voice Management (Free)
- [ ] In settings, view Free voices section
- [ ] List of browser voices displayed
- [ ] Select voice from list
- [ ] Selection is saved
- [ ] Close settings
- [ ] Verify voice used in playback

#### 16. Premium Upgrade Banner
- [ ] View Premium section
- [ ] "Upgrade Now" banner is visible
- [ ] Lists Azure benefits (400+ voices, 140+ languages)
- [ ] Shows cost transparency

#### 17. Azure Credentials (Optional - if testing premium)
- [ ] Enter Azure API key
- [ ] Enter Azure region
- [ ] Click Save
- [ ] Premium voices become available
- [ ] Select premium voice
- [ ] Start playback
- [ ] Verify neural voice quality

### Edge Cases & Error Handling

#### 18. Missing OCR Text
- [ ] Open document without OCR text
- [ ] AudioPlayer shows appropriate message
- [ ] Can still try PDF text extraction
- [ ] Error handling is graceful

#### 19. PDF Text Extraction Failure
- [ ] Toggle to PDF Text source
- [ ] If extraction fails, shows error message
- [ ] Suggests using OCR text instead
- [ ] Doesn't crash the page

#### 20. Network Errors (Premium only)
- [ ] With Azure enabled, disconnect network
- [ ] Try to play
- [ ] Shows appropriate error message
- [ ] Can retry when network restored

#### 21. Invalid Position Data
- [ ] Manually corrupt position data in localStorage
- [ ] Reload page
- [ ] Player handles gracefully, starts from beginning

### Cross-Browser Testing

#### 22. Chrome/Edge
- [ ] All features work in Chrome
- [ ] Voice list populates correctly
- [ ] Audio playback is smooth

#### 23. Firefox
- [ ] All features work in Firefox
- [ ] Voice selection works
- [ ] Position saving works

#### 24. Safari
- [ ] All features work in Safari
- [ ] Voice options available
- [ ] Playback controls function

### Testing Summary

**Total Tests:** 24  
**Passed:** ___  
**Failed:** ___  
**Notes:**

---

## B. Journal/Grimoire Export Testing

**Priority:** P1  
**Estimated Time:** 20 minutes  
**Migration Required:** None (uses existing journal_pages table)

### Prerequisites
- [ ] At least one journal page with content
- [ ] Content includes various formatting (headings, lists, bold, italic)
- [ ] Content includes WikiLinks (if testing WikiLink preservation)

### Export to Markdown Tests

#### 1. Basic Markdown Export
- [ ] Open any journal page
- [ ] Click Export button/menu
- [ ] Select "Export to Markdown"
- [ ] File downloads automatically
- [ ] Filename format: `[page-title]-[date].md`

#### 2. Markdown Format Validation
- [ ] Open downloaded Markdown file
- [ ] Headings use correct syntax (`#`, `##`, `###`)
- [ ] Bold text uses `**text**`
- [ ] Italic text uses `*text*`
- [ ] Lists use `-` or `1.` syntax
- [ ] Blockquotes use `>` prefix
- [ ] Code blocks use triple backticks

#### 3. WikiLinks in Markdown
- [ ] WikiLinks preserved as `[[Page Name]]`
- [ ] Not converted to regular Markdown links
- [ ] Can be imported to Obsidian/Roam

#### 4. Special Characters
- [ ] Quotes, apostrophes render correctly
- [ ] Emojis preserved (if used)
- [ ] Unicode characters intact

### Export to HTML Tests

#### 5. Basic HTML Export
- [ ] Click Export > HTML
- [ ] File downloads
- [ ] Filename format: `[page-title]-[date].html`

#### 6. HTML Styling
- [ ] Open HTML file in browser
- [ ] Styling is applied (serif font, readable)
- [ ] Headings have hierarchy
- [ ] Lists are formatted
- [ ] Code blocks have background

#### 7. HTML Structure
- [ ] Right-click > View Source
- [ ] Valid HTML5 structure
- [ ] Proper DOCTYPE
- [ ] CSS embedded in `<style>` tag
- [ ] Content in `<body>`

#### 8. WikiLinks in HTML
- [ ] WikiLinks render as styled spans
- [ ] Format: `[[Page Name]]`
- [ ] Visually distinguished (color/style)

### Export to PDF Tests

#### 9. Basic PDF Export
- [ ] Click Export > PDF
- [ ] File downloads (may take a few seconds)
- [ ] Filename format: `[page-title]-[date].pdf`

#### 10. PDF Layout
- [ ] Open PDF in viewer
- [ ] Page margins appropriate
- [ ] Font is readable (serif)
- [ ] No text cutoff at page edges

#### 11. PDF Pagination
- [ ] Long documents split across pages
- [ ] Page numbers in footer
- [ ] Document title in header
- [ ] No awkward page breaks mid-sentence

#### 12. PDF Formatting
- [ ] Headings larger than body text
- [ ] Lists indented properly
- [ ] Blockquotes have left border
- [ ] Code blocks have background

#### 13. PDF Quality
- [ ] Text is crisp, not blurry
- [ ] Black text on white background
- [ ] Print-quality output

### API Endpoint Tests

#### 14. Authentication
- [ ] Log out
- [ ] Try to access export API directly
- [ ] Returns 401 Unauthorized

#### 15. Invalid Page ID
- [ ] Try to export non-existent page
- [ ] Returns 404 error
- [ ] Error message is helpful

#### 16. Empty Page Export
- [ ] Create page with no content
- [ ] Try to export
- [ ] Handles gracefully (empty document or message)

### Edge Cases

#### 17. Large Documents
- [ ] Create page with 5000+ words
- [ ] Export to all formats
- [ ] All formats handle large content
- [ ] PDF doesn't timeout

#### 18. Special Characters in Title
- [ ] Create page with title containing `/`, `\`, `:`
- [ ] Export all formats
- [ ] Filenames sanitized appropriately
- [ ] No file system errors

#### 19. Images in Content (if supported)
- [ ] Page with embedded images
- [ ] Export to HTML
- [ ] Images included (base64 or references)
- [ ] Export to PDF
- [ ] Images render in PDF

### Testing Summary

**Total Tests:** 19  
**Passed:** ___  
**Failed:** ___  
**Notes:**

---

## C. WikiLinks System Testing

**Priority:** P1  
**Estimated Time:** 15 minutes  
**Migration Required:** None

### Prerequisites
- [ ] At least 2 journal pages created
- [ ] Know the titles of pages to link between

### Typing & Auto-conversion Tests

#### 1. Basic WikiLink Creation
- [ ] Open journal editor
- [ ] Type `[[Test Page]]`
- [ ] Pressing space or Enter converts to WikiLink
- [ ] Text changes color (amber)
- [ ] Link is visually distinct from normal text

#### 2. Case Sensitivity
- [ ] Type `[[test page]]` (lowercase)
- [ ] WikiLink created
- [ ] Type `[[Test Page]]` (titlecase)
- [ ] Both link to same slug

#### 3. Special Characters
- [ ] Type `[[Page with Spaces & Symbols!]]`
- [ ] Link created
- [ ] Slug auto-generated (sanitized)

### Display & Styling Tests

#### 4. Visual Distinction
- [ ] WikiLinks have different color than regular text
- [ ] Hover shows cursor changes to pointer
- [ ] Tooltip or underline on hover

#### 5. Editor View
- [ ] WikiLink displays as `[[Page Name]]` in editor
- [ ] Not rendered as clickable link while editing
- [ ] Selection/editing works normally

### Navigation Tests

#### 6. Keyboard Navigation
- [ ] Click into a WikiLink
- [ ] Press Cmd/Ctrl+Enter
- [ ] Should navigate to linked page (or create if doesn't exist)

#### 7. Non-existent Page
- [ ] Create link to page that doesn't exist
- [ ] Behavior: creates new page, or shows "page not found"
- [ ] Graceful handling

### Export Tests

#### 8. WikiLinks in Markdown Export
- [ ] Page with WikiLinks
- [ ] Export to Markdown
- [ ] WikiLinks preserved as `[[Page Name]]`
- [ ] Compatible with Obsidian import

#### 9. WikiLinks in HTML Export
- [ ] Export to HTML
- [ ] WikiLinks render as styled spans
- [ ] Not converted to `<a>` tags

#### 10. WikiLinks in PDF Export
- [ ] Export to PDF
- [ ] WikiLinks visible as `[[Page Name]]`
- [ ] Styled distinctly

### Edge Cases

#### 11. Nested Brackets
- [ ] Type `[[Page with [[nested]] brackets]]`
- [ ] Handles gracefully (doesn't break parser)

#### 12. Empty WikiLink
- [ ] Type `[[]]`
- [ ] Either ignored or shows validation

#### 13. Very Long Page Names
- [ ] Type `[[This is a very long page name with more than sixty four characters to test truncation]]`
- [ ] Slug truncated to 64 characters
- [ ] Still creates valid link

### Testing Summary

**Total Tests:** 13  
**Passed:** ___  
**Failed:** ___  
**Notes:**

---

## D. Backlinks Panel Testing

**Priority:** P1  
**Estimated Time:** 10 minutes  
**Migration Required:** None

### Prerequisites
- [ ] Page A exists
- [ ] Page B exists with WikiLink to Page A
- [ ] Page C exists with WikiLink to Page A

### Display Tests

#### 1. Backlinks Panel Visibility
- [ ] Open Page A (that is linked from other pages)
- [ ] Backlinks panel visible on page
- [ ] Located in sidebar or dedicated section

#### 2. Backlink List
- [ ] Panel shows "Backlinks" heading
- [ ] Lists all pages linking to current page
- [ ] Shows page titles
- [ ] Count is accurate

### Content Tests

#### 3. Excerpt Display
- [ ] Each backlink shows excerpt
- [ ] Excerpt includes context around the link
- [ ] Format: "...text before [[Link]] text after..."
- [ ] Ellipsis used for truncation

#### 4. Multiple Backlinks from Same Page
- [ ] Page B has 2 WikiLinks to Page A
- [ ] Both excerpts shown
- [ ] Or combined intelligently

### Accuracy Tests

#### 5. Correct Backlinks
- [ ] All linking pages are listed
- [ ] No false positives
- [ ] No missing backlinks

#### 6. No Backlinks
- [ ] Create new page with no incoming links
- [ ] Panel shows "No backlinks yet"
- [ ] Empty state is informative

### Real-time Updates

#### 7. Add New Backlink
- [ ] Open Page B
- [ ] Add WikiLink to Page A
- [ ] Save Page B
- [ ] Open Page A
- [ ] New backlink appears in panel
- [ ] May require refresh (acceptable)

#### 8. Remove Backlink
- [ ] Edit Page B to remove WikiLink
- [ ] Save
- [ ] Go to Page A
- [ ] Backlink removed from panel

### Performance Tests

#### 9. Many Backlinks
- [ ] Create page with 20+ backlinks
- [ ] Panel loads quickly (< 2 seconds)
- [ ] No performance degradation
- [ ] Consider pagination if > 50 backlinks

### Testing Summary

**Total Tests:** 9  
**Passed:** ___  
**Failed:** ___  
**Notes:**

---

## E. Clip to Grimoire Testing

**Priority:** P1  
**Estimated Time:** 10 minutes  
**Migration Required:** None

### Prerequisites
- [ ] At least one document in library with content
- [ ] At least one journal page to clip to

### Basic Clipping Tests

#### 1. Select Text in Library
- [ ] Open document in library
- [ ] Select text passage (50-200 words)
- [ ] "Clip to Grimoire" button appears
- [ ] Button is enabled

#### 2. Clip to Existing Page
- [ ] Click "Clip to Grimoire"
- [ ] Modal/dropdown shows list of journal pages
- [ ] Select existing page
- [ ] Confirm/Save
- [ ] Success message appears

#### 3. Verify Clipped Content
- [ ] Navigate to journal page
- [ ] Clipped text appears in page
- [ ] Text is formatted as blockquote or citation
- [ ] Source attribution included

### Source Attribution Tests

#### 4. Metadata Included
- [ ] Clipped passage shows:
  - [ ] Source document title
  - [ ] Author (if available)
  - [ ] Page number or location
  - [ ] Link back to source document

#### 5. Multiple Clips
- [ ] Clip passage A to page
- [ ] Clip passage B to same page
- [ ] Both clips appear
- [ ] Clips are separated/organized
- [ ] Order is preserved (newest first or last)

### UI/UX Tests

#### 6. Button Visibility
- [ ] No text selected: button disabled or hidden
- [ ] Text selected: button appears
- [ ] Hover state works
- [ ] Click is responsive

#### 7. Selection Behavior
- [ ] After clipping, selection cleared
- [ ] Or selection maintained (user preference)
- [ ] Button state updates

### API & Validation Tests

#### 8. Authentication
- [ ] Log out
- [ ] Try to clip (if possible)
- [ ] Returns authentication error

#### 9. Empty Selection
- [ ] Select zero characters
- [ ] Button disabled
- [ ] Or shows validation message

#### 10. Very Large Selection
- [ ] Select entire document (1000+ words)
- [ ] Clip successfully
- [ ] Or shows size limit message

### Testing Summary

**Total Tests:** 10  
**Passed:** ___  
**Failed:** ___  
**Notes:**

---

## F. Slash Menu Testing

**Priority:** P1  
**Estimated Time:** 10 minutes  
**Migration Required:** None

### Prerequisites
- [ ] Journal editor open
- [ ] Cursor in editing area

### Trigger Tests

#### 1. Open Menu with `/`
- [ ] Type `/` character
- [ ] Menu appears immediately
- [ ] Positioned near cursor
- [ ] Shows list of block types

#### 2. Menu Options
- [ ] Options include:
  - [ ] Heading 1
  - [ ] Heading 2
  - [ ] Heading 3
  - [ ] Bullet List
  - [ ] Numbered List
  - [ ] Blockquote
  - [ ] Code Block
  - [ ] Horizontal Rule

### Selection Tests

#### 3. Mouse Selection
- [ ] Click "Heading 1"
- [ ] Menu closes
- [ ] Cursor on new Heading 1 line
- [ ] Can type heading text

#### 4. Keyboard Navigation
- [ ] Type `/`
- [ ] Press Down arrow
- [ ] Selection moves down
- [ ] Press Up arrow
- [ ] Selection moves up
- [ ] Press Enter
- [ ] Selected block type inserted

#### 5. Filtering (if implemented)
- [ ] Type `/head`
- [ ] Menu filters to heading options
- [ ] Type `/list`
- [ ] Shows list options

### Insertion Tests

#### 6. Insert Heading
- [ ] Select Heading 2
- [ ] Heading inserted with proper styling
- [ ] Cursor ready for text input

#### 7. Insert List
- [ ] Select Bullet List
- [ ] List item created
- [ ] Press Enter creates new item
- [ ] Typing works correctly

#### 8. Insert Code Block
- [ ] Select Code Block
- [ ] Code block created
- [ ] Monospace font
- [ ] Press Enter stays in code block

### Dismissal Tests

#### 9. Escape Key
- [ ] Open menu with `/`
- [ ] Press Escape
- [ ] Menu closes
- [ ] `/` character remains or is deleted

#### 10. Click Away
- [ ] Open menu
- [ ] Click elsewhere in document
- [ ] Menu closes
- [ ] No block inserted

### Testing Summary

**Total Tests:** 10  
**Passed:** ___  
**Failed:** ___  
**Notes:**

---

## G. Drag Handle Testing

**Priority:** P1  
**Estimated Time:** 10 minutes  
**Migration Required:** None

### Prerequisites
- [ ] Journal page with multiple blocks (paragraphs, headings, lists)
- [ ] At least 5+ blocks for meaningful testing

### Display Tests

#### 1. Handle Visibility
- [ ] Hover over any block
- [ ] Drag handle (`⋮⋮`) appears on left side
- [ ] Handle is visible and styled
- [ ] Handle disappears when not hovering

#### 2. Handle Position
- [ ] Handle aligns with block
- [ ] Not overlapping text
- [ ] Easy to click

### Dragging Tests

#### 3. Basic Drag-and-Drop
- [ ] Click and hold drag handle
- [ ] Drag block up
- [ ] Visual feedback (ghost/outline)
- [ ] Drop zone indicators appear
- [ ] Release
- [ ] Block moves to new position

#### 4. Drag Down
- [ ] Drag block down in document
- [ ] Drop zones show between blocks
- [ ] Release
- [ ] Block moved successfully

#### 5. Reordering Multiple Blocks
- [ ] Drag paragraph to top
- [ ] Drag heading to middle
- [ ] Drag list to bottom
- [ ] All moves work correctly
- [ ] Content not corrupted

### Nested Content Tests

#### 6. Dragging List Items
- [ ] Drag individual list item
- [ ] Item moves within list
- [ ] Or entire list moves (implementation dependent)

#### 7. Dragging Block with Nested Content
- [ ] Drag blockquote containing paragraphs
- [ ] Entire blockquote moves as unit
- [ ] Nested content intact

### Visual Feedback Tests

#### 8. Ghost Element
- [ ] While dragging, ghost/preview visible
- [ ] Shows what's being moved
- [ ] Slightly transparent

#### 9. Drop Zones
- [ ] Blue/amber line shows where block will drop
- [ ] Line appears between blocks
- [ ] Line follows cursor

### Edge Cases

#### 10. Drag to Beginning
- [ ] Drag last block to first position
- [ ] Works correctly

#### 11. Drag to End
- [ ] Drag first block to last position
- [ ] Works correctly

#### 12. Cancel Drag
- [ ] Start dragging
- [ ] Press Escape or drag outside area
- [ ] Drag cancelled
- [ ] Block returns to original position

### Testing Summary

**Total Tests:** 12  
**Passed:** ___  
**Failed:** ___  
**Notes:**

---

## H. Book Cover System Testing

**Priority:** P2  
**Estimated Time:** 15 minutes  
**Migration Required:** 017

### Prerequisites
- [ ] Migration 017 applied (cover_source column)
- [ ] Admin access
- [ ] At least one document without a cover

### Cover Scraping Tests

#### 1. Open Library Scraping
- [ ] Upload document with known title/author
- [ ] System attempts to fetch cover from Open Library
- [ ] If found, cover image displayed
- [ ] Image quality acceptable

#### 2. Fallback to AI Generation
- [ ] Upload document without Open Library cover
- [ ] System falls back to Nano Banana AI
- [ ] AI-generated cover appears
- [ ] Cover is relevant to title/content

### Cover Display Tests

#### 3. Library Cards
- [ ] Navigate to library page
- [ ] Documents with covers show images
- [ ] Covers are properly sized
- [ ] No broken images

#### 4. Document Detail Page
- [ ] Open document
- [ ] Cover displayed prominently
- [ ] High resolution (not pixelated)

#### 5. Default Fallback
- [ ] Document with no cover
- [ ] Shows default cover placeholder
- [ ] Placeholder is styled appropriately

### Admin Monitoring Tests

#### 6. Cover Status Dashboard
- [ ] Go to admin area
- [ ] Find cover monitoring page
- [ ] Shows list of documents
- [ ] Indicates cover source (Open Library, Nano Banana, None)

#### 7. Manual Cover Upload (if implemented)
- [ ] Admin can upload custom cover
- [ ] Image validation (size, format)
- [ ] Cover saved and displayed

#### 8. Regenerate Cover
- [ ] Admin can trigger cover regeneration
- [ ] New cover fetched/generated
- [ ] Previous cover replaced

### Testing Summary

**Total Tests:** 8  
**Passed:** ___  
**Failed:** ___  
**Notes:**

---

## I. Phase 3 Infrastructure Testing

**Priority:** P2  
**Estimated Time:** 20 minutes  
**Migrations Required:** 018, 019

### Database Tests

#### 1. Migrations Applied
- [ ] Migration 018 (correspondences) applied
- [ ] Migration 019 (convergence concepts) applied
- [ ] Tables exist: `correspondences`, `correspondence_relationships`, `convergence_concepts`, `convergence_relationships`

#### 2. Schema Validation
- [ ] `correspondences` table has all columns
- [ ] Category constraints allow 16 types
- [ ] Relationship types allow 6 types
- [ ] Indexes created

### API Routes Tests

#### 3. Entities API
- [ ] GET `/api/graph/entities` returns empty array initially
- [ ] Requires authentication
- [ ] Returns JSON

#### 4. Create Entity
- [ ] POST `/api/graph/entities` with test data
- [ ] Entity created in database
- [ ] Returns created entity with ID

#### 5. Relationships API
- [ ] GET `/api/graph/edges` returns relationships
- [ ] Can filter by type

#### 6. Concepts API
- [ ] GET `/api/concepts` works
- [ ] Returns empty array initially
- [ ] Can create concept via POST

### GraphView UI Tests

#### 7. Graph Page Loads
- [ ] Navigate to `/graph`
- [ ] Page loads without errors
- [ ] Placeholder or basic graph visible

#### 8. Empty State
- [ ] With no data, shows helpful message
- [ ] Suggests adding entities

#### 9. Basic Rendering (if data exists)
- [ ] Add test entity via API
- [ ] Refresh graph page
- [ ] Entity node appears
- [ ] Node has visual representation

### RLS Policies Tests

#### 10. Non-Admin User
- [ ] Log in as regular user
- [ ] Try to create entity
- [ ] Operation blocked or returns error

#### 11. Admin User
- [ ] Log in as admin
- [ ] Can create/edit entities
- [ ] Operations succeed

### Testing Summary

**Total Tests:** 11  
**Passed:** ___  
**Failed:** ___  
**Notes:**

---

## Overall Testing Summary

### Feature Status Matrix

| Feature | Tests Passed | Tests Failed | Status | Ready for Production? |
|---------|-------------|--------------|--------|----------------------|
| TTS System | __ / 24 | __ | ⬜ | ⬜ |
| Journal Export | __ / 19 | __ | ⬜ | ⬜ |
| WikiLinks | __ / 13 | __ | ⬜ | ⬜ |
| Backlinks | __ / 9 | __ | ⬜ | ⬜ |
| Clip to Grimoire | __ / 10 | __ | ⬜ | ⬜ |
| Slash Menu | __ / 10 | __ | ⬜ | ⬜ |
| Drag Handle | __ / 12 | __ | ⬜ | ⬜ |
| Cover System | __ / 8 | __ | ⬜ | ⬜ |
| Phase 3 Infrastructure | __ / 11 | __ | ⬜ | ⬜ |

**Total Tests:** 116  
**Total Passed:** ___  
**Total Failed:** ___  
**Pass Rate:** ___%

### Critical Issues Found

1. 
2. 
3. 

### Minor Issues Found

1. 
2. 
3. 

### Recommendations

- [ ] Deploy to production
- [ ] Fix issues and retest
- [ ] Requires significant rework

### Sign-off

**Tester Name:** _______________  
**Date:** _______________  
**Signature:** _______________

---

**Next Steps:**
1. Complete all tests
2. Document any issues in GitHub Issues
3. Retest failed items after fixes
4. Update MASTER_DEVELOPMENT_PLAN.md with test results
5. Proceed with deployment or continue development as needed

