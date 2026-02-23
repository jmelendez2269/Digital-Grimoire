-- Add helper functions for indexing status and summary
-- This allows the admin dashboard to get global library stats efficiently

-- 1. Function to get chunk counts for a list of texts
CREATE OR REPLACE FUNCTION get_text_chunk_counts(text_ids uuid[])
RETURNS TABLE (text_id uuid, chunk_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT tc.text_id, count(*)
  FROM text_chunks tc
  WHERE tc.text_id = ANY(text_ids)
  GROUP BY tc.text_id;
$$;

-- 2. Function to get a global summary of the library indexing status
CREATE OR REPLACE FUNCTION get_library_indexing_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total', count(t.id),
    'withContent', count(t.id) FILTER (WHERE t.content IS NOT NULL AND t.content != ''),
    'withoutContent', count(t.id) FILTER (WHERE t.content IS NULL OR t.content = ''),
    'withEmbeddings', (SELECT count(DISTINCT tc.text_id) FROM text_chunks tc),
    'withoutEmbeddings', count(t.id) - (SELECT count(DISTINCT tc.text_id) FROM text_chunks tc)
  ) INTO result
  FROM texts t;
  RETURN result;
END;
$$;

-- 3. Function to get all unique text_ids that have chunks (efficiently)
CREATE OR REPLACE FUNCTION get_indexed_text_ids()
RETURNS TABLE (text_id uuid)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT tc.text_id FROM text_chunks tc;
$$;
