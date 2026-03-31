-- ============================================================================
-- MIGRATION: Enhance journal_pages for Course Workbooks
-- Part of: Convergence Learning Loop - Phase 1
-- Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS patterns)
-- ============================================================================

-- Add course linkage columns (all nullable to preserve existing journal)
DO $$
BEGIN
  -- Link journal page to a specific course
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'journal_pages' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE journal_pages ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
  END IF;

  -- Link journal page to a specific week within a course
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'journal_pages' AND column_name = 'week_number'
  ) THEN
    ALTER TABLE journal_pages ADD COLUMN week_number INTEGER;
  END IF;

  -- Entry type: 'free' (default, existing behavior), 'lens_exercise', 'synthesis', 'note', 'capstone'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'journal_pages' AND column_name = 'entry_type'
  ) THEN
    ALTER TABLE journal_pages ADD COLUMN entry_type TEXT DEFAULT 'free';
  END IF;

  -- The name of the micro-artifact (e.g. "Truth Inventory") from the course definition
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'journal_pages' AND column_name = 'artifact_name'
  ) THEN
    ALTER TABLE journal_pages ADD COLUMN artifact_name TEXT;
  END IF;

  -- User-defined tags for cross-referencing (JSONB array: ["truth", "symbols", "alchemy"])
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'journal_pages' AND column_name = 'tags'
  ) THEN
    ALTER TABLE journal_pages ADD COLUMN tags JSONB DEFAULT '[]';
  END IF;

  -- Pin important entries to the top of the journal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'journal_pages' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE journal_pages ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add constraint for entry_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'journal_pages_entry_type_check'
  ) THEN
    ALTER TABLE journal_pages ADD CONSTRAINT journal_pages_entry_type_check
      CHECK (entry_type IN ('free', 'lens_exercise', 'synthesis', 'note', 'capstone'));
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_journal_pages_course_id ON journal_pages(course_id);
CREATE INDEX IF NOT EXISTS idx_journal_pages_entry_type ON journal_pages(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_pages_is_pinned ON journal_pages(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_journal_pages_tags ON journal_pages USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_journal_pages_course_week ON journal_pages(course_id, week_number) 
  WHERE course_id IS NOT NULL;

-- Helpful comments
COMMENT ON COLUMN journal_pages.course_id IS 'Links this journal page to a specific course for workbook functionality';
COMMENT ON COLUMN journal_pages.week_number IS 'The week number within the linked course';
COMMENT ON COLUMN journal_pages.entry_type IS 'Type of entry: free (default), lens_exercise, synthesis, note, or capstone';
COMMENT ON COLUMN journal_pages.artifact_name IS 'Name of the micro-artifact from the course definition (e.g. Truth Inventory)';
COMMENT ON COLUMN journal_pages.tags IS 'User-defined tags as JSONB array for cross-referencing themes';
COMMENT ON COLUMN journal_pages.is_pinned IS 'Whether this entry is pinned to the top of the journal view';
