-- Revert Search Optimizations
-- Use this if you want to go back to the original search logic

-- 1. Drop the new optimized functions
DROP FUNCTION IF EXISTS match_text_fts(text, integer, text[], text[]);

-- 2. Restore the original match_text_chunks signature
-- Note: Replace this with your PREVIOIUS function logic if you had custom tweaks
DROP FUNCTION IF EXISTS match_text_chunks(vector, float, int, text[], text[]);

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
  similarity float
  -- (Original version didn't have text_title, text_author, or text_type)
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
    1 - (tc.embedding <=> query_embedding) AS similarity
  FROM text_chunks tc
  WHERE (1 - (tc.embedding <=> query_embedding)) > match_threshold
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. The content index (GIN) is safe to keep, but you can remove it if desired:
-- DROP INDEX IF EXISTS idx_text_chunks_content_fts;
