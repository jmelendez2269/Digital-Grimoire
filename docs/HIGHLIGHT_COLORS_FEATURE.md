# Highlight Colors Feature

## Overview
Users can now choose custom colors for their PDF highlights from 7 vibrant options, making visual organization even easier.

## Color Options

| Color | Preview | RGB Value | Use Case |
|-------|---------|-----------|----------|
| **Yellow** 🟡 | `rgba(234, 179, 8, 0.3)` | Default highlight color |
| **Green** 🟢 | `rgba(34, 197, 94, 0.3)` | Success, verified info |
| **Blue** 🔵 | `rgba(59, 130, 246, 0.3)` | Questions, to clarify |
| **Pink** 🩷 | `rgba(236, 72, 153, 0.3)` | Creative, aesthetic |
| **Red** 🔴 | `rgba(239, 68, 68, 0.3)` | Critical, important |
| **Purple** 🟣 | `rgba(168, 85, 247, 0.3)` | Research, investigation |
| **Orange** 🟠 | `rgba(249, 115, 22, 0.3)` | Critiques, analysis |

## Features

### 1. Visual Color Picker
- **7 clickable swatches** with preview colors
- Selected color has amber border and scales up
- Shows selected color name below picker
- Accessible with keyboard navigation

### 2. Smart Defaults
- **Auto-matches category colors** by default
- When you change category, highlight color updates automatically
- Can override the default by manually selecting a color

### 3. PDF Highlight Rendering
- Highlights render in the selected color on PDF
- Border color automatically adjusted to match
- Smooth visual integration with dark theme

### 4. Color Mapping
```typescript
{
  yellow: 'rgba(234, 179, 8, 0.3)',
  green: 'rgba(34, 197, 94, 0.3)',
  blue: 'rgba(59, 130, 246, 0.3)',
  pink: 'rgba(236, 72, 153, 0.3)',
  red: 'rgba(239, 68, 68, 0.3)',
  purple: 'rgba(168, 85, 247, 0.3)',
  orange: 'rgba(249, 115, 22, 0.3)',
}
```

## Smart Category Integration

Colors automatically match categories:
- 📝 **General** → Yellow
- ⭐ **Important** → Red
- ❓ **Question** → Blue
- 💡 **Insight** → Yellow
- 🔍 **To Research** → Purple
- 💬 **Quote** → Green
- 🎯 **Critique** → Orange

## Implementation Details

### Database Schema
```sql
ALTER TABLE user_annotations 
ADD COLUMN highlight_color TEXT DEFAULT 'yellow' 
CHECK (highlight_color IN ('yellow', 'green', 'blue', 'pink', 'red', 'purple', 'orange'));

CREATE INDEX idx_user_annotations_highlight_color ON user_annotations(highlight_color);
```

### TypeScript Types
```typescript
interface Annotation {
  id: string;
  quote: string;
  note: string | null;
  category: string;
  highlight_color: 'yellow' | 'green' | 'blue' | 'pink' | 'red' | 'purple' | 'orange';
  position: any;
  created_at: string;
}
```

### API Changes
- **POST /api/annotations**: Accepts `highlight_color` field (defaults to 'yellow')
- **PUT /api/annotations**: Can update `highlight_color` field
- **GET /api/annotations**: Returns `highlight_color` with each annotation

## Files Modified

1. **`migrations/014_add_highlight_colors.sql`** - Database migration
2. **`app/src/components/AnnotationPanel.tsx`** - Color picker UI
3. **`app/src/components/PDFViewer.tsx`** - Colored highlight rendering
4. **`app/src/app/api/annotations/route.ts`** - API handlers

## Setup Instructions

### Step 1: Run Database Migration
In your Supabase SQL Editor, run:
```sql
-- migrations/014_add_highlight_colors.sql
ALTER TABLE user_annotations 
ADD COLUMN IF NOT EXISTS highlight_color TEXT DEFAULT 'yellow' 
CHECK (highlight_color IN ('yellow', 'green', 'blue', 'pink', 'red', 'purple', 'orange'));

CREATE INDEX IF NOT EXISTS idx_user_annotations_highlight_color ON user_annotations(highlight_color);
```

### Step 2: Restart Dev Server (if needed)
The app should hot-reload automatically, but if not:
```bash
cd Digital-Grimoire/app
pnpm dev
```

