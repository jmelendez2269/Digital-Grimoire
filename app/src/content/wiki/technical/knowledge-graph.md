---
title: Parallax Graph Data Seeding
type: guide
status: stable
audience: developer
description: Guide for seeding initial concepts and relationships into the Parallax Graph.
---

# Parallax Graph - Data Seeding Guide

**Last Updated:** December 2024  
**Status:** Ready for initial data seeding

---

## Overview

The Parallax Graph visualizes how concepts from different wisdom traditions converge and relate to each other. This guide shows you how to add your first concepts and relationships.

---

## Quick Start: Adding Your First Concept

### Method 1: Using the API (Recommended for Testing)

You can add concepts directly via the API if you're an admin:

```bash
# Add a concept
curl -X POST http://localhost:3000/api/concepts \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "name": "Emptiness",
    "slug": "emptiness",
    "tradition": "Buddhist",
    "era": "Ancient",
    "short_definition": "The absence of inherent existence; all phenomena are empty of self-nature.",
    "primary_sources": ["Heart Sutra", "Prajnaparamita Sutras"],
    "tags": ["metaphysics", "consciousness", "non-duality"]
  }'
```

### Method 2: Using Supabase SQL Editor

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run this query:

```sql
-- Add your first concept
INSERT INTO public.convergence_concepts (
  slug,
  name,
  tradition,
  era,
  short_definition,
  primary_sources,
  tags
) VALUES (
  'emptiness',
  'Emptiness',
  'Buddhist',
  'Ancient',
  'The absence of inherent existence; all phenomena are empty of self-nature.',
  ARRAY['Heart Sutra', 'Prajnaparamita Sutras'],
  ARRAY['metaphysics', 'consciousness', 'non-duality']
) RETURNING *;
```

---

## Adding Relationships Between Concepts

Once you have at least 2 concepts, you can connect them:

### Via API

```bash
# First, get the concept IDs from /api/concepts
# Then create a relationship
curl -X POST http://localhost:3000/api/concepts/relationships \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "sourceId": "uuid-of-first-concept",
    "targetId": "uuid-of-second-concept",
    "similarity": 0.85,
    "source_citation": "Comparative study by [Author Name], 2020",
    "notes": "Both concepts point to the fundamental void/non-being underlying reality"
  }'
```

### Via SQL

```sql
-- First, get the concept IDs
SELECT id, name FROM public.convergence_concepts;

-- Then create a relationship (replace UUIDs with actual IDs)
INSERT INTO public.convergence_relationships (
  source_id,
  target_id,
  similarity,
  source_citation,
  notes
) VALUES (
  'uuid-of-emptiness-concept',
  'uuid-of-void-concept',
  0.85,
  'Comparative study by [Author Name], 2020',
  'Both concepts point to the fundamental void/non-being underlying reality'
) RETURNING *;
```

---

## Example: The "Emptiness Cluster"

Here's a complete example seeding the classic convergence example:

### Step 1: Add the Concepts

```sql
-- Buddhist Emptiness
INSERT INTO public.convergence_concepts (slug, name, tradition, era, short_definition, primary_sources, tags)
VALUES (
  'emptiness-buddhist',
  'Emptiness (Śūnyatā)',
  'Buddhist',
  'Ancient',
  'The absence of inherent existence; all phenomena are empty of self-nature.',
  ARRAY['Heart Sutra', 'Prajnaparamita Sutras'],
  ARRAY['metaphysics', 'consciousness', 'non-duality']
);

-- Quantum Zero-Point
INSERT INTO public.convergence_concepts (slug, name, tradition, era, short_definition, primary_sources, tags)
VALUES (
  'zero-point-quantum',
  'Quantum Zero-Point Field',
  'Quantum',
  'Modern',
  'The lowest possible energy state of a quantum field; a vacuum that is not truly empty but contains fluctuations.',
  ARRAY['Quantum Field Theory', 'Vacuum Energy'],
  ARRAY['physics', 'quantum-mechanics', 'vacuum']
);

-- Christian Void
INSERT INTO public.convergence_concepts (slug, name, tradition, era, short_definition, primary_sources, tags)
VALUES (
  'void-christian',
  'The Void (Apophatic Theology)',
  'Christian',
  'Medieval',
  'The ineffable divine reality beyond all positive attributes; God as no-thing.',
  ARRAY['Pseudo-Dionysius', 'Meister Eckhart'],
  ARRAY['theology', 'mysticism', 'apophatic']
);

-- Taoist Wu
INSERT INTO public.convergence_concepts (slug, name, tradition, era, short_definition, primary_sources, tags)
VALUES (
  'wu-taoist',
  'Wu (無) - Non-Being',
  'Taoist',
  'Ancient',
  'The unmanifest source; that which is before form, the void from which all things emerge.',
  ARRAY['Tao Te Ching', 'Zhuangzi'],
  ARRAY['metaphysics', 'tao', 'non-being']
);
```

