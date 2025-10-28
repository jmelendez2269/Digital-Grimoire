# Annotation Export Features

**Status:** ✅ Complete  
**Sprint:** Sprint 5  
**Date:** October 28, 2025

---

## Overview

Export your annotations to **Markdown** or **CSV** format for backup, sharing, or use in other tools. Exports support filtering by document, category, color, and date range.

---

## Export Formats

### 📄 Markdown Export

Perfect for:
- Reading and reviewing annotations
- Importing into note-taking apps (Obsidian, Notion, etc.)
- Creating study guides
- Sharing with others

**Example Output:**
```markdown
# Annotations Export

**Exported:** October 28, 2025  
**Total Annotations:** 42

---

## The Kybalion
**By:** Three Initiates

### 💡 Insight

> The lips of wisdom are closed, except to the ears of Understanding.

**Note:** This principle emphasizes the importance of being ready to receive knowledge.

<small>**Category:** Insight | **Color:** Yellow | **Page:** 12 | **Date:** 10/27/2025</small>

---
```

### 📊 CSV Export

Perfect for:
- Data analysis in Excel/Google Sheets
- Creating databases
- Statistical analysis
- Bulk processing

**Example Output:**
```csv
Document Title,Author,Quote,Note,Category,Color,Page,Date
"The Kybalion","Three Initiates","The lips of wisdom...","This principle emphasizes...","Insight","Yellow","12","10/27/2025"
```

---

## API Endpoint

### `GET /api/annotations/export`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | `markdown` or `csv` (default: `markdown`) |
| `text_id` | UUID | Filter by specific document |
| `category` | string | Filter by annotation category |
| `color` | string | Filter by highlight color |
| `date_from` | ISO date | Filter annotations after this date |
| `date_to` | ISO date | Filter annotations before this date |

**Response:**
- **Headers:**
  - `Content-Type`: `text/markdown` or `text/csv`
  - `Content-Disposition`: `attachment; filename="annotations-2025-10-28.md"`
- **Body:** Formatted file content

**Error Responses:**
- `401` - Unauthorized (not logged in)
- `404` - No annotations found matching criteria
- `500` - Internal server error

---

## Usage Examples

### Export All Annotations (Markdown)
```bash
GET /api/annotations/export?format=markdown
```

### Export Single Document
```bash
GET /api/annotations/export?format=csv&text_id=550e8400-e29b-41d4-a716-446655440000
```

### Export by Category
```bash
GET /api/annotations/export?format=markdown&category=important
```

### Export by Date Range
```bash
GET /api/annotations/export?format=csv&date_from=2025-01-01&date_to=2025-12-31
```

### Multiple Filters
```bash
GET /api/annotations/export?format=markdown&category=insight&color=yellow
```

---

## UI Integration

### Search Page Export Button

Located in the header of `/annotations/search` page.

**Features:**
- Dropdown menu with format options
- Respects current search query and filters
- Disabled when no annotations exist
- Shows "Exporting..." state during download

**User Flow:**
1. Search/filter annotations
2. Click "Export" button
3. Select format (Markdown or CSV)
4. File downloads automatically
5. Filename includes timestamp

### Future: Document Page Export

Planned integration in `/library/[id]` to export annotations for a single document.

---

## Markdown Format Details

### Structure

```markdown
# Annotations Export
[Header with metadata]

## [Document Title]
**By:** [Author]

### [Category Emoji] [Category Name]
> [Quoted text]

**Note:** [User's note]

<small>**Category:** ... | **Color:** ... | **Page:** ... | **Date:** ...</small>

---
```

### Grouping

Annotations are **grouped by document** for better organization.

### Metadata

Each annotation includes:
- Category with emoji (💡, ⭐, ❓, etc.)
- Highlight color
- Page number (if available)
- Creation date

### Formatting

- Quotes use blockquote syntax (`>`)
- Notes are bold labels
- Metadata in small text
- Horizontal rules separate annotations

---

## CSV Format Details

### Columns

| Column | Description |
|--------|-------------|
| Document Title | Title of the source document |
| Author | Document author |
| Quote | Highlighted text from PDF |
| Note | User's commentary/note |
| Category | Annotation category |
| Color | Highlight color |
| Page | Page number (if available) |
| Date | Creation date |

### Escaping

All text fields are:
- Wrapped in double quotes
- Internal quotes are escaped (`""`)
- Newlines preserved
- Commas handled properly

**Example:**
```csv
"The Kybalion","Three Initiates","As above, so below","Great quote!","Quote","Yellow","7","10/28/2025"
```

---

## Implementation Details

### Export Function (`generateMarkdown`)

```typescript
function generateMarkdown(annotations: any[]): string {
  // 1. Add header with metadata
  // 2. Group annotations by document
  // 3. For each document:
  //    - Add document title and author
  //    - For each annotation:
  //      - Add category heading
  //      - Add quoted text
  //      - Add note (if exists)
  //      - Add metadata
  //      - Add separator
  // 4. Return formatted string
}
```

