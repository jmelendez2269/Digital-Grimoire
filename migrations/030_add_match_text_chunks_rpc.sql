-- Migration 030: Add match_text_chunks RPC function for efficient vector search
-- This function enables fast pgvector similarity search via Supabase RPC

-- Create function for vector similarity search on text_chunks
CREATE OR REPLACE FUNCTION match_text_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  lens_filter text[] DEFAULT NULL,
  type_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  text_id uuid,
  chunk_index integer,
  content text,
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
    tc.chunk_index,
    tc.content,
    1 - (tc.embedding <=> query_embedding) as similarity,
    t.title as text_title,
    t.author as text_author,
    t.type as text_type
  FROM text_chunks tc
  INNER JOIN texts t ON t.id = tc.text_id
  WHERE tc.embedding IS NOT NULL
    AND 1 - (tc.embedding <=> query_embedding) >= match_threshold
    AND (lens_filter IS NULL OR t.lenses && lens_filter)
    AND (type_filter IS NULL OR t.type = ANY(type_filter))
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_text_chunks TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION match_text_chunks IS 'Performs vector similarity search on text_chunks using pgvector. Returns chunks with similarity scores >= match_threshold, optionally filtered by lens or document type.';

-- Success message
SELECT 'match_text_chunks RPC function created successfully!' as message;
