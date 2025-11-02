# WikiLink Features Guide

**Feature:** Interactive Wiki-Link System  
**Sprint:** 6  
**Date:** November 2, 2025  
**Status:** ✅ Complete

---

## Overview

The WikiLink system enables seamless cross-referencing between journal pages using double-bracket syntax `[[Page Name]]`. Click any wiki link to navigate, preview, or get AI assistance—all without leaving your current page.

---

## Creating WikiLinks

### Basic Syntax

Type double brackets around any page name:

```
[[Page Name]]
```

The text automatically converts to an amber-colored clickable link.

### Examples

```
See [[Venus]] for planetary correspondences.
Related: [[Astrology Basics]] and [[Tarot Symbolism]].
My thoughts on [[The Kybalion]].
```

### What Happens

- Text turns amber (`text-amber-400`)
- Link becomes clickable
- Hover shows pointer cursor
- Link persists when you save the page

---

## Using WikiLinks

### Click to Activate

**Click any wiki link** to open the action card:

![Action Card](action-card-preview.png)

The card appears in the bottom-right corner with three options:

1. **Open page** - Navigate or create the page
2. **Preview** - See page content without leaving
3. **Ask AI** - Get AI assistance for the page

---

## Navigation

### Open Existing Page

1. Click a wiki link
2. Click **"Open page"**
3. Browser navigates to the target page
4. Action card dismisses automatically

**Button State:**
- Shows "Opening..." during navigation
- Disabled while loading

### Create New Page

If the linked page doesn't exist:

1. Click **"Open page"**
2. Confirm in the browser prompt: *"Page 'X' doesn't exist. Create it?"*
3. Click **OK** to create
4. Browser navigates to the new page with:
   - Title set to the wiki link text
   - Empty content ready for editing
   - Default 📝 icon

**Cancel Creation:**
- Click **Cancel** in the prompt
- Action card remains open
- No page is created

---

## Preview Feature

### Quick Preview

Get a snapshot of any page without navigating away:

1. Click a wiki link
2. Click **"Preview"**
3. Modal appears with:
   - Page icon and title
   - Last updated date
   - Content excerpt
   - Backlinks (if any)
   - "Open page" and "Close" buttons

### Preview Modal Components

**Header:**
- 🎨 Page icon (emoji)
- 📄 Page title
- 📅 Last updated timestamp

**Content Section:**
- First paragraph excerpt
- Shows "Empty page" if no content

**Backlinks Section:**
- Lists all pages linking to this one
- Shows title and context excerpt
- Count displayed: "Backlinks (3)"

**Actions:**
- **Open page** - Navigate to the page
- **Close** - Dismiss the preview

### Preview Caching

Previews are cached for performance:
- First view: Fetches from server
- Subsequent views: Instant load from cache
- Cache persists during your session
- No duplicate API calls

---

## AI Actions

### AI Menu

Access AI-powered helpers for any wiki link:

1. Click a wiki link
2. Click **"Ask AI"**
3. Choose from three actions:

#### 📝 Summarize Page

Generates a summary of the page content.

**Use Cases:**
- Quick overview before opening
- Understand page purpose
- Decide if it's relevant

**Output:**
- Summary text
- Key points
- Connections to other pages

#### 🔗 Suggest Connections

Finds related pages and concepts.

**Use Cases:**
- Discover related content
- Build knowledge graph
- Find missing links

**Output:**
- List of related pages
- Similar topics
- Cross-references

#### ✨ Draft Content

Creates starter content for the page.

**Use Cases:**
- Overcome blank page syndrome
- Get writing prompts
- Structure your thoughts

**Output:**
- Introduction section
- Key points outline
- Next steps suggestions

### Using AI Results

After an action completes:

**Close** - Dismiss the AI menu  
**Try Another** - Run a different action

---

## Keyboard Shortcuts

### Activate WikiLink

**Windows:** `Ctrl + Enter`  
**Mac:** `Cmd + Enter`

1. Place cursor inside a wiki link
2. Press the shortcut
3. Action card appears

**Console Log:**
```
[WikiLinkExtension] wikilink-activate { title: 'Page Name', slug: 'page-name' }
```

---

## Activation History

### Tracking

The system automatically tracks your wiki-link activations:

- Last 50 activations stored
- Persists in browser localStorage
- Includes timestamp and page details
- Survives page refreshes

### Storage Location

**Browser:** `localStorage['wikilink-history']`

**Format:**
```json
[
  {
    "detail": { "title": "Venus", "slug": "venus" },
    "timestamp": 1730563200000
  },
  ...
]
```

### Analytics (Optional)

If Google Analytics is configured, events are sent:

**Event:** `wikilink_activate`  
**Category:** `journal`  
**Label:** Page title or slug

---

## Advanced Features

### Multiple WikiLinks

You can have multiple wiki links in one paragraph:

```
See [[Venus]] and [[Mars]] for planetary info.
```

Each link works independently.

### WikiLinks in Different Blocks

Wiki links work in:
- ✅ Paragraphs
- ✅ Headings
- ✅ List items
- ✅ Blockquotes

