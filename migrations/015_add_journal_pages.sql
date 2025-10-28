-- Migration: Add Journal Pages
-- Description: Creates the journal_pages table for the Study Journal feature
-- Author: Digital Grimoire Development Team
-- Date: 2025-10-28

-- Journal pages table
CREATE TABLE journal_pages (
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
CREATE INDEX idx_journal_pages_user_id ON journal_pages(user_id);
CREATE INDEX idx_journal_pages_parent_id ON journal_pages(parent_id);
CREATE INDEX idx_journal_pages_updated_at ON journal_pages(updated_at DESC);
CREATE INDEX idx_journal_pages_created_at ON journal_pages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE journal_pages ENABLE ROW LEVEL SECURITY;

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
-- Note: Assumes update_updated_at_column() function exists from previous migrations
CREATE TRIGGER update_journal_pages_updated_at
  BEFORE UPDATE ON journal_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE journal_pages IS 'Stores user journal pages with rich text content stored as Tiptap JSON';
COMMENT ON COLUMN journal_pages.content IS 'Tiptap document JSON format';
COMMENT ON COLUMN journal_pages.parent_id IS 'For nested/hierarchical pages (future feature)';
COMMENT ON COLUMN journal_pages.icon IS 'Emoji icon for the page';

