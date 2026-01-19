# Seeding Convergence Concepts - Quick Start Guide

This guide will help you populate the Convergence Graph with initial concepts and relationships.

## Prerequisites

1. **Migration 019 must be run** - The `convergence_concepts` and `convergence_relationships` tables must exist.
   - See `migrations/019_add_convergence_concepts.sql`
   - See `migrations/019_FIX_CONVERGENCE_CONCEPTS.md` for detailed instructions

2. **Environment variables configured** - Your `.env.local` must have:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Quick Start

### Option 1: Using the Seed Script (Recommended)

Run the seed script from the `app` directory:

```bash
cd app
pnpm seed:convergence
```

This will:
- ✅ Create 20 initial concepts across 4 clusters:
  - **Emptiness/Void**: Śūnyatā, Wu, Apophatic Theology, Zero-Point Field, Ain
  - **Unity/Oneness**: Brahman, Tawhid, The One, Unified Field Theory, Great Spirit
  - **Consciousness**: Atman, Buddha-nature, Soul, Self, Quantum Observer
  - **Path/Way**: Tao, Dharma, Logos, Sharia, Scientific Method
- ✅ Create 40+ relationships with similarity scores
- ✅ Skip concepts/relationships that already exist (safe to run multiple times)

### Option 2: Manual SQL Insert

If you prefer SQL, you can manually insert concepts via the Supabase SQL Editor:

```sql
-- Example: Add a concept
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
  '1st c. CE',
  'The absence of inherent existence; all phenomena are empty of self-nature.',
  ARRAY['Heart Sutra', 'Prajnaparamita Sutras'],
  ARRAY['metaphysics', 'consciousness', 'non-duality']
) RETURNING *;
```

## What Gets Seeded

### Concepts (20 total)

**Emptiness/Void Cluster:**
- Śūnyatā (Buddhist)
- Wu (Taoist)
- Apophatic Theology (Christian)
- Quantum Zero-Point Field (Scientific)
- Ain (Kabbalistic)

**Unity/Oneness Cluster:**
- Brahman (Vedantic)
- Tawhid (Islamic)
- The One (Neoplatonic)
- Unified Field Theory (Scientific)
- Great Spirit (Indigenous)

**Consciousness Cluster:**
- Atman (Hindu)
- Buddha-nature (Buddhist)
- Soul (Christian)
- Self (Psychological)
- Quantum Observer (Scientific)

**Path/Way Cluster:**
- Tao (Taoist)
- Dharma (Buddhist)
- Logos (Christian)
- Sharia (Islamic)
- Scientific Method (Scientific)

### Relationships (40+)

The seed script creates relationships with similarity scores (0-1) between concepts, including:
- **Intra-cluster connections**: Concepts within the same cluster (e.g., Śūnyatā ↔ Wu: 0.95)
- **Cross-cluster connections**: Concepts across clusters (e.g., Brahman ↔ Atman: 0.95)

## Verification

After seeding, verify the data:

1. **Check concepts count:**
   ```sql
   SELECT COUNT(*) FROM public.convergence_concepts;
   ```
   Should return 20 (or more if you've added others).

2. **Check relationships count:**
   ```sql
   SELECT COUNT(*) FROM public.convergence_relationships;
   ```
   Should return 40+ relationships.

3. **View in the app:**
   - Navigate to `/convergence-graph` in your app
   - You should see the network graph with nodes and connections
   - Try adjusting the similarity slider to filter relationships

## Troubleshooting

### "Table does not exist" error
- Run migration 019 first: `migrations/019_add_convergence_concepts.sql`
- See `migrations/019_FIX_CONVERGENCE_CONCEPTS.md` for step-by-step instructions

### "Missing environment variables" error
- Ensure `.env.local` exists in the project root
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- The service role key must be from the same Supabase project as the URL

### "No concepts found" in the UI
- Verify the seed script ran successfully
- Check the browser console for API errors
- Verify the API route `/api/concepts` returns data:
  ```bash
  curl http://localhost:3000/api/concepts
  ```

### Duplicate key errors
- The script handles duplicates gracefully (skips existing concepts/relationships)
- If you see duplicate errors, check that the `slug` field is unique

## Next Steps

After seeding:
1. **Explore the graph** - Use the similarity slider to see different connection strengths
2. **Filter by tradition** - Try filtering to see concepts from specific traditions
3. **Add more concepts** - Use the admin interface or API to add your own concepts
4. **Create relationships** - Connect concepts with similarity scores

## Adding Your Own Concepts

### Via API (if admin):
```bash
curl -X POST http://localhost:3000/api/concepts \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "name": "Your Concept",
    "slug": "your-concept",
    "tradition": "Your Tradition",
    "era": "Era",
    "short_definition": "Definition...",
    "primary_sources": ["Source 1", "Source 2"],
    "tags": ["tag1", "tag2"]
  }'
```

### Via SQL:
```sql
INSERT INTO public.convergence_concepts (
  slug, name, tradition, era, short_definition, primary_sources, tags
) VALUES (
  'your-concept',
  'Your Concept',
  'Your Tradition',
  'Era',
  'Definition...',
  ARRAY['Source 1', 'Source 2'],
  ARRAY['tag1', 'tag2']
) RETURNING *;
```

## Support

For more information:
- See `docs/CONVERGENCE_GRAPH_DATA_GUIDE.md` for detailed data structure
- See `docs/planning/PHASE_3_COMPLETION_PLAN.md` for the full feature plan
