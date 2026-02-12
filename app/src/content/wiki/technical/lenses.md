---
title: The 7 Parallax Lenses
type: architecture
status: stable
audience: developer
description: Technical specification for the 7 Lenses feature and tagging system.
---

# The 7 Parallax Lenses Feature

**Date:** October 26, 2025  
**Status:** ✅ Implemented  
**Version:** 1.0

## Overview

The 7 Parallax Lenses feature connects the Library with The Parallax Engine by tagging each document with the perspectives through which it can be understood. This enables users to filter the library by perspective and creates a foundation for the AI reasoning system.

## The 7 Lenses

Each lens represents a distinct perspective for understanding knowledge:

### 1. Scientific

**ID:** `scientific`  
**Description:** Physics, biology, cosmology, empirical evidence, natural sciences  
**Examples:** Documents on quantum physics, evolutionary biology, cosmology, neuroscience

### 2. Psychological

**ID:** `psychological`  
**Description:** Jungian archetypes, cognitive science, shadow work, depth psychology  
**Examples:** Works on Jung's theories, cognitive behavioral approaches, shadow integration, archetypes

### 3. Philosophical

**ID:** `philosophical`  
**Description:** Metaphysics, ethics, epistemology, ontology, philosophical inquiry  
**Examples:** Texts on being and existence, ethical systems, nature of knowledge, reality

### 4. Religious/Spiritual

**ID:** `religious_spiritual`  
**Description:** Comparative theology, mysticism, sacred texts, spiritual practices  
**Examples:** Sacred scriptures, mystical experiences, spiritual practices, theological discussions

### 5. Historical/Anthropological

**ID:** `historical_anthropological`  
**Description:** Cultural evolution, mythology, ritual context, human history  
**Examples:** Historical analyses, cultural studies, mythological texts, anthropological research

### 6. Symbolic/Occult

**ID:** `symbolic_occult`  
**Description:** Correspondences, alchemy, astrology, esoteric symbolism  
**Examples:** Alchemical texts, astrological charts, correspondence tables, tarot systems

### 7. Mathematical

**ID:** `mathematical`  
**Description:** Sacred geometry, numerology, patterns, universal ratios  
**Examples:** Sacred geometry, mathematical mysticism, numerological systems, geometric patterns

## Document Lens Assignment

### AI-Powered Classification

When a document is uploaded and processed, OpenAI GPT-4o analyzes the content and assigns applicable lenses based on:

1. **Content Analysis:** The AI examines the OCR text to identify themes and approaches
2. **Multi-Lens Selection:** Most documents receive 2-4 lenses (not just one)
3. **Primary Perspectives:** Lenses are chosen based on the document's core perspectives

### Example Classifications

**"The Alchemical Tradition" by X. Scholar**

- Lenses: `symbolic_occult`, `philosophical`, `historical_anthropological`
- Reasoning: Discusses alchemical symbolism (symbolic), philosophical implications (philosophical), and historical development (historical)

**"Jungian Psychology and Archetypes"**

- Lenses: `psychological`, `philosophical`, `symbolic_occult`
- Reasoning: Core psychological theory (psychological), philosophical frameworks (philosophical), archetypal symbolism (symbolic)

**"Sacred Geometry: The Divine Ratio"**

- Lenses: `mathematical`, `symbolic_occult`, `philosophical`
- Reasoning: Mathematical patterns (mathematical), symbolic meaning (symbolic), philosophical significance (philosophical)

**"The Bhagavad Gita"**

- Lenses: `religious_spiritual`, `philosophical`, `historical_anthropological`
- Reasoning: Sacred text (religious), deep philosophy (philosophical), cultural context (historical)

## Database Schema

### Migration 007

```sql
-- Add lenses column as text array
ALTER TABLE texts
ADD COLUMN IF NOT EXISTS lenses TEXT[] DEFAULT '{}';

-- Constraint to ensure only valid lenses
ALTER TABLE texts
ADD CONSTRAINT valid_lenses CHECK (
  lenses <@ ARRAY[
    'scientific',
    'psychological', 
    'philosophical',
    'religious_spiritual',
    'historical_anthropological',
    'symbolic_occult',
    'mathematical'
  ]::TEXT[]
);

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_texts_lenses ON texts USING GIN (lenses);
```

