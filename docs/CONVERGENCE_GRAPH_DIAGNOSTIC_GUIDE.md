# Convergence Graph Diagnostic Guide

**Last Updated:** January 2026  
**Purpose:** Diagnose and fix database structure issues preventing the convergence graph from rendering

---

## Quick Start

### Option 1: API Diagnostic Endpoint (Recommended)

Visit this URL in your browser or use curl:

```bash
# Local development
curl http://localhost:3000/api/convergence/diagnose

# Or visit in browser
http://localhost:3000/api/convergence/diagnose
```

The endpoint returns JSON with:
- Table existence status
- Data counts
- Orphaned relationships
- Self-referential relationships
- Duplicate relationships
- Overall health status
- Recommendations for fixes

### Option 2: SQL Diagnostic Script

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `migrations/033_diagnose_convergence_graph.sql`
3. Click **Run**
4. Review the results for each check

---

## Common Issues and Fixes

### Issue 1: Tables Don't Exist

**Symptoms:**
- API returns "table does not exist" error
- Diagnostic shows `concepts_table_exists: false`

**Fix:**
```sql
-- Run Migration 019 in Supabase SQL Editor
-- File: migrations/019_add_convergence_concepts.sql
```

**Verification:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'convergence_concepts'
) as exists;
```

---

### Issue 2: Tables Exist But Empty

**Symptoms:**
- Diagnostic shows `concept_count: 0`
- Graph renders but shows no nodes

**Fix:**
1. Seed initial data using the seed script:
   ```bash
   cd app
   pnpm seed:convergence
   ```

2. Or manually add concepts via API:
   ```bash
   curl -X POST http://localhost:3000/api/concepts \
     -H "Content-Type: application/json" \
     -H "Cookie: your-auth-cookie" \
     -d '{
       "name": "Emptiness",
       "tradition": "Buddhist",
       "short_definition": "The absence of inherent existence"
     }'
   ```

3. See `docs/SEED_CONVERGENCE_GUIDE.md` for detailed seeding instructions

---

### Issue 3: Orphaned Relationships

**Symptoms:**
- Diagnostic shows `orphaned_count > 0`
- Relationships point to non-existent concepts
- Graph may show broken connections

**Fix:**

**Option A: Clean up orphaned relationships**
```sql
-- Remove orphaned relationships
DELETE FROM convergence_relationships r
WHERE NOT EXISTS (
  SELECT 1 FROM convergence_concepts c1 WHERE c1.id = r.source_id
) OR NOT EXISTS (
  SELECT 1 FROM convergence_concepts c2 WHERE c2.id = r.target_id
);
```

**Option B: Restore missing concepts**
- If concepts were accidentally deleted, restore them from backup
- Or recreate them via API/admin interface

**Prevention:**
- The new validation system prevents creating relationships to non-existent concepts
- Foreign key constraints prevent deletion of concepts with relationships (if CASCADE is not used)

---

### Issue 4: Self-Referential Relationships

**Symptoms:**
- Diagnostic shows `self_referential_count > 0`
- Relationships where `source_id === target_id`

**Fix:**
```sql
-- Remove self-referential relationships
DELETE FROM convergence_relationships
WHERE source_id = target_id;
```

**Prevention:**
- Client-side validation prevents selecting source entity as target
- API validation rejects self-referential relationships
- Database constraint can be added (see Migration 034)

---

### Issue 5: Missing Foreign Key Constraints

**Symptoms:**
- Diagnostic shows no foreign key constraints
- Data integrity issues possible

**Fix:**
```sql
-- Verify foreign keys exist (they should be created by Migration 019)
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'convergence_relationships'
  AND constraint_type = 'FOREIGN KEY';

-- If missing, add them:
ALTER TABLE convergence_relationships
ADD CONSTRAINT fk_source_concept
FOREIGN KEY (source_id) REFERENCES convergence_concepts(id) ON DELETE CASCADE;

