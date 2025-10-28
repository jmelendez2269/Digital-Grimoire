-- ============================================================================
-- JOURNAL PAGES MIGRATION (SAFE VERSION)
-- Includes the helper function in case it doesn't exist
-- ============================================================================
-- Run this in Supabase SQL Editor to enable the Study Journal feature
-- ============================================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Journal pages table
CREATE TABLE IF NOT EXISTS journal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',
  parent_id UUID REFERENCES journal_pages(id) ON DELETE SET NULL,
  icon TEXT DEFAULT '📝',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_pages_user_id ON journal_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_pages_parent_id ON journal_pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_journal_pages_updated_at ON journal_pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_pages_created_at ON journal_pages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE journal_pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can view their own journal pages" ON journal_pages;
DROP POLICY IF EXISTS "Users can create their own journal pages" ON journal_pages;
DROP POLICY IF EXISTS "Users can update their own journal pages" ON journal_pages;
DROP POLICY IF EXISTS "Users can delete their own journal pages" ON journal_pages;

-- RLS Policies
CREATE POLICY "Users can view their own journal pages"
  ON journal_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal pages"
  ON journal_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal pages"
  ON journal_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal pages"
  ON journal_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_journal_pages_updated_at ON journal_pages;
CREATE TRIGGER update_journal_pages_updated_at
  BEFORE UPDATE ON journal_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE journal_pages IS 'Stores user journal pages with rich text content stored as Tiptap JSON';
COMMENT ON COLUMN journal_pages.content IS 'Tiptap document JSON format';
COMMENT ON COLUMN journal_pages.parent_id IS 'For nested/hierarchical pages (future feature)';
COMMENT ON COLUMN journal_pages.icon IS 'Emoji icon for the page';