### Special Characters

Wiki links support special characters:

```
[[Page with "quotes" & symbols!]]
[[Long Page Title That Exceeds Normal Length]]
```

---

## Backlinks

### What Are Backlinks?

Backlinks show which pages link **to** the current page.

### Where to See Them

1. **Preview Modal** - Shows backlinks for previewed page
2. **Backlinks Panel** - Dedicated component (if added to page)

### Backlink Information

Each backlink shows:
- 📄 Page title
- 📝 Context excerpt (surrounding text)
- 🔗 Clickable to navigate

### Example

**Page A** contains: `See [[Page B]] for details.`

When you preview **Page B**, the backlinks section shows:
```
Backlinks (1)
- Page A
  "...See [[Page B]] for details..."
```

---

## Best Practices

### Naming Conventions

**Good:**
```
[[Venus Correspondences]]
[[Tarot Major Arcana]]
[[Daily Journal 2025-11-02]]
```

**Avoid:**
```
[[venus]] (too generic)
[[My Page]] (not descriptive)
[[TODO]] (not specific)
```

### When to Use WikiLinks

✅ **Use for:**
- Cross-referencing journal pages
- Building knowledge networks
- Linking related concepts
- Creating page hierarchies

❌ **Don't use for:**
- External URLs (use regular links)
- File attachments
- Temporary notes

### Organizing with WikiLinks

**Hub Pages:**
Create index pages that link to related content:

```markdown
# Astrology Hub

Core Concepts:
- [[Planets]]
- [[Zodiac Signs]]
- [[Houses]]
- [[Aspects]]

Advanced Topics:
- [[Progressions]]
- [[Transits]]
```

**Daily Notes:**
Link to evergreen content:

```markdown
# 2025-11-02

Today I studied [[Venus]] and its connection to [[Taurus]].
See also: [[Planetary Correspondences]]
```

---

## Troubleshooting

### WikiLink Not Clickable

**Problem:** Link appears but doesn't respond to clicks

**Solutions:**
1. Refresh the page
2. Check browser console for errors
3. Verify the link has amber color
4. Try the keyboard shortcut (`Ctrl/Cmd+Enter`)

### Action Card Not Appearing

**Problem:** Click doesn't show the action card

**Solutions:**
1. Check if another modal is open
2. Look for console errors (F12)
3. Verify you're on a journal page (`/journal/[id]`)
4. Try clicking again

### Preview Shows "Not Found"

**Problem:** Preview says page doesn't exist

**Cause:** The page hasn't been created yet

**Solution:** Click "Open page" to create it

### Navigation Fails

**Problem:** "Failed to navigate to page" alert

**Causes:**
- Network offline
- API error
- Permission issue

**Solutions:**
1. Check internet connection
2. Verify you're logged in
3. Try refreshing the page
4. Check browser console for details

### History Not Persisting

**Problem:** Activation history disappears

**Causes:**
- Browser in private/incognito mode
- localStorage disabled
- Storage quota exceeded

**Solutions:**
1. Use normal browsing mode
2. Enable localStorage in browser settings
3. Clear some localStorage data

---

## Technical Details

### Architecture

**Hook:** `useWikiLinkActivation`  
**Location:** `app/src/hooks/useWikiLinkActivation.ts`

**Extension:** `WikiLink`  
**Location:** `app/src/tiptap/extensions/WikiLinkExtension.ts`

**Integration:** `JournalEditor` page  
**Location:** `app/src/app/journal/[id]/page.tsx`

### Events

**Custom Event:** `wikilink-activate`

**Detail:**
```typescript
{
  title?: string | null;
  slug?: string | null;
}
```

### Data Attributes

WikiLinks render with:
```html
<span 
  data-wikilink="true"
  data-wikilink-title="Page Name"
  data-wikilink-slug="page-name"
  class="text-amber-400 hover:underline cursor-pointer"
>
  [[Page Name]]
</span>
```

### API Endpoints Used

**List Pages:** `GET /api/journal`  
**Create Page:** `POST /api/journal`  
**Get Backlinks:** `GET /api/journal/backlinks?slug=...`

---

## Future Enhancements

### Planned Features

- [ ] Real AI integration (OpenAI/Claude)
- [ ] Graph visualization of wiki links
- [ ] Fuzzy search for page names
- [ ] Auto-complete while typing `[[`
- [ ] Bulk rename/refactor wiki links
- [ ] Export wiki link graph as JSON
- [ ] Wiki link analytics dashboard
- [ ] Collaborative wiki link editing

### Feedback

Have suggestions? Open an issue or discussion on GitHub.

---

## Related Documentation

- [Study Journal Feature](./STUDY_JOURNAL_FEATURE.md)
- [Testing Checklist](./testing/WIKILINK_TESTING_CHECKLIST.md)
- [Backlinks Panel](./components/BacklinksPanel.md)
- [Tiptap Extensions](./tiptap/extensions/)

---

**Last Updated:** November 2, 2025  
**Maintained By:** Digital Grimoire Development Team

