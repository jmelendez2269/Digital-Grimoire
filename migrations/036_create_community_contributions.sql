-- ============================================================================
-- MIGRATION: Create community_contributions table
-- Part of: Convergence Learning Loop - Phase 1
-- Stores anonymized user synthesis responses shared with the community
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_page_id UUID REFERENCES journal_pages(id) ON DELETE SET NULL,
  
  -- Course context
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  week_number INTEGER,
  
  -- Content (sanitized copy of the synthesis response)
  content JSONB NOT NULL,            -- Tiptap JSON content
  content_preview TEXT,              -- Plain text preview for listing (first ~200 chars)
  
  -- Privacy
  is_anonymous BOOLEAN DEFAULT true, -- Whether to show author info
  
  -- Moderation (future-proofing)
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE community_contributions ENABLE ROW LEVEL SECURITY;

-- Users can create their own contributions
DROP POLICY IF EXISTS "Users can create own contributions" ON community_contributions;
CREATE POLICY "Users can create own contributions"
  ON community_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view contributions (app logic enforces write-first-then-read gating)
DROP POLICY IF EXISTS "Users can view published contributions" ON community_contributions;
CREATE POLICY "Users can view published contributions"
  ON community_contributions FOR SELECT
  USING (status = 'published');

-- Users can delete their own contributions
DROP POLICY IF EXISTS "Users can delete own contributions" ON community_contributions;
CREATE POLICY "Users can delete own contributions"
  ON community_contributions FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all contributions (moderation)
DROP POLICY IF EXISTS "Admins can manage contributions" ON community_contributions;
CREATE POLICY "Admins can manage contributions"
  ON community_contributions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_community_contributions_course_week 
  ON community_contributions(course_id, week_number);
CREATE INDEX IF NOT EXISTS idx_community_contributions_user_id 
  ON community_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_contributions_status 
  ON community_contributions(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_community_contributions_created_at 
  ON community_contributions(created_at DESC);

-- Prevent duplicate contributions per user per course week
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_contribution_per_user_week
  ON community_contributions(user_id, course_id, week_number)
  WHERE course_id IS NOT NULL AND week_number IS NOT NULL;

-- Comments
COMMENT ON TABLE community_contributions IS 'Anonymized user synthesis responses shared with the community. Users must complete their own synthesis before viewing others (anti-anchoring).';
COMMENT ON COLUMN community_contributions.content IS 'Sanitized Tiptap JSON copy of the synthesis response';
COMMENT ON COLUMN community_contributions.content_preview IS 'Plain text preview of the content for listing views';
COMMENT ON COLUMN community_contributions.is_anonymous IS 'When true, author identity is hidden from other users';
COMMENT ON COLUMN community_contributions.status IS 'Moderation status: published (default), hidden, or flagged';
