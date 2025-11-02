# Sacred Texts Import Tool

## Overview

The Sacred Texts Import Tool allows administrators to easily import texts from [sacred-texts.com](https://sacred-texts.com) directly into the Digital Grimoire library. The tool automatically fetches, parses, and structures the content, making it immediately available for reading, annotation, and study.

## Features

- **Automatic Content Extraction**: Fetches and parses HTML content from sacred-texts.com
- **Multi-Chapter Support**: Handles both single-page texts and multi-chapter books
- **Metadata Auto-Detection**: Automatically extracts title, author, year, and description
- **Format Options**: Choose between HTML, Markdown, or Plain Text storage
- **Manual Overrides**: Edit any metadata field before importing
- **Structured Display**: Imported texts use the ChapterViewer for easy navigation
- **Full Integration**: Works with all existing features (annotations, bookmarks, collections, TTS)

## How to Use

### Step 1: Access the Import Tool

1. Log in to your admin account
2. Click on your profile icon in the header
3. Select **Import Sacred Text** from the dropdown menu
4. You'll be taken to `/admin/import-sacred-text`

### Step 2: Find Your Source URL

1. Go to [sacred-texts.com](https://sacred-texts.com)
2. Browse or search for the text you want to import
3. Navigate to either:
   - **Index page**: For multi-chapter books (e.g., `/eso/kyb/index.htm`)
   - **Single page**: For standalone texts or individual chapters

### Step 3: Configure Import Settings

#### URL Input
Paste the full URL from sacred-texts.com. Examples:
- `https://www.sacred-texts.com/eso/kyb/index.htm` (The Kybalion - multi-chapter)
- `https://www.sacred-texts.com/bib/kjv/gen001.htm` (Genesis Chapter 1)

#### Format Selection
Choose how the content should be stored:

**HTML** (Recommended for most texts)
- ✅ Preserves original formatting exactly
- ✅ Maintains structure, emphasis, and layout
- ✅ Best for texts with tables, special formatting
- ⚠️ Larger storage size
- ⚠️ Requires sanitization (automatically handled)

**Markdown**
- ✅ Clean, readable format
- ✅ Smaller storage size than HTML
- ✅ Easy to manually edit if needed
- ✅ Good for future portability
- ⚠️ Some formatting may be simplified
- ⚠️ Best for texts with simple structure

**Plain Text**
- ✅ Smallest storage size
- ✅ Fastest rendering
- ✅ Simple and clean
- ⚠️ No formatting preserved
- ⚠️ Best for poems, prayers, short texts

### Step 3.5: AI-Enhanced Metadata (Optional)

**✨ AI-Powered Analysis** (Enabled by default)

The import tool can use OpenAI GPT-4 to automatically analyze the content and generate:
- **Smart Summaries**: Both short (2-3 sentences) and long (comprehensive) summaries
- **Suggested Lenses**: Automatically identifies which of the 7 Convergence Machine lenses apply
- **Enhanced Tags**: AI-generated tags based on content themes
- **Type Classification**: Intelligent document type detection
- **Domain Suggestion**: Automatic domain categorization

**How It Works:**
1. After fetching the text, the first 3 chapters (up to 10,000 characters) are analyzed
2. AI extracts themes, identifies perspectives, and generates metadata
3. Results merge with parsed data (manual overrides take precedence)
4. Import takes ~10 seconds longer with AI enabled

**Toggle the Checkbox:**
- ✅ **Checked** (default): AI analyzes content and generates metadata
- ❌ **Unchecked**: Use only parsed HTML metadata (faster, no AI costs)

**When to Use AI:**
- ✅ When importing unfamiliar texts
- ✅ To discover hidden themes and perspectives
- ✅ For consistent, high-quality metadata
- ✅ When building a searchable, well-categorized library

**When to Skip AI:**
- ❌ When you already know the content well
- ❌ For very short texts (AI needs context)
- ❌ When importing many texts in batch (cost consideration)
- ❌ When you prefer to manually curate all metadata

**Note**: If AI analysis fails (network issue, API error), the import continues with parsed metadata only. You'll see a warning message.

### Step 4: Override Metadata (Optional)

The tool automatically detects metadata from the source page, but you can override any field:

- **Title**: Auto-detected from page title (cleaned)
- **Author**: Auto-detected from page content
- **Year**: Auto-detected from page content
- **Publisher**: Optional field
- **Type**: Choose from dropdown (Sacred Text, Scripture, Commentary, etc.)
- **Domain**: Choose from dropdown (Spirituality, Philosophy, Theology, etc.)
- **Tags**: Comma-separated keywords (e.g., `hermeticism, alchemy, wisdom`)
- **Lenses**: Comma-separated analytical perspectives (e.g., `hermetic_principles, metaphysics`)
- **Summary**: Optional custom summary

**Tip**: Leave fields blank to use auto-detected values. Only fill in fields you want to override.

### Step 5: Import

1. Click the **Import Text** button
2. Wait for the import process to complete:
   - **Without AI**: Usually 5-15 seconds
   - **With AI**: Usually 15-30 seconds (AI analysis adds ~10s)
3. You'll see a success message with:
   - Text title
   - Number of chapters imported
   - Total content length
   - ✨ **AI-enhanced metadata applied** (if AI was enabled)
   - ⚠️ Warning message (if AI failed but import succeeded)
4. Click **View in Library** to see your imported text

## Viewing Imported Texts

Imported texts appear in the library just like uploaded PDFs, with these features:

### ChapterViewer
- **Chapter tabs**: Navigate between chapters (desktop)
- **Chapter dropdown**: Select chapters on mobile
- **Previous/Next navigation**: Move through chapters sequentially
- **Chapter counter**: Shows current position (e.g., "3 of 15")

### Format-Specific Rendering
- **HTML**: Renders with preserved formatting and structure
- **Markdown**: Converts to styled HTML with typography
- **Plain Text**: Simple paragraph-based display with smart formatting

### All Standard Features Work
- ✅ Annotations and highlights
- ✅ Bookmarking
- ✅ Collections
- ✅ Text-to-Speech
- ✅ Search (if indexed)
- ✅ Metadata display

## Examples

### Example 1: The Kybalion (Multi-Chapter Book) with AI

**URL**: `https://www.sacred-texts.com/eso/kyb/index.htm`

**Format**: HTML (preserves special formatting and quotes)

**AI Enhanced**: ✅ Enabled

**AI-Generated Metadata**:
- **Lenses**: `symbolic_occult`, `philosophical`, `psychological`, `historical_anthropological`
- **Tags**: `hermeticism`, `seven principles`, `hermetic philosophy`, `ancient wisdom`, `mentalism`
- **Summary**: "The Kybalion presents the Seven Hermetic Principles - foundational teachings attributed to Hermes Trismegistus..."
- **Type**: `book_esoteric`
- **Domain**: `occultism`

**Manual Overrides**: None needed (AI detected accurately)

**Result**: 16 chapters imported (Introduction + 15 principle chapters) with comprehensive AI-generated summaries and lenses

### Example 2: Tao Te Ching

**URL**: `https://www.sacred-texts.com/tao/taote.htm`

**Format**: Markdown (clean, simple text)

**Override Metadata**:
- Author: `Lao Tzu`
- Year: `-600` (approximate)
- Tags: `taoism, chinese philosophy, mysticism`
- Type: `sacred_text`
- Domain: `philosophy`

### Example 3: The Emerald Tablet

**URL**: `https://www.sacred-texts.com/alc/emerald.htm`

**Format**: Plain Text (short, simple text)

**Override Metadata**:
- Author: `Hermes Trismegistus`
- Tags: `alchemy, hermeticism, emerald tablet`

## Troubleshooting

### Import Failed: "Failed to parse sacred text"

**Possible Causes**:
- URL is not from sacred-texts.com
- Page structure is unusual or unsupported
- Network timeout or connection issue

**Solutions**:
1. Verify the URL is correct and accessible
2. Try the URL in your browser first
3. Check if it's an index page or single page
4. Try again (temporary network issues)

### Import Failed: "No chapters found on index page"

**Possible Causes**:
- The parser couldn't detect the chapter links
- The index page uses an unusual structure

**Solutions**:
1. Try importing the first chapter directly instead of the index
2. Report the URL for parser improvement

### Content Looks Wrong After Import

**Possible Causes**:
- Wrong format selected
- Source page has unusual structure
- Navigation elements included

**Solutions**:
1. Delete the text and try a different format:
   - If too bare → Try HTML instead of Plain Text
   - If too cluttered → Try Markdown instead of HTML
2. Report the issue with the specific URL

### Metadata Not Detected

**Possible Causes**:
- Source page doesn't include metadata
- Metadata is in an unusual location

**Solutions**:
1. Manually fill in the metadata fields before importing
2. This is expected for some texts - just override as needed

### Can't Find Import Tool

**Possible Causes**:
- Not logged in as admin
- Wrong account role

**Solutions**:
1. Verify you're logged in
2. Check with system administrator about admin access
3. Look for "Import Sacred Text" in profile dropdown menu

## Database Schema

Imported texts are stored in the `texts` table with:

```sql
{
  source_format: 'html', -- Source format column
  metadata: {
    isStructuredText: true,
    format: 'html', -- Rendering format
    chapters: [
      {
        id: 'chapter-1',
        title: 'Chapter I: ...',
        content: '...'
      }
    ],
    sourceUrl: 'https://...',
    originalFormat: 'html',
    parsedAt: '2025-11-02T...',
    chapterCount: 16,
    totalLength: 123456
  }
}
```

## Technical Details

### Parser Logic

The parser (`sacred-texts-parser.ts`) works in several stages:

1. **URL Analysis**: Determines if index or single page
2. **Metadata Extraction**: Parses title, author, year from HTML
3. **Chapter Discovery**: Finds chapter links on index pages
4. **Content Fetching**: Downloads each chapter page
5. **HTML Cleaning**: Removes navigation, ads, scripts
6. **Format Conversion**: Converts to selected format (HTML/Markdown/Plain Text)
7. **Sanitization**: Cleans HTML to prevent XSS (for HTML format)
8. **Structuring**: Organizes into chapter objects

### Security

- **HTML Sanitization**: All HTML content is sanitized with DOMPurify
- **Allowed HTML Tags**: Only safe formatting tags (no scripts, iframes)
- **URL Validation**: Only sacred-texts.com URLs accepted
- **Authentication**: Admin-only access required

### Performance

- **Typical Import Time**: 5-30 seconds depending on:
  - Number of chapters (1-50+)
  - Network speed
  - Server response time
- **Rate Limiting**: Be respectful of sacred-texts.com
- **Background Processing**: Import happens synchronously (no queue yet)

## API Reference

### POST `/api/import-sacred-text`

Imports a text from sacred-texts.com.

**Request Body**:
```json
{
  "url": "https://www.sacred-texts.com/eso/kyb/index.htm",
  "format": "html",
  "useAI": true,
  "metadata": {
    "title": "The Kybalion",
    "author": "Three Initiates",
    "year": 1912,
    "tags": ["hermeticism", "alchemy"],
    "lenses": ["symbolic_occult", "philosophical"],
    "type": "sacred_text",
    "domain": "occultism",
    "summary": "Optional custom summary"
  }
}
```

**Parameters**:
- `url` (string, required): Sacred-texts.com URL
- `format` (string, optional): "html", "markdown", or "plaintext" (default: "html")
- `useAI` (boolean, optional): Enable AI metadata extraction (default: true)
- `metadata` (object, optional): Manual metadata overrides (takes precedence over AI)

**Response** (Success):
```json
{
  "success": true,
  "textId": "uuid-here",
  "title": "The Kybalion",
  "chapterCount": 16,
  "totalLength": 123456,
  "format": "html",
  "aiEnhanced": true,
  "warning": "AI analysis unavailable - using parsed metadata only"
}
```

**Response Fields**:
- `aiEnhanced` (boolean): Whether AI metadata was successfully applied
- `warning` (string, optional): Warning message if AI failed (import still succeeds)

**Response** (Error):
```json
{
  "error": "Failed to parse sacred text",
  "details": "No chapters found on index page"
}
```

### GET `/api/import-sacred-text?url=...`

Validates a URL before importing (optional).

**Response**:
```json
{
  "valid": true,
  "url": "https://..."
}
```

## Future Enhancements

Potential improvements for future versions:

- [ ] Preview before import (show detected chapters)
- [ ] Batch import multiple URLs
- [ ] Import from other sources (Project Gutenberg, Archive.org)
- [ ] Custom CSS/styling for imported texts
- [ ] Edit imported texts after import
- [ ] Re-import/refresh existing texts
- [ ] Import queue for large batches
- [ ] Import history and analytics
- [ ] Auto-tagging based on content analysis

## Support

If you encounter issues:

1. Check this documentation first
2. Look at the browser console for errors
3. Try a different format or URL
4. Report issues with:
   - Exact URL used
   - Format selected
   - Error message received
   - Browser and OS information

## Related Documentation

- [ChapterViewer Component](../app/src/components/ChapterViewer.tsx)
- [Sacred Texts Parser](../app/src/lib/parsers/sacred-texts-parser.ts)
- [Import API Route](../app/src/app/api/import-sacred-text/route.ts)
- [Database Migration 020](../migrations/020_add_source_format_column.sql)

---

**Last Updated**: November 2, 2025

