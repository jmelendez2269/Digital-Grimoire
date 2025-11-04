-- Migration 021: Convergence Machine Schema
-- Adds tables for chunked embeddings, rate limiting, and conversation history

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify texts.embedding column exists (from supabase-schema.sql)
-- If missing, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'texts' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE texts ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Add index on texts.embedding if missing
CREATE INDEX IF NOT EXISTS idx_texts_embedding 
ON texts USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- Text chunks table for storing chunked text with embeddings
-- This allows us to search large texts that exceed token limits
CREATE TABLE IF NOT EXISTS text_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_id UUID NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  token_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one chunk index per text
  UNIQUE(text_id, chunk_index)
);

-- Index for fast similarity search on chunk embeddings
CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding 
ON text_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- Index for text_id lookups
CREATE INDEX IF NOT EXISTS idx_text_chunks_text_id ON text_chunks(text_id);

-- Index for chunk_index ordering
CREATE INDEX IF NOT EXISTS idx_text_chunks_index ON text_chunks(text_id, chunk_index);

-- Rate limiting table: track individual queries per user
CREATE TABLE IF NOT EXISTS convergence_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  lens_weights JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user query lookups (for rate limiting: count queries per user per month)
CREATE INDEX IF NOT EXISTS idx_convergence_queries_user_month 
ON convergence_queries(user_id, DATE_TRUNC('month', created_at));

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_convergence_queries_user_id 
ON convergence_queries(user_id);

-- Conversation history table: store full responses
CREATE TABLE IF NOT EXISTS convergence_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_id UUID REFERENCES convergence_queries(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  lens_weights JSONB NOT NULL DEFAULT '{}',
  response_text TEXT NOT NULL,
  sources JSONB DEFAULT '[]', -- Array of citations {text_id, chunk_id, relevance_score}
  lenses_used TEXT[] DEFAULT '{}', -- Which lenses contributed to response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user's conversation history
CREATE INDEX IF NOT EXISTS idx_convergence_responses_user_id 
ON convergence_responses(user_id);

-- Index for query lookup
CREATE INDEX IF NOT EXISTS idx_convergence_responses_query_id 
ON convergence_responses(query_id);

-- Index for recent conversations
CREATE INDEX IF NOT EXISTS idx_convergence_responses_created_at 
ON convergence_responses(user_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE text_chunks IS 'Chunked text content with embeddings for semantic search. Large texts are split into ~2000 token chunks with overlap for context continuity.';
COMMENT ON TABLE convergence_queries IS 'Tracks user queries for rate limiting (5 free/month, unlimited for premium). One row per user per month with query count.';
COMMENT ON TABLE convergence_responses IS 'Stores complete conversation history including responses, sources, and lens contributions. Enables conversation continuation.';

-- Success message
SELECT 'Convergence Machine schema added successfully!' as message;