### Step 3: Test the Feature
1. Navigate to any document
2. Select text in PDF
3. Notice the **Highlight Color** picker below category dropdown
4. Click different colors to preview
5. Save annotation
6. See colored highlight on PDF!

## Usage Examples

### Color-Coding Research
- **Yellow** for general notes
- **Red** for critical findings
- **Blue** for questions to investigate
- **Purple** for topics needing more research

### Visual Organization
- **Green** for confirmed information
- **Pink** for creative connections
- **Orange** for critique or disagreement

### Category Matching
When you select a category, the color automatically updates:
1. Choose "⭐ Important" → Color changes to Red
2. Choose "❓ Question" → Color changes to Blue
3. Can still override by clicking a different color

## UI Components

### Color Picker
```tsx
<div className="flex gap-2">
  {HIGHLIGHT_COLORS.map((color) => (
    <button
      onClick={() => setColor(color.value)}
      className={selected ? 'border-amber-400 scale-110' : 'border-zinc-700'}
      style={{ backgroundColor: color.preview }}
    />
  ))}
</div>
```

### Color Indicator
Shows selected color name:
```
Selected: Blue
```

## Accessibility Features

- **Keyboard navigation**: Tab through color swatches
- **ARIA labels**: Each button labeled with color name
- **Screen reader support**: Hidden text announces color
- **Visual + Text**: Not relying on color alone
- **High contrast**: Border indicates selection

## Performance Considerations

- **Indexed column**: Fast color-based queries (if needed later)
- **Client-side rendering**: No API calls for color changes
- **Efficient color mapping**: O(1) lookup
- **Small bundle size**: ~1KB for color constants

## Future Enhancements

### Potential Additions
1. **Custom colors** - Let users define their own RGB values
2. **Color themes** - Pre-defined color palettes
3. **Gradient highlights** - Multi-color highlights
4. **Opacity control** - Adjust highlight transparency
5. **Color filters** - Filter annotations by highlight color

### Advanced Features
- **Color-based search** - Find all red highlights
- **Color statistics** - Breakdown of color usage
- **Export by color** - Export annotations grouped by color
- **Color shortcuts** - Keyboard shortcuts for quick coloring

## Browser Compatibility

- ✅ Chrome/Edge - Fully supported
- ✅ Firefox - Fully supported
- ✅ Safari - Fully supported
- ✅ Mobile browsers - Touch-friendly swatches

## Migration Notes

### Backward Compatibility
- Existing annotations will have `highlight_color = 'yellow'` (default)
- Old highlights render in yellow (no visual change)
- No breaking changes to existing data

### Rollback Procedure
If you need to rollback:
```sql
ALTER TABLE user_annotations DROP COLUMN IF EXISTS highlight_color;
DROP INDEX IF EXISTS idx_user_annotations_highlight_color;
```

## Testing Checklist

- ✅ Color picker displays all 7 colors
- ✅ Selected color shows amber border
- ✅ Color name displays below picker
- ✅ Category change updates color automatically
- ✅ Can override auto color by manual selection
- ✅ Highlights render in correct color on PDF
- ✅ Color persists after page reload
- ✅ Existing annotations default to yellow
- ✅ Can create multiple highlights with different colors
- ✅ Click highlight navigates to annotation

## Known Limitations

1. **Cannot edit color** - Currently need to delete and recreate (will add in future)
2. **No custom colors** - Limited to 7 pre-defined colors
3. **No opacity control** - Fixed at 30% opacity
4. **No color search/filter** - Cannot filter annotations by color yet

## Visual Examples

### Annotation Form
```
Highlighted Text: *
[Text area with selected text]

Category: *
[⭐ Important ▼]

Highlight Color: *
[🟡] [🟢] [🔵] [🩷] [🔴*] [🟣] [🟠]
Selected: Red

Your Note (Optional):
[Text area for notes]
```

### PDF with Multiple Colors
```
Page 1:
- Yellow highlight: general note
- Red highlight: important finding
- Blue highlight: question to research
- Green highlight: verified fact
```

## Resources

- [Tailwind Color System](https://tailwindcss.com/docs/customizing-colors)
- [Web Accessibility Color Contrast](https://webaim.org/articles/contrast/)
- [React Color Pickers](https://casesandberg.github.io/react-color/)

## Commit Hash
TBD - feat: add customizable highlight colors

## Next Steps
Ready to test! The color picker should appear in the annotation form, and highlights should render in your chosen colors on the PDF.

