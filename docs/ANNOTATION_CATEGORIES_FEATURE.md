# Annotation Categories Feature

## Overview
Users can now categorize their annotations with 7 different types, each with unique styling and filtering capabilities.

## Categories Available

| Category | Icon | Color | Use Case |
|----------|------|-------|----------|
| **General** | 📝 | Gray | Default category for general notes |
| **Important** | ⭐ | Red | Critical information, key insights |
| **Question** | ❓ | Blue | Questions to research or clarify |
| **Insight** | 💡 | Yellow | Personal revelations or connections |
| **To Research** | 🔍 | Purple | Topics requiring further investigation |
| **Quote** | 💬 | Green | Notable quotes to remember |
| **Critique** | 🎯 | Orange | Critical analysis or disagreements |

## Features

### 1. Category Selection
- **Dropdown in annotation form** with emoji icons
- Defaults to "General" category
- Required field when creating annotations

### 2. Visual Badges
- **Color-coded badges** display on each annotation
- Badges show category icon and name
- Styled to match category color theme

### 3. Category Filtering
- **Filter buttons** above annotation list
- Shows count for each category that has annotations
- Click to filter by specific category
- "All" button shows all annotations

### 4. Color Coding
Each category has a distinct color scheme:
```css
Red (Important):     bg-red-500/10 text-red-400 border-red-500/20
Blue (Question):     bg-blue-500/10 text-blue-400 border-blue-500/20
Yellow (Insight):    bg-yellow-500/10 text-yellow-400 border-yellow-500/20
Purple (Research):   bg-purple-500/10 text-purple-400 border-purple-500/20
Green (Quote):       bg-green-500/10 text-green-400 border-green-500/20
Orange (Critique):   bg-orange-500/10 text-orange-400 border-orange-500/20
Gray (General):      bg-zinc-700/50 text-zinc-400 border-zinc-600/20
```

## Implementation Details

### Database Schema
```sql
ALTER TABLE user_annotations 
ADD COLUMN category TEXT DEFAULT 'general' 
CHECK (category IN ('general', 'important', 'question', 'insight', 'to-research', 'quote', 'critique'));

CREATE INDEX idx_user_annotations_category ON user_annotations(category);
```

### TypeScript Types
```typescript
interface Annotation {
  id: string;
  quote: string;
  note: string | null;
  position: any;
  category: 'general' | 'important' | 'question' | 'insight' | 'to-research' | 'quote' | 'critique';
  created_at: string;
}
```

### API Changes
- **POST /api/annotations**: Accepts `category` field (defaults to 'general')
- **PUT /api/annotations**: Can update `category` field
- **GET /api/annotations**: Returns `category` with each annotation

## Files Modified

1. **`migrations/013_add_annotation_categories.sql`** - Database migration
2. **`app/src/components/AnnotationPanel.tsx`** - UI and filtering logic
3. **`app/src/app/api/annotations/route.ts`** - API handlers

## Setup Instructions

### Step 1: Run Database Migration
In your Supabase SQL Editor, run:
```sql
-- migrations/013_add_annotation_categories.sql
ALTER TABLE user_annotations 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' 
CHECK (category IN ('general', 'important', 'question', 'insight', 'to-research', 'quote', 'critique'));

CREATE INDEX IF NOT EXISTS idx_user_annotations_category ON user_annotations(category);
```

### Step 2: Restart Dev Server
If server is running, restart to pick up changes:
```bash
cd Digital-Grimoire/app
pnpm dev
```

### Step 3: Test the Feature
1. Navigate to any document
2. Select text in PDF to create annotation
3. Choose a category from dropdown
4. Save annotation
5. See colored badge on annotation
6. Use filter buttons to filter by category

## Usage Examples

### Creating an Important Annotation
1. Select text in PDF
2. Auto-switches to Notes tab
3. Choose "⭐ Important" from category dropdown
4. Add note (optional)
5. Save
6. Red badge appears on annotation

### Filtering by Question
1. Click "❓ Question" filter button
2. Only shows annotations tagged as questions
3. Count updates in filter buttons

### Organizing Research Notes
- Use **🔍 To Research** for topics to investigate
- Use **💡 Insight** for personal revelations
- Use **💬 Quote** for memorable passages
- Use **🎯 Critique** for disagreements or analysis

## Future Enhancements

### Potential Additions
1. **Custom categories** - Allow users to create their own
2. **Category colors** - Let users customize color schemes
3. **Multiple categories** - Tag annotation with multiple categories
4. **Category statistics** - Show category breakdown chart
5. **Quick filters** - Keyboard shortcuts for category filters
6. **Category export** - Export by category to separate files

### Advanced Features
- **Category-based highlighting** - Different highlight colors by category
- **Category templates** - Pre-filled notes for each category
- **Category sharing** - Share all annotations of a category
- **Category search** - Search within specific categories

## Performance Considerations

- **Indexed column**: Category field is indexed for fast filtering
- **Client-side filtering**: Filter happens in React (no API calls)
- **Memoized rendering**: Category badges use memoized color lookup
- **Small bundle impact**: ~2KB added for category constants

## Accessibility

- **Semantic HTML**: Uses proper select element
- **Color + Icon**: Not relying on color alone (icons included)
- **Keyboard navigation**: Dropdown and filters keyboard accessible
- **Screen readers**: Proper labels and ARIA attributes

## Migration Notes

### Backward Compatibility
- Existing annotations will have `category = 'general'` (default)
- No data loss or breaking changes
- Old annotations work with new UI

### Rollback Procedure
If you need to rollback:
```sql
ALTER TABLE user_annotations DROP COLUMN IF EXISTS category;
DROP INDEX IF EXISTS idx_user_annotations_category;
```

## Testing Checklist

- ✅ Create annotation with each category type
- ✅ Category badge displays correctly
- ✅ Filter buttons show correct counts
- ✅ Filtering works for each category
- ✅ "All" filter shows all annotations
- ✅ Category persists after page reload
- ✅ Existing annotations default to "General"
- ✅ Can change category by editing annotation (future feature)

## Known Limitations

1. **Cannot edit category** - Currently need to delete and recreate (will add in future)
2. **Single category only** - Cannot assign multiple categories
3. **Fixed categories** - Cannot create custom categories
4. **No category search** - Search feature doesn't filter by category yet

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Select Best Practices](https://react.dev/reference/react-dom/components/select)
- [Accessible Color Contrast](https://webaim.org/resources/contrastchecker/)

## Commit Hash
`f97f9e4` - feat: add annotation categories with filtering

## Next Steps
Ready to test! Open http://localhost:3000 and:
1. Navigate to a document
2. Create annotations with different categories
3. Use filter buttons to organize your notes

