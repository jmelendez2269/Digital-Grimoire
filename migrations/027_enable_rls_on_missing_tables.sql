-- Migration 027: Enable Row Level Security on missing tables
-- Addresses security advisor warnings for tables exposed to PostgREST
-- All tables in the public schema that are exposed to PostgREST must have RLS enabled

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Text relationships (relationships between texts)
ALTER TABLE IF EXISTS text_relationships ENABLE ROW LEVEL SECURITY;

-- Import history (track imports by users)
ALTER TABLE IF EXISTS import_history ENABLE ROW LEVEL SECURITY;

-- Agent logs (for n8n agents and system operations)
ALTER TABLE IF EXISTS agent_logs ENABLE ROW LEVEL SECURITY;

-- Text chunks (chunked text with embeddings)
ALTER TABLE IF EXISTS text_chunks ENABLE ROW LEVEL SECURITY;

-- Convergence queries (user query history for rate limiting)
ALTER TABLE IF EXISTS convergence_queries ENABLE ROW LEVEL SECURITY;

-- Convergence responses (conversation history)
ALTER TABLE IF EXISTS convergence_responses ENABLE ROW LEVEL SECURITY;

-- Correspondences (ensure RLS is enabled, may already be enabled)
ALTER TABLE IF EXISTS correspondences ENABLE ROW LEVEL SECURITY;

-- Correspondence relationships (relationships between correspondences)
ALTER TABLE IF EXISTS correspondence_relationships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: TEXT RELATIONSHIPS
-- ============================================================================
-- Public read access (texts are public, so relationships should be too)
-- Authenticated users can create relationships
-- Admins can update/delete

DROP POLICY IF EXISTS "Public read access for text relationships" ON text_relationships;
CREATE POLICY "Public read access for text relationships"
ON text_relationships FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create text relationships" ON text_relationships;
CREATE POLICY "Authenticated users can create text relationships"
ON text_relationships FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update text relationships" ON text_relationships;
CREATE POLICY "Admins can update text relationships"
ON text_relationships FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete text relationships" ON text_relationships;
CREATE POLICY "Admins can delete text relationships"
ON text_relationships FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- RLS POLICIES: IMPORT HISTORY
-- ============================================================================
-- Users can only see their own import history
-- Admins can see all imports

DROP POLICY IF EXISTS "Users can view own import history" ON import_history;
CREATE POLICY "Users can view own import history"
ON import_history FOR SELECT
USING (
  imported_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can create own import history" ON import_history;
CREATE POLICY "Users can create own import history"
ON import_history FOR INSERT
TO authenticated
WITH CHECK (imported_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update import history" ON import_history;
CREATE POLICY "Admins can update import history"
ON import_history FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete import history" ON import_history;
CREATE POLICY "Admins can delete import history"
ON import_history FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- RLS POLICIES: AGENT LOGS
-- ============================================================================
-- Admin-only access (system/agent operations)

DROP POLICY IF EXISTS "Admins can view agent logs" ON agent_logs;
CREATE POLICY "Admins can view agent logs"
ON agent_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Service role can insert agent logs" ON agent_logs;
CREATE POLICY "Service role can insert agent logs"
ON agent_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to insert (for n8n agents using authenticated role)
DROP POLICY IF EXISTS "Authenticated can insert agent logs" ON agent_logs;
CREATE POLICY "Authenticated can insert agent logs"
ON agent_logs FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update agent logs" ON agent_logs;
CREATE POLICY "Admins can update agent logs"
ON agent_logs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete agent logs" ON agent_logs;
CREATE POLICY "Admins can delete agent logs"
ON agent_logs FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- RLS POLICIES: TEXT CHUNKS
-- ============================================================================
-- Public read access (texts are public, so chunks should be too)
-- Authenticated users can create chunks
-- Admins can update/delete

DROP POLICY IF EXISTS "Public read access for text chunks" ON text_chunks;
CREATE POLICY "Public read access for text chunks"
ON text_chunks FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create text chunks" ON text_chunks;
CREATE POLICY "Authenticated users can create text chunks"
ON text_chunks FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update text chunks" ON text_chunks;
CREATE POLICY "Admins can update text chunks"
ON text_chunks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete text chunks" ON text_chunks;
CREATE POLICY "Admins can delete text chunks"
ON text_chunks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- RLS POLICIES: CONVERGENCE QUERIES
-- ============================================================================
-- Users can only see their own queries (for rate limiting)
-- Admins can see all queries

DROP POLICY IF EXISTS "Users can view own convergence queries" ON convergence_queries;
CREATE POLICY "Users can view own convergence queries"
ON convergence_queries FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can create own convergence queries" ON convergence_queries;
CREATE POLICY "Users can create own convergence queries"
ON convergence_queries FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update convergence queries" ON convergence_queries;
CREATE POLICY "Admins can update convergence queries"
ON convergence_queries FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete convergence queries" ON convergence_queries;
CREATE POLICY "Admins can delete convergence queries"
ON convergence_queries FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- RLS POLICIES: CONVERGENCE RESPONSES
-- ============================================================================
-- Users can only see their own conversation history
-- Admins can see all responses

DROP POLICY IF EXISTS "Users can view own convergence responses" ON convergence_responses;
CREATE POLICY "Users can view own convergence responses"
ON convergence_responses FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can create own convergence responses" ON convergence_responses;
CREATE POLICY "Users can create own convergence responses"
ON convergence_responses FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own convergence responses" ON convergence_responses;
CREATE POLICY "Users can update own convergence responses"
ON convergence_responses FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own convergence responses" ON convergence_responses;
CREATE POLICY "Users can delete own convergence responses"
ON convergence_responses FOR DELETE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update any convergence responses" ON convergence_responses;
CREATE POLICY "Admins can update any convergence responses"
ON convergence_responses FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete any convergence responses" ON convergence_responses;
CREATE POLICY "Admins can delete any convergence responses"
ON convergence_responses FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- RLS POLICIES: CORRESPONDENCES
-- ============================================================================
-- Public read access (already exists, but ensure write policies exist)
-- Authenticated users can create correspondences
-- Admins can update/delete

-- Note: Public read policy may already exist from supabase-schema.sql
-- This will drop and recreate to ensure consistency

DROP POLICY IF EXISTS "Public read access for correspondences" ON correspondences;
CREATE POLICY "Public read access for correspondences"
ON correspondences FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create correspondences" ON correspondences;
CREATE POLICY "Authenticated users can create correspondences"
ON correspondences FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update correspondences" ON correspondences;
CREATE POLICY "Admins can update correspondences"
ON correspondences FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete correspondences" ON correspondences;
CREATE POLICY "Admins can delete correspondences"
ON correspondences FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- RLS POLICIES: CORRESPONDENCE RELATIONSHIPS
-- ============================================================================
-- Public read access (correspondences are public, so relationships should be too)
-- Authenticated users can create relationships
-- Admins can update/delete

DROP POLICY IF EXISTS "Public read access for correspondence relationships" ON correspondence_relationships;
CREATE POLICY "Public read access for correspondence relationships"
ON correspondence_relationships FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create correspondence relationships" ON correspondence_relationships;
CREATE POLICY "Authenticated users can create correspondence relationships"
ON correspondence_relationships FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update correspondence relationships" ON correspondence_relationships;
CREATE POLICY "Admins can update correspondence relationships"
ON correspondence_relationships FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete correspondence relationships" ON correspondence_relationships;
CREATE POLICY "Admins can delete correspondence relationships"
ON correspondence_relationships FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'RLS enabled and policies created for all missing tables! ✅' as message;
