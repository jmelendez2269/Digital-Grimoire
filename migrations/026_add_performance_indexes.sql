-- Migration 026: Add performance indexes for frequently queried columns
-- Part of caching strategy optimization (see docs/Setup Docs/CACHING_STRATEGY.md)

-- Index on texts.status for filtering by processing status
-- Used in API routes to filter ready/processing/error texts
CREATE INDEX IF NOT EXISTS idx_texts_status ON texts(status);

-- Index on texts.type (already exists as idx_texts_type from schema, but ensure it exists)
-- This is for filtering by document type in library queries
-- Note: Column was renamed from document_type to type in migration 003
CREATE INDEX IF NOT EXISTS idx_texts_type ON texts(type);

-- Index on convergence_concepts.name for name-based searches
-- Used in /api/concepts route for searching concepts by name
CREATE INDEX IF NOT EXISTS idx_convergence_concepts_name ON convergence_concepts(name);

-- Note: user_inventory table does not exist in current schema
-- If added in future, create: CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);

-- Success message
SELECT 'Performance indexes added successfully!' as message;

