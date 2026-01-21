-- Migration 025: Add AI Relevance Cache Table
-- Caches AI-scored concept relevance to reduce API costs

CREATE TABLE IF NOT EXISTS ai_relevance_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Cache key: hash of query + concept IDs
    cache_key TEXT NOT NULL UNIQUE,
    
    -- Query that was scored
    query TEXT NOT NULL,
    
    -- Concept IDs that were scored (for reference)
    concept_ids TEXT[] NOT NULL,
    
    -- Cached scores (JSON array of RelevanceScore objects)
    scores JSONB NOT NULL,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_ai_relevance_cache_key 
ON ai_relevance_cache(cache_key) 
WHERE expires_at > NOW();

-- Index for cleanup (expired entries)
CREATE INDEX IF NOT EXISTS idx_ai_relevance_cache_expires 
ON ai_relevance_cache(expires_at);

-- Index for query-based lookups
CREATE INDEX IF NOT EXISTS idx_ai_relevance_cache_query 
ON ai_relevance_cache(query);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM ai_relevance_cache
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'AI relevance cache table created successfully! ✅' as message;
