-- Create search_cache table for caching Deep Search AI responses
CREATE TABLE IF NOT EXISTS public.search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL UNIQUE,
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (since search results are generally safe to read)
CREATE POLICY "Enable read access for all users" ON public.search_cache
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert (so the API can save new results)
CREATE POLICY "Enable insert for authenticated users" ON public.search_cache
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create index on query for fast lookups
CREATE INDEX IF NOT EXISTS idx_search_cache_query ON public.search_cache (query);
