-- Library Performance Optimization: Add indexes for frequently searched columns
-- Created: 2026-02-17
-- Purpose: Speed up library page loading and search operations

-- 1. Add B-tree index on title for fast sorting and prefix matching
CREATE INDEX IF NOT EXISTS idx_texts_title ON texts(title);

-- 2. Add B-tree index on author for fast sorting and filtering
CREATE INDEX IF NOT EXISTS idx_texts_author ON texts(author);

-- 3. Add B-tree index on domain for filtering
CREATE INDEX IF NOT EXISTS idx_texts_domain ON texts(domain);

-- 4. Add B-tree index on type for filtering
CREATE INDEX IF NOT EXISTS idx_texts_type ON texts(type);

-- 5. Add B-tree index on year for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_texts_year ON texts(year);

-- 6. Add B-tree index on created_at for sorting (most common sort)
CREATE INDEX IF NOT EXISTS idx_texts_created_at ON texts(created_at DESC);

-- 7. Add GIN index on title for fast case-insensitive search using trigrams
-- This requires the pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_texts_title_trgm ON texts USING GIN(title gin_trgm_ops);

-- 8. Add GIN index on author for fast case-insensitive search using trigrams
CREATE INDEX IF NOT EXISTS idx_texts_author_trgm ON texts USING GIN(author gin_trgm_ops);

-- 9. Add composite index for common query patterns (domain + created_at)
CREATE INDEX IF NOT EXISTS idx_texts_domain_created_at ON texts(domain, created_at DESC);

-- 10. Add composite index for type filtering with sorting
CREATE INDEX IF NOT EXISTS idx_texts_type_created_at ON texts(type, created_at DESC);

-- Comments for documentation
COMMENT ON INDEX idx_texts_title IS 'Speeds up title-based sorting and exact matches';
COMMENT ON INDEX idx_texts_author IS 'Speeds up author-based sorting and exact matches';
COMMENT ON INDEX idx_texts_domain IS 'Speeds up domain filtering';
COMMENT ON INDEX idx_texts_type IS 'Speeds up type filtering';
COMMENT ON INDEX idx_texts_year IS 'Speeds up year-based filtering and sorting';
COMMENT ON INDEX idx_texts_created_at IS 'Speeds up default sort by creation date';
COMMENT ON INDEX idx_texts_title_trgm IS 'Enables fast case-insensitive partial matching on title';
COMMENT ON INDEX idx_texts_author_trgm IS 'Enables fast case-insensitive partial matching on author';
COMMENT ON INDEX idx_texts_domain_created_at IS 'Optimizes domain filtering with date sorting';
COMMENT ON INDEX idx_texts_type_created_at IS 'Optimizes type filtering with date sorting';
