-- Per-user TTS usage tracking (characters synthesized + audio seconds)
CREATE TABLE IF NOT EXISTS public.tts_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chars_used INTEGER NOT NULL DEFAULT 0,
    audio_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0,
    engine TEXT NOT NULL DEFAULT 'azure',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tts_usage ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage
CREATE POLICY "Users can read own tts usage" ON public.tts_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Service role inserts (API route uses service client)
CREATE POLICY "Service role can insert tts usage" ON public.tts_usage
    FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tts_usage_user_created ON public.tts_usage (user_id, created_at);
