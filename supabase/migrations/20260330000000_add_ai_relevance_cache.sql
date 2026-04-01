-- AI relevance scoring cache for concept search
CREATE TABLE IF NOT EXISTS public.ai_relevance_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    query TEXT NOT NULL,
    concept_ids TEXT[] NOT NULL,
    scores JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_relevance_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.ai_relevance_cache
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON public.ai_relevance_cache
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON public.ai_relevance_cache
    FOR UPDATE TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_ai_relevance_cache_key ON public.ai_relevance_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_relevance_cache_expires ON public.ai_relevance_cache (expires_at);
