-- ============================================================================
-- MIGRATION: Create daily_insights table
-- Part of: Convergence Learning Loop - Phase 1
-- Stores curated insight cards shown to users on login/dashboard
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  title TEXT NOT NULL,              -- Headline for the insight card
  hook TEXT NOT NULL,               -- The teaser/quote shown on the card
  
  -- Source linkage
  source_type TEXT CHECK (source_type IN (
    'blog',                         -- Links to a blog post
    'convergence_concept',          -- Links to a concept in the convergence system
    'text',                         -- Links to a library text
    'parallax_response'             -- Links to a notable Parallax Engine response
  )),
  source_id UUID,                   -- FK to the source content (polymorphic)
  
  -- Navigation helpers
  concept_search_terms JSONB DEFAULT '[]',  -- Suggested search terms for "Explore This"
  blog_slug TEXT,                           -- Direct link to blog post if applicable
  library_text_id UUID,                     -- Direct link to a library text if applicable
  
  -- Admin controls
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,  -- For manual ordering if needed
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;

-- Everyone can read active insights
DROP POLICY IF EXISTS "Public read access for daily_insights" ON daily_insights;
CREATE POLICY "Public read access for daily_insights" 
  ON daily_insights FOR SELECT 
  USING (is_active = true);

-- Only admins can manage insights (same pattern as other admin tables)
DROP POLICY IF EXISTS "Admins can manage daily_insights" ON daily_insights;
CREATE POLICY "Admins can manage daily_insights"
  ON daily_insights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_daily_insights_active ON daily_insights(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_daily_insights_source_type ON daily_insights(source_type);
CREATE INDEX IF NOT EXISTS idx_daily_insights_created_at ON daily_insights(created_at DESC);

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_daily_insights_updated_at ON daily_insights;
CREATE TRIGGER update_daily_insights_updated_at
  BEFORE UPDATE ON daily_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE daily_insights IS 'Curated insight cards shown on the dashboard. Each insight links to a source (blog, text, concept) and suggests exploration paths.';
COMMENT ON COLUMN daily_insights.hook IS 'The teaser text or quote shown on the insight card - should be compelling and concise';
COMMENT ON COLUMN daily_insights.concept_search_terms IS 'JSONB array of suggested search terms for the "Explore This" CTA';
