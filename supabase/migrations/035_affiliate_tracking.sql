-- Create affiliate_clicks table for tracking performance
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_title TEXT NOT NULL,
    item_author TEXT,
    source_page TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tracking_id TEXT DEFAULT 'converg05f-20',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at ON public.affiliate_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_item_title ON public.affiliate_clicks(item_title);

-- Enable RLS
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Provide access to service role for API tracking
-- Also allow non-authed inserts if we want to track guest clicks via the API (which uses service role)
CREATE POLICY "Service role can manage affiliate clicks"
ON public.affiliate_clicks
FOR ALL
USING (true)
WITH CHECK (true);

-- Allow admins to view stats
CREATE POLICY "Admins can view affiliate clicks" 
ON public.affiliate_clicks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Function to get top clicked items
CREATE OR REPLACE FUNCTION public.get_top_affiliate_items(limit_count INT DEFAULT 5)
RETURNS TABLE (item_title TEXT, click_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.item_title,
        COUNT(*) as click_count
    FROM public.affiliate_clicks ac
    GROUP BY ac.item_title
    ORDER BY click_count DESC
    LIMIT limit_count;
END;
$$;

-- Function to get source stats
CREATE OR REPLACE FUNCTION public.get_affiliate_source_stats()
RETURNS TABLE (source_page TEXT, click_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.source_page,
        COUNT(*) as click_count
    FROM public.affiliate_clicks ac
    GROUP BY ac.source_page
    ORDER BY click_count DESC;
END;
$$;