### Step 2: Create Relationships

```sql
-- Get the IDs (you'll need to run this first to get actual UUIDs)
-- SELECT id, name FROM public.convergence_concepts WHERE slug IN ('emptiness-buddhist', 'zero-point-quantum', 'void-christian', 'wu-taoist');

-- Buddhist Emptiness ↔ Quantum Zero-Point
INSERT INTO public.convergence_relationships (source_id, target_id, similarity, source_citation, notes)
SELECT 
  (SELECT id FROM public.convergence_concepts WHERE slug = 'emptiness-buddhist'),
  (SELECT id FROM public.convergence_concepts WHERE slug = 'zero-point-quantum'),
  0.75,
  'Capra, "The Tao of Physics" (1975)',
  'Both describe a fundamental void that is paradoxically full of potential'
WHERE NOT EXISTS (
  SELECT 1 FROM public.convergence_relationships 
  WHERE source_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'emptiness-buddhist')
    AND target_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'zero-point-quantum')
);

-- Buddhist Emptiness ↔ Christian Void
INSERT INTO public.convergence_relationships (source_id, target_id, similarity, source_citation, notes)
SELECT 
  (SELECT id FROM public.convergence_concepts WHERE slug = 'emptiness-buddhist'),
  (SELECT id FROM public.convergence_concepts WHERE slug = 'void-christian'),
  0.80,
  'Comparative mysticism studies',
  'Both point to a reality beyond conceptualization, a void that is paradoxically the source of all'
WHERE NOT EXISTS (
  SELECT 1 FROM public.convergence_relationships 
  WHERE source_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'emptiness-buddhist')
    AND target_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'void-christian')
);

-- Buddhist Emptiness ↔ Taoist Wu
INSERT INTO public.convergence_relationships (source_id, target_id, similarity, source_citation, notes)
SELECT 
  (SELECT id FROM public.convergence_concepts WHERE slug = 'emptiness-buddhist'),
  (SELECT id FROM public.convergence_concepts WHERE slug = 'wu-taoist'),
  0.85,
  'Historical Buddhist-Taoist dialogue in China',
  'Strong historical and conceptual overlap; both describe the unmanifest source'
WHERE NOT EXISTS (
  SELECT 1 FROM public.convergence_relationships 
  WHERE source_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'emptiness-buddhist')
    AND target_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'wu-taoist')
);

-- Quantum Zero-Point ↔ Christian Void
INSERT INTO public.convergence_relationships (source_id, target_id, similarity, source_citation, notes)
SELECT 
  (SELECT id FROM public.convergence_concepts WHERE slug = 'zero-point-quantum'),
  (SELECT id FROM public.convergence_concepts WHERE slug = 'void-christian'),
  0.70,
  'Polkinghorne, "Science and Theology" (1998)',
  'Modern physics and apophatic theology both point to a reality beyond positive description'
WHERE NOT EXISTS (
  SELECT 1 FROM public.convergence_relationships 
  WHERE source_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'zero-point-quantum')
    AND target_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'void-christian')
);

-- Quantum Zero-Point ↔ Taoist Wu
INSERT INTO public.convergence_relationships (source_id, target_id, similarity, source_citation, notes)
SELECT 
  (SELECT id FROM public.convergence_concepts WHERE slug = 'zero-point-quantum'),
  (SELECT id FROM public.convergence_concepts WHERE slug = 'wu-taoist'),
  0.75,
  'Capra, "The Tao of Physics" (1975)',
  'The quantum vacuum and the Taoist void both describe the unmanifest source of manifestation'
WHERE NOT EXISTS (
  SELECT 1 FROM public.convergence_relationships 
  WHERE source_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'zero-point-quantum')
    AND target_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'wu-taoist')
);

-- Christian Void ↔ Taoist Wu
INSERT INTO public.convergence_relationships (source_id, target_id, similarity, source_citation, notes)
SELECT 
  (SELECT id FROM public.convergence_concepts WHERE slug = 'void-christian'),
  (SELECT id FROM public.convergence_concepts WHERE slug = 'wu-taoist'),
  0.80,
  'Comparative mysticism',
  'Both describe the ineffable source beyond positive attributes'
WHERE NOT EXISTS (
  SELECT 1 FROM public.convergence_relationships 
  WHERE source_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'void-christian')
    AND target_id = (SELECT id FROM public.convergence_concepts WHERE slug = 'wu-taoist')
);
```