### Storage Format

Lenses are stored as a PostgreSQL text array:

```sql
-- Example document entry
{
  "id": "uuid-here",
  "title": "The Secret Doctrine",
  "lenses": ["symbolic_occult", "philosophical", "historical_anthropological"],
  ...
}
```

## User Interface

### Advanced Filters Component

The lens filter appears in the Advanced Filters panel with:

1. **Multi-select dropdown** - Users can select multiple lenses simultaneously
2. **Lens descriptions** - Each lens shows its focus area
3. **Selected lens tags** - Active filters display as removable badges
4. **Filter count** - Shows total active filters including lenses

### Filter Experience

```
Parallax Lenses (The 7 perspectives)
[Dropdown: Select lenses...]

When expanded:
☐ Scientific - Physics, biology, cosmology, empirical evidence
☐ Psychological - Jungian archetypes, cognitive science, shadow work
☐ Philosophical - Metaphysics, ethics, epistemology, ontology
☑ Religious / Spiritual - Comparative theology, mysticism, sacred texts
☐ Historical / Anthropological - Cultural evolution, mythology, ritual context
☑ Symbolic / Occult - Correspondences, alchemy, astrology, esoteric systems
☐ Mathematical - Sacred geometry, numerology, patterns, universal ratios

Selected: [Religious / Spiritual ×] [Symbolic / Occult ×]
```

### Library Filtering

Users can filter documents by:

- **Single lens:** "Show me all psychological texts"
- **Multiple lenses:** "Show me texts that combine philosophical and symbolic perspectives"
- **Combined filters:** Lenses + domain + type + year range + tags

The filter uses PostgreSQL's `overlaps` operator to match documents with any selected lens.

## Technical Implementation

### Files Modified

1. **Migration:** `migrations/007_add_lenses_to_texts.sql`
2. **Metadata Extraction:** `app/src/lib/claude-metadata.ts`
3. **UI Component:** `app/src/components/AdvancedFilters.tsx`
4. **Library Page:** `app/src/app/library/page.tsx`
5. **Processing Route:** `app/src/app/api/process-document/route.ts`

### Code Flow

```
1. User uploads document
   ↓
2. OCR extracts text (Azure Computer Vision)
   ↓
3. AI analyzes and classifies (OpenAI GPT-4o)
   → Extracts metadata
   → Assigns 2-4 applicable lenses
   ↓
4. Save to database (Supabase)
   → lenses: TEXT[] column
   ↓
5. User can filter by lenses
   → Library page queries with overlaps
   → Shows matching documents
```

### Query Example

```typescript
// Filter documents by multiple lenses
if (filterValues.lenses.length > 0) {
  query = query.overlaps('lenses', filterValues.lenses);
}

// Example: Find documents with "philosophical" OR "symbolic_occult"
// Returns: Documents that have at least one of these lenses
```

## Use Cases

### For Researchers

**Scenario:** "I want to explore psychological interpretations of spiritual texts"

**Solution:**

1. Select lenses: `psychological` + `religious_spiritual`
2. View documents that bridge both perspectives
3. Discover cross-domain connections

### For Practitioners

**Scenario:** "I need practical texts on symbolic systems with mathematical foundations"

**Solution:**

1. Select lenses: `symbolic_occult` + `mathematical`
2. Find texts on sacred geometry, numerology, correspondences
3. Filter further by tags (e.g., "qabalah", "astrology")

### For Scholars

**Scenario:** "Research the historical and philosophical evolution of alchemy"

**Solution:**

1. Select lenses: `historical_anthropological` + `philosophical` + `symbolic_occult`
2. Filter by domain: "alchemy"
3. Sort by year to see chronological development

## Connection to The Parallax Engine

The lenses feature creates a foundation for The Parallax Engine (Phase 4):

