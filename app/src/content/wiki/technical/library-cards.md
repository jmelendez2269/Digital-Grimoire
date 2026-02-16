---
title: Library Cards
type: feature-spec
status: stable
audience: designer
description: Design specifications and implementation details for the 2:3 aspect ratio library cards.
---

# Library Card System

## Overview

The library cards enable a visually rich browsing experience, featuring prominent cover images (2:3 aspect ratio), comprehensive metadata (lenses, tags), and admin-facing controls.

---

## 1. Design Specification

### Visual Hierarchy

1. **Cover Image:** 2:3 aspect ratio, primary visual anchor.
2. **Title & Author:** Key identification.
3. **Domain Badge:** Amber background, immediate categorization.
4. **Metadata:** Lenses (max 3) and Tags.
5. **Curator Note:** Italicized editorial context.

### Layout

```
┌─────────────────────┐
│                     │
│   Book Cover        │  ← 2:3 aspect ratio
│   (Hover Zoom)      │  
│                     │
├─────────────────────┤
│ Title & Author      │
│ [Domain]            │
│ 👁️ Lenses (3 max)   │
│ 🏷️ Tags (3 max)      │
│ Brief Summary...    │
│ ─────────────────   │
│ "Curator note..."   │  ← Italicized
│ [View Document]     │
└─────────────────────┘
```

---

## 2. Technical Implementation

### Database Fields (`texts` table)

- `cover_image_url` (TEXT): URL to image resource.
- `curator_note` (TEXT): Editorial context.
- `short_summary` (TEXT): Truncated summary for card display.

### Components

- **`LibraryCard.tsx`**: Main component.
- **Grid Layout**:
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 3 columns
  - Wide: 4 columns

### Admin Features

- **Edit Button**: Only visible to users with `admin` role.
- **Quick Access**: Direct link to `/admin/edit/[id]`.

---

## 3. Customization

### Aspect Ratio

Modify in `app/src/app/library/page.tsx`:

```tsx
className="block relative aspect-[2/3]" // Change to aspect-[3/4] etc.
```

### Metadata Limits

Adjust slice values to show more/less data:

```tsx
{text.lenses.slice(0, 3).map(...)}
```