---

## Field Reference

### `convergence_concepts` Table (Internal Schema Name)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | text | ✅ Yes | URL-friendly identifier (unique) |
| `name` | text | ✅ Yes | Display name of the concept |
| `tradition` | text | ✅ Yes | Wisdom tradition (Buddhist, Christian, Taoist, Quantum, etc.) |
| `era` | text | ❌ No | Time period (Ancient, Medieval, Modern, etc.) |
| `short_definition` | text | ❌ No | Brief description (1-2 sentences) |
| `primary_sources` | text[] | ❌ No | Array of source texts/works |
| `tags` | text[] | ❌ No | Array of tags for filtering |

### `convergence_relationships` Table (Internal Schema Name)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_id` | uuid | ✅ Yes | ID of the source concept |
| `target_id` | uuid | ✅ Yes | ID of the target concept |
| `similarity` | numeric | ✅ Yes | Similarity score (0.0 to 1.0) |
| `source_citation` | text | ❌ No | Citation for the relationship |
| `notes` | text | ❌ No | Additional notes about the connection |

**Similarity Score Guidelines:**

- `0.9-1.0`: Nearly identical concepts
- `0.7-0.89`: Strong conceptual overlap
- `0.5-0.69`: Moderate similarity
- `0.3-0.49`: Weak connection
- `0.0-0.29`: Very weak or speculative

---

## Viewing Your Data

Once you've added concepts and relationships:

1. **Visit the Parallax Graph page:** `/parallax-graph`
2. **Use the controls:**
   - Adjust similarity threshold slider
   - Filter by tradition
   - Search by concept name
   - Toggle between Graph and Table views
3. **Click on nodes** in the graph to see concept details
4. **View relationships** in the comparative table

---

## Next Steps

1. **Seed the "Emptiness Cluster"** using the example above
2. **Add more concept clusters:**
   - Divine Unity (across traditions)
   - Consciousness concepts
   - Enlightenment/Awakening parallels
   - Karma/Cause-and-Effect
   - Sacred Geometry patterns
3. **Build out relationships** between clusters
4. **Add source citations** for scholarly rigor

---

## Tips

- **Start small:** Add 3-5 concepts first to see how they connect
- **Use meaningful similarity scores:** Be conservative; 0.7+ for strong connections
- **Include citations:** This adds scholarly value and credibility
- **Tag consistently:** Use consistent tags for filtering later
- **Unique slugs:** Make sure each concept has a unique slug

---

## Troubleshooting

**"No concepts found" message:**

- Make sure you've run the migration: `019_add_convergence_concepts.sql`
- Check that concepts exist in the database
- Verify your API routes are working: `/api/concepts`

**Graph not rendering:**

- Check browser console for errors
- Ensure D3.js is installed: `pnpm add d3 @types/d3`
- Verify concepts and relationships are loaded (check Network tab)

**API returns 403 Forbidden:**

- You need to be logged in as an admin to POST concepts
- Check your authentication status
- Verify RLS policies allow your user to read concepts

---

**Questions?** Check the main documentation or open an issue in the repository.