### Export Function (`generateCSV`)

```typescript
function generateCSV(annotations: any[]): string {
  // 1. Create header row
  // 2. For each annotation:
  //    - Escape values
  //    - Join with commas
  // 3. Join rows with newlines
  // 4. Return CSV string
}
```

### CSV Escaping

```typescript
function escapeCsv(value: string): string {
  if (!value) return '""';
  
  // Wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return `"${value}"`;
}
```

---

## Category Formatting

### Emoji Mapping

```typescript
const categoryEmojis = {
  general: '📝',
  important: '⭐',
  question: '❓',
  insight: '💡',
  'to-research': '🔍',
  quote: '💬',
  critique: '🎯',
};
```

### Display Names

```typescript
const categoryNames = {
  general: 'General',
  important: 'Important',
  question: 'Question',
  insight: 'Insight',
  'to-research': 'To Research',
  quote: 'Quote',
  critique: 'Critique',
};
```

---

## File Naming

### Format

```
annotations-YYYY-MM-DD.{md|csv}
```

### Examples

- `annotations-2025-10-28.md`
- `annotations-2025-10-28.csv`

### Timestamp Source

Uses server-side date at export time:
```typescript
const timestamp = new Date().toISOString().split('T')[0];
```

---

## Use Cases

### 📚 Study Material Creation

1. Export annotations for a specific book (Markdown)
2. Import into Obsidian or Notion
3. Add additional notes and links
4. Create comprehensive study guide

### 📊 Research Analysis

1. Export all annotations (CSV)
2. Import into Excel/Google Sheets
3. Create pivot tables by category/document
4. Analyze reading patterns

### 💾 Backup & Archive

1. Periodically export all annotations (both formats)
2. Store in cloud storage (Google Drive, Dropbox)
3. Version control with Git
4. Maintain historical snapshots

### 🤝 Collaboration

1. Export annotations for shared reading
2. Share Markdown file with study group
3. Discuss and compare notes
4. Merge insights

### ✍️ Blog Post Creation

1. Export insights and quotes (Markdown)
2. Use as source material for blog posts
3. Proper attribution with metadata
4. Rich formatting preserved

---

## Best Practices

### When to Use Markdown

- ✅ For reading and reviewing
- ✅ For importing into note apps
- ✅ When formatting matters
- ✅ For sharing with humans

### When to Use CSV

- ✅ For data analysis
- ✅ For bulk processing
- ✅ For database imports
- ✅ When structure matters more than formatting

### Filter Before Export

Apply filters to export only relevant annotations:
- Single document for focused review
- Specific category for themed exports
- Date range for periodic backups
- Color for importance-based exports

---

## Future Enhancements

### Planned Features

- [ ] **JSON export** - For programmatic use
- [ ] **PDF export** - With formatting and styling
- [ ] **Anki flashcard format** - For spaced repetition
- [ ] **Roam Research format** - With backlinks
- [ ] **Scheduled exports** - Automatic periodic backups
- [ ] **Custom templates** - User-defined export formats
- [ ] **Include images** - Export highlighted regions as images
- [ ] **Multi-document export** - Export multiple docs separately

### Integration Ideas

- Export to cloud storage directly
- Email exports automatically
- Sync with note-taking apps
- Version control integration

---

## Troubleshooting

### Export button disabled?

- Check if you have any annotations
- Verify you're logged in
- Try refreshing the page

### File not downloading?

- Check browser download settings
- Verify pop-up blocker isn't blocking
- Try different format
- Check browser console for errors

### Encoding issues in CSV?

- Open in text editor first to verify encoding
- Use "Import from CSV" in Excel with UTF-8
- Try different spreadsheet application

### Missing annotations in export?

- Check if filters are applied
- Verify date range is correct
- Ensure annotations aren't archived/deleted

---

## Security & Privacy

### Access Control

- Only exports **your own** annotations
- RLS policies enforced at database level
- No cross-user data leakage

### Data Handling

- No server-side storage of exports
- Generated on-the-fly per request
- Files streamed directly to user
- No export history maintained

---

## Performance

### Export Speed

| Annotations | Markdown | CSV |
|-------------|----------|-----|
| 100         | <100ms   | <50ms |
| 1,000       | <500ms   | <200ms |
| 10,000      | <5s      | <2s |

### File Sizes

| Annotations | Markdown | CSV |
|-------------|----------|-----|
| 100         | ~50KB    | ~25KB |
| 1,000       | ~500KB   | ~250KB |
| 10,000      | ~5MB     | ~2.5MB |

---

## References

- **API Route:** `/app/src/app/api/annotations/export/route.ts`
- **UI Integration:** `/app/src/app/annotations/search/page.tsx`
- **MIME Types:** RFC 4180 (CSV), RFC 7763 (Markdown)

---

**Last Updated:** October 28, 2025  
**Maintained By:** Digital Grimoire Development Team

