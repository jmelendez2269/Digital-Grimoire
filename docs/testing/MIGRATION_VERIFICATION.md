# Database Migration Verification Guide

**Version:** 1.0  
**Date:** October 31, 2025  
**Purpose:** Verify all database migrations are properly applied

---

## Overview

This document provides SQL queries and procedures to verify that all database migrations for the Digital Grimoire project have been successfully applied to your Supabase database.

---

## Quick Verification

### Check All Public Tables

Run this query in Supabase SQL Editor to see all tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables (minimum):**
- `annotations`
- `collections`
- `collection_items`
- `convergence_concepts`
- `convergence_relationships`
- `correspondences`
- `correspondence_relationships`
- `journal_pages`
- `reading_positions`
- `texts`
- `user_annotations`
- `user_bookmarks`
- `user_profiles`
- `usage_tracking`

---

## Migration Checklist

### ✅ Migration 002: User Profiles Auto-creation

**File:** `002_auto_create_user_profiles.sql`

**Purpose:** Automatically create user profiles when users sign up

**Verification:**
```sql
-- Check if user_profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
);
```

**Expected Result:** `true`

**Additional Check:**
```sql
-- Check for trigger function
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%user_profile%';
```

---

### ✅ Migration 003: Texts Table S3 Fields

**File:** `003_update_texts_table_for_s3.sql`

**Purpose:** Add S3/R2 storage fields to texts table

**Verification:**
```sql
-- Check for S3 columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'texts' 
AND column_name IN ('file_path', 's3_key', 'storage_provider');
```

**Expected Result:** All 3 columns should be listed

---

### ✅ Migration 004: Texts RLS Policies

**File:** `004_add_texts_rls_policies.sql`

**Purpose:** Add Row Level Security policies to texts table

**Verification:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'texts';
```

**Expected Result:** `rowsecurity` should be `true`

**Check Policies:**
```sql
-- List all policies on texts table
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'texts';
```

---

### ✅ Migration 005: Texts Table Constraints

**File:** `005_fix_texts_table_constraints.sql`

**Purpose:** Fix and add proper constraints

**Verification:**
```sql
-- Check constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'texts' 
AND table_schema = 'public';
```

---

### ✅ Migration 006: Summary Columns

**File:** `006_add_summary_columns.sql`

**Purpose:** Add summary and curator note fields

**Verification:**
```sql
-- Check for summary columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'texts' 
AND column_name IN ('summary', 'curator_note', 'brief_summary');
```

**Expected Result:** 3 columns (text type)

---

### ✅ Migration 007: Lenses to Texts

**File:** `007_add_lenses_to_texts.sql`

**Purpose:** Add 7 Convergence Lenses classification

**Verification:**
```sql
-- Check for lenses column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'texts' 
AND column_name = 'lenses';
```

**Expected Result:** `lenses` column exists (text array type)

---

### ✅ Migration 008: Library Features

**File:** `008_add_library_features.sql`

**Purpose:** Add reading progress, collections, annotations

**Verification:**
```sql
-- Check for library feature tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('collections', 'collection_items', 'user_bookmarks');
```

**Expected Result:** All 3 tables exist

---

### ✅ Migration 009: Annotations Table

**File:** `009_add_annotations_table.sql`

**Purpose:** User annotations on texts

**Verification:**
```sql
-- Check annotations table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_annotations'
);

-- Check key columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_annotations' 
AND column_name IN ('quote_text', 'note', 'page_number', 'position_data');
```

**Expected Result:** Table exists with all columns

---

### ✅ Migration 010: Usage Tracking

**File:** `010_add_usage_tracking.sql`

**Purpose:** Track API usage and costs

**Verification:**
```sql
-- Check usage_tracking table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'usage_tracking'
);

-- Check columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'usage_tracking' 
AND column_name IN ('service', 'operation', 'cost_usd', 'user_id');
```

**Expected Result:** Table exists with tracking columns

---

### ✅ Migration 011: Top Users Function

**File:** `011_add_top_users_function.sql`

**Purpose:** Function to get top users by usage

**Verification:**
```sql
-- Check for function
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_top_users';
```

**Expected Result:** Function exists

---

### ⚠️ Migration 012: Reading Positions (TTS)

**File:** `012_add_reading_positions.sql`

**Purpose:** Store TTS reading positions and preferences

**Verification:**
```sql
-- Check reading_positions table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'reading_positions'
);

-- Check tts_preferences column in users
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_name = 'users' 
  AND column_name = 'tts_preferences'
);
```

**Expected Result:** Both should return `true`

**Critical for:** Text-to-Speech feature

---

### ✅ Migration 013: Annotation Categories

**File:** `013_add_annotation_categories.sql`

**Purpose:** Add categories to annotations

**Verification:**
```sql
-- Check for category column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_annotations' 
AND column_name = 'category';
```

**Expected Result:** `category` column exists (text type)

---

### ✅ Migration 014: Highlight Colors

**File:** `014_add_highlight_colors.sql` (or `014_add_highlight_color.sql`)

**Purpose:** Add customizable highlight colors

**Verification:**
```sql
-- Check for highlight_color column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_annotations' 
AND column_name = 'highlight_color';
```

**Expected Result:** `highlight_color` column exists

---

### ✅ Migration 015: Journal Pages

**File:** `015_add_journal_pages.sql` (or `015_add_journal_pages_SAFE.sql`)

**Purpose:** Personal journal/grimoire pages

**Verification:**
```sql
-- Check journal_pages table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'journal_pages'
);

