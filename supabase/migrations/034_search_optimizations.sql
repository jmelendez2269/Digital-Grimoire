-- 1. Clean up existing functions if they exist (Postgres requires dropping if return type changes)
DROP FUNCTION IF EXISTS match_text_chunks(vector, double precision, integer, text[], text[]);
DROP FUNCTION IF EXISTS match_text_chunks(vector, float, int, text[], text[]);
DROP FUNCTION IF EXISTS match_text_fts(text, integer, text[], text[]);

-- 2. Add Gin index on text_chunks.content for fast keyword lookups
-- We use English configuration for the search index
CREATE INDEX IF NOT EXISTS idx_text_chunks_content_fts ON text_chunks USING GIN(to_tsvector('english', content));

-- 2. Professional Vector Similarity Search RPC
-- This allows efficient library-wide semantic search
CREATE OR REPLACE FUNCTION match_text_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  lens_filter text[] DEFAULT NULL,
  type_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  text_id uuid,
  content text,
  chunk_index int,
  similarity float,
  text_title text,
  text_author text,
  text_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as chunk_id,
    tc.text_id,
    tc.content,
    tc.chunk_index,
    1 - (tc.embedding <=> query_embedding) AS similarity,
    t.title as text_title,
    t.author as text_author,
    t.document_type as text_type
  FROM text_chunks tc
  JOIN texts t ON tc.text_id = t.id
  WHERE (1 - (tc.embedding <=> query_embedding)) > match_threshold
    AND (lens_filter IS NULL OR t.domain = ANY(lens_filter) OR (t.tags IS NOT NULL AND string_to_array(t.tags, ',') && lens_filter))
    AND (type_filter IS NULL OR t.document_type = ANY(type_filter))
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. Professional Full-Text Search RPC
-- Uses PostgreSQL's built-in ranking to provide high-relevance keyword results
CREATE OR REPLACE FUNCTION match_text_fts (
  search_query text,
  match_count int,
  lens_filter text[] DEFAULT NULL,
  type_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  text_id uuid,
  content text,
  chunk_index int,
  relevance float,
  text_title text,
  text_author text,
  text_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as chunk_id,
    tc.text_id,
    tc.content,
    tc.chunk_index,
    ts_rank_cd(to_tsvector('english', tc.content), plainto_tsquery('english', search_query)) AS relevance,
    t.title as text_title,
    t.author as text_author,
    t.document_type as text_type
  FROM text_chunks tc
  JOIN texts t ON tc.text_id = t.id
  WHERE to_tsvector('english', tc.content) @@ plainto_tsquery('english', search_query)
    AND (lens_filter IS NULL OR t.domain = ANY(lens_filter) OR (t.tags IS NOT NULL AND string_to_array(t.tags, ',') && lens_filter))
    AND (type_filter IS NULL OR t.document_type = ANY(type_filter))
  ORDER BY relevance DESC
  LIMIT match_count;
END;
$$;
