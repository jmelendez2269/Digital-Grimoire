---
title: Highlight Colors
type: feature-spec
status: stable
audience: user
description: Specification for the 7-color highlight system and its integration with annotation categories.
---

# Highlight Colors Feature

## Overview

Users can choose custom colors for their PDF highlights from 7 vibrant options. The system features smart defaults that auto-match validation categories but allow manual overrides.

---

## 1. Color System

| Color | Hex/RGBA | Default Category Match | Use Case |
| :--- | :--- | :--- | :--- |
| **Yellow** 🟡 | `rgba(234, 179, 8, 0.3)` | **General**, **Insight** | Default, general notes |
| **Red** 🔴 | `rgba(239, 68, 68, 0.3)` | **Important** | Critical, warnings |
| **Blue** 🔵 | `rgba(59, 130, 246, 0.3)` | **Question** | Queries, things to clarify |
| **Purple** 🟣 | `rgba(168, 85, 247, 0.3)` | **To Research** | Deep dives, investigation |
| **Green** 🟢 | `rgba(34, 197, 94, 0.3)` | **Quote** | Verified info, quotes |
| **Orange** 🟠 | `rgba(249, 115, 22, 0.3)` | **Critique** | Analysis, disagreement |
| **Pink** 🩷 | `rgba(236, 72, 153, 0.3)` | *None* | Creative, aesthetic |

---

## 2. Features

### Smart Defaults

- When a user selects a Category (e.g., "Important"), the highlight color automatically switches (e.g., to Red).
- Users can override this by clicking a different color swatch *after* selecting the category.

### Visual Color Picker

- 7 clickable swatches.
- Selected state indicated by border and scale.
- Accessible via keyboard navigation.

### PDF Rendering

- Highlights render on the PDF canvas using the selected `rgba` value.
- Border colors are automatically derived for high contrast.

---

## 3. Technical Implementation

### Database Schema

```sql
ALTER TABLE user_annotations 
ADD COLUMN highlight_color TEXT DEFAULT 'yellow' 
CHECK (highlight_color IN ('yellow', 'green', 'blue', 'pink', 'red', 'purple', 'orange'));
```

### Types

```typescript
type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'red' | 'purple' | 'orange';
```

### Components

- **`AnnotationPanel.tsx`**: Host of the Color Picker UI.
- **`PDFViewer.tsx`**: Renders the colored highlights.

---

## 4. Accessibility

- **ARIA Labels**: Colors have descriptive labels (e.g., "Select Red").
- **Indicators**: Text label shows the currently selected color name (e.g., "Selected: Blue").
- **Contrast**: Selection state uses high-contrast borders, not just size changes.
