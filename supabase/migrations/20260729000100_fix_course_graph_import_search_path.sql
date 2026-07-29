-- pgcrypto is installed in the Supabase-managed `extensions` schema.
-- Include it in the atomic importer search path so digest(...) resolves.
alter function public.import_course_graph_candidate(jsonb)
  set search_path = public, extensions, pg_temp;