-- Check key columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'journal_pages' 
AND column_name IN ('title', 'content', 'slug', 'parent_id', 'user_id');
```

**Expected Result:** Table exists with all columns

**Critical for:** Study Journal, WikiLinks, Backlinks, Export features

---

### ✅ Migration 016: Annotation FTS

**File:** `016_add_annotation_fts.sql`

**Purpose:** Full-text search for annotations

**Verification:**
```sql
-- Check for tsvector column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_annotations' 
AND column_name = 'search_vector';

-- Check for GIN index
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'user_annotations' 
AND indexname LIKE '%search_vector%';
```

**Expected Result:** Column and index exist

---

### ✅ Migration 017: Cover Source

**File:** `017_add_cover_source.sql`

**Purpose:** Track source of book covers

**Verification:**
```sql
-- Check for cover_source column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'texts' 
AND column_name = 'cover_source';
```

**Expected Result:** `cover_source` column exists

**Critical for:** Book Cover System

---

### ⚠️ Migration 018: Correspondences

**File:** `018_add_correspondences.sql`

**Purpose:** Phase 3A - Correspondence graph tables

**Verification:**
```sql
-- Check correspondences table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('correspondences', 'correspondence_relationships');

-- Check category constraint
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'correspondences' 
AND constraint_type = 'CHECK';
```

**Expected Result:** Both tables exist with constraints

**Critical for:** Phase 3A - Correspondence Graph

---

### ⚠️ Migration 019: Convergence Concepts

**File:** `019_add_convergence_concepts.sql`

**Purpose:** Phase 3B - Convergence concepts tables

**Verification:**
```sql
-- Check convergence tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('convergence_concepts', 'convergence_relationships');

-- Check columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'convergence_concepts' 
AND column_name IN ('tradition', 'short_definition', 'primary_sources');
```

**Expected Result:** Both tables exist with all columns

**Critical for:** Phase 3B - Convergence Graph

---

## Complete Verification Script

Run this comprehensive check to verify all migrations:

```sql
-- Comprehensive migration verification
DO $$
DECLARE
  tables_count INT;
  expected_tables TEXT[] := ARRAY[
    'users', 'user_profiles', 'texts', 'annotations', 'user_annotations',
    'collections', 'collection_items', 'user_bookmarks', 'reading_positions',
    'journal_pages', 'usage_tracking', 'correspondences', 
    'correspondence_relationships', 'convergence_concepts', 
    'convergence_relationships'
  ];
  missing_tables TEXT[];
BEGIN
  -- Check each expected table
  SELECT COUNT(*), ARRAY_AGG(table_name) 
  INTO tables_count, missing_tables
  FROM unnest(expected_tables) AS table_name
  WHERE NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND information_schema.tables.table_name = unnest.table_name
  );
  
  IF tables_count > 0 THEN
    RAISE NOTICE 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All expected tables exist!';
  END IF;
  
  -- Check key columns
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'texts' AND column_name = 'lenses'
  ) THEN
    RAISE NOTICE 'Missing: texts.lenses (Migration 007)';
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'reading_positions'
  ) THEN
    RAISE NOTICE 'Missing: reading_positions table (Migration 012)';
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'user_annotations' AND column_name = 'search_vector'
  ) THEN
    RAISE NOTICE 'Missing: user_annotations.search_vector (Migration 016)';
  END IF;
  
  RAISE NOTICE 'Verification complete. Check notices above for any missing migrations.';
END $$;
```

---

## Troubleshooting

### Migration Failed to Apply

1. **Check syntax errors:** Review the migration file for SQL syntax issues
2. **Check dependencies:** Some migrations depend on previous ones
3. **Check permissions:** Ensure you have admin access to Supabase
4. **Check existing objects:** Some migrations fail if objects already exist

### How to Re-run a Migration

1. In Supabase SQL Editor, paste the migration SQL
2. If it fails with "already exists" errors, you may need to modify the SQL to use `IF NOT EXISTS` clauses
3. For the SAFE versions (like `015_add_journal_pages_SAFE.sql`), use those if available

### Rollback a Migration

⚠️ **Warning:** Rolling back migrations can cause data loss!

```sql
-- Example: Drop a table (use with caution)
DROP TABLE IF EXISTS reading_positions CASCADE;

-- Example: Drop a column (use with caution)
ALTER TABLE texts DROP COLUMN IF EXISTS lenses;
```

Always backup your database before rolling back migrations.

---

## Testing Checklist

After verifying migrations, test the features:

- [ ] All expected tables exist
- [ ] No missing columns for P1 features
- [ ] RLS policies are enabled on sensitive tables
- [ ] Indexes are created (check with `\d tablename` in psql)
- [ ] Constraints are in place
- [ ] Functions and triggers exist

**Next:** Proceed to [Feature Testing Checklist](./SPRINT_5_TESTING_CHECKLIST.md)

---

## References

- [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
- [PostgreSQL Information Schema](https://www.postgresql.org/docs/current/information-schema.html)
- [Migration Files](../../migrations/)
- [Feature Testing](./SPRINT_5_TESTING_CHECKLIST.md)

---

**Last Updated:** October 31, 2025  
**Maintained By:** Digital Grimoire Development Team