ALTER TABLE convergence_relationships
ADD CONSTRAINT fk_target_concept
FOREIGN KEY (target_id) REFERENCES convergence_concepts(id) ON DELETE CASCADE;
```

---

### Issue 6: RLS Policies Blocking Access

**Symptoms:**
- API returns "permission denied" errors
- Diagnostic shows no RLS policies

**Fix:**
```sql
-- Enable RLS
ALTER TABLE convergence_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE convergence_relationships ENABLE ROW LEVEL SECURITY;

-- Add public read policy
CREATE POLICY "Public read access for convergence concepts"
ON convergence_concepts FOR SELECT
USING (true);

CREATE POLICY "Public read access for convergence relationships"
ON convergence_relationships FOR SELECT
USING (true);

-- Add admin write policies
CREATE POLICY "Admins can create convergence concepts"
ON convergence_concepts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## Diagnostic Output Interpretation

### Healthy Status

```json
{
  "status": "healthy",
  "summary": {
    "totalIssues": 0,
    "concepts": 20,
    "relationships": 40
  }
}
```

**Meaning:** Everything is working correctly!

---

### Warning Status

```json
{
  "status": "warning",
  "issues": [
    {
      "severity": "warning",
      "type": "no_relationships",
      "message": "No relationships found - graph will show isolated nodes"
    }
  ]
}
```

**Meaning:** Graph will work but may not be useful. Add relationships.

---

### Error Status

```json
{
  "status": "error",
  "issues": [
    {
      "severity": "error",
      "type": "orphaned_relationships",
      "message": "2 relationship(s) point to non-existent concepts"
    }
  ]
}
```

**Meaning:** Data integrity issue. Fix orphaned relationships before using graph.

---

### Critical Status

```json
{
  "status": "critical",
  "issues": [
    {
      "severity": "critical",
      "type": "missing_table",
      "message": "convergence_concepts table does not exist",
      "fix": "Run Migration 019: migrations/019_add_convergence_concepts.sql"
    }
  ]
}
```

**Meaning:** Tables don't exist. Run migration immediately.

---

## Prevention Measures

The following safeguards are now in place to prevent issues:

### 1. API Validation

- ✅ Verifies concepts exist before creating relationships
- ✅ Prevents self-referential relationships
- ✅ Validates similarity range (0-1)
- ✅ Checks for duplicate relationships
- ✅ Better error messages

### 2. Frontend Validation

- ✅ Prevents selecting source entity as target
- ✅ Validates similarity/weight ranges
- ✅ Shows helpful error messages
- ✅ Disables submit button when validation fails

### 3. Database Constraints

- ✅ Foreign key constraints (Migration 019)
- ✅ Unique constraint on (source_id, target_id)
- ✅ CHECK constraint on similarity (0-1)
- ⚠️ Optional: Self-referential prevention constraint (Migration 034)

---

## Running Diagnostics Regularly

### During Development

Run diagnostics after:
- Running migrations
- Seeding data
- Bulk imports
- Manual database changes

### Before Production Deployment

Always run diagnostics to ensure:
- Tables exist
- Data integrity is good
- No orphaned relationships
- RLS policies are configured

---

## Troubleshooting

### Diagnostic Endpoint Returns 500 Error

**Possible causes:**
- Supabase connection issue
- Service role key not configured
- Tables don't exist

**Fix:**
1. Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
2. Verify Supabase connection
3. Run Migration 019 if tables missing

### SQL Script Fails

**Possible causes:**
- Syntax error
- Missing permissions
- Tables don't exist

**Fix:**
1. Run Migration 019 first
2. Check you have admin access to Supabase
3. Run queries one section at a time

### Graph Still Not Rendering After Fixes

**Possible causes:**
- Frontend caching
- API errors
- Empty data

**Fix:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify API returns data: `GET /api/concepts`
4. Check network tab for failed requests

---

## Related Documentation

- `migrations/019_add_convergence_concepts.sql` - Creates tables
- `docs/SEED_CONVERGENCE_GUIDE.md` - How to seed initial data
- `docs/CONVERGENCE_GRAPH_DATA_GUIDE.md` - Data structure guide
- `app/src/lib/convergence/validation.ts` - Validation utilities

---

## Support

If diagnostics show issues you can't resolve:

1. Check the error message and recommended fix
2. Review related documentation
3. Check Supabase logs for detailed errors
4. Verify all migrations have been run
