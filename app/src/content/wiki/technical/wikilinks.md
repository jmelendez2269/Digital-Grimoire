---
title: WikiLinks
type: feature-spec
status: stable
audience: user
description: System for cross-referencing journal pages using [[WikiLink]] syntax.
---

# WikiLink Features

## Overview

The WikiLink system enables seamless cross-referencing between journal pages using double-bracket syntax `[[Page Name]]`.

---

## 1. Syntax & usage

### Creating Links

Wrap text in double brackets:

```
[[Venus]]
[[The Kybalion]]
```

- Auto-converts to **Amber** color.
- Becomes clickable.

### Interaction

Clicking a link opens the **Action Card**:

1. **Open Page:** Navigates to the page. If it doesn't exist, prompts to create it.
2. **Preview:** Shows a modal with page excerpt and backlinks without leaving context.
3. **Ask AI:** Summarize, suggest connections, or draft content for the linked page.

---

## 2. Technical Implementation

### Components

- **Extension:** `WikiLinkExtension.ts` (Tiptap).
- **Hook:** `useWikiLinkActivation.ts`.
- **Storage:** `localStorage['wikilink-history']` tracks recent activations.

### Data Attributes

Reflected in the DOM as:

```html
<span 
  data-wikilink="true"
  data-wikilink-title="Page Name"
  data-wikilink-slug="page-name"
  class="text-amber-400..."
>
  [[Page Name]]
</span>
```

---

## 3. Backlinks

The system tracks which pages link *to* the current page.

- Visible in the **Preview Modal**.
- Visible in the dedicated **Backlinks Panel**.

---

## 4. AI Features

- **Summarize:** Generates a quick overview of the linked page.
- **Connections:** Suggests related concepts.
- **Draft:** Generates starter content for empty pages.