### Future Integration

1. **Lens-Weighted Retrieval:** When users query The Parallax Engine and adjust lens weights, the system can prioritize documents tagged with those lenses

2. **Perspective-Aware Search:** "Ask from a psychological perspective" → retrieves documents tagged with `psychological` lens

3. **Cross-Lens Synthesis:** The AI can synthesize answers by pulling from documents across multiple lens categories

4. **Lens Coverage Analysis:** Show users which lenses are represented in their search results

### Roadmap Connection

**Current (Phase 1):** ✅ Document tagging with lenses  
**Phase 4:** AI queries reference lens-tagged documents  
**Phase 5:** Community can suggest lens assignments  
**Phase 6:** Advanced lens analytics and recommendations

## Testing

### Test the Feature

1. **Upload a document** with varied content (e.g., a book on Jungian archetypes)
2. **Check the console logs** to see AI's lens assignment
3. **View the document** in the library - lenses should be saved
4. **Use Advanced Filters** to filter by lens
5. **Verify results** show only documents with selected lenses

### Example Test Cases

**Test 1: Single Lens Filter**

- Upload 3 documents with different lenses
- Filter by `psychological`
- Should show only documents with `psychological` lens

**Test 2: Multi-Lens Filter**

- Select `philosophical` + `symbolic_occult`
- Should show documents that have EITHER lens (OR logic)

**Test 3: Combined Filters**

- Filter by lens + domain + year range
- Should show documents matching ALL criteria (AND logic)

## Best Practices

### For Content Curators

1. **Review AI assignments:** Check that lenses match document content
2. **Add missing lenses:** If AI missed a relevant perspective
3. **Remove incorrect lenses:** If AI assigned an inappropriate lens
4. **Maintain consistency:** Similar documents should have similar lens assignments

### For Users

1. **Start broad:** Begin with 1-2 lenses to see what's available
2. **Refine gradually:** Add more filters as needed
3. **Combine perspectives:** Use multiple lenses to discover cross-domain insights
4. **Save favorite combinations:** (Future feature) Save lens presets for common searches

## Future Enhancements

### Potential Improvements

1. **Manual lens editing:** Allow admins to adjust lens assignments
2. **Lens confidence scores:** Show AI's confidence for each lens assignment
3. **Lens suggestions:** Recommend related lenses based on current selection
4. **Lens coverage analytics:** Show distribution of lenses across library
5. **Lens-based recommendations:** "Documents similar to this lens combination"
6. **Community lens voting:** Let users vote on appropriate lenses
7. **Lens presets:** Save and share common lens filter combinations
8. **Lens explanations:** Show why AI chose specific lenses for a document

## Troubleshooting

### Lenses Not Appearing

**Issue:** Uploaded documents have empty lenses array

**Possible Causes:**

- OpenAI API key not configured
- AI prompt not including lenses instruction
- Database migration not run

**Solutions:**

1. Check `OPENAI_API_KEY` in `.env.local`
2. Run migration `007_add_lenses_to_texts.sql`
3. Verify AI prompt includes lenses extraction
4. Check console logs for AI response

### Filter Not Working

**Issue:** Selecting lenses doesn't filter results

**Possible Causes:**

- Query not applying lens filter
- Frontend not passing lenses to query
- Database index not created

**Solutions:**

1. Verify `overlaps` query is applied when lenses selected
2. Check browser console for filter state
3. Run migration to create GIN index
4. Test query directly in Supabase SQL editor

## Related Documentation

- **Feature Backlog:** `docs/planning/FEATURE_BACKLOG.md` - Lens weight sliders (Phase 4)
- **Branding:** `docs/BRANDING.md` - The 7 lenses definitions
- **Technical Plan:** `docs/source/Complete_Technical_Implementation_Plan.md` - Parallax Engine
- **Library Features:** `docs/LIBRARY_FEATURES.md` - Advanced filtering system

---

**Last Updated:** October 26, 2025  
**Status:** Production Ready  
**Next Steps:** Test with real documents, gather user feedback on lens assignments
