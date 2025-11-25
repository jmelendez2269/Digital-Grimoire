-- Rate Limiting Table
-- Tracks API rate limits across different endpoints and time windows
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identifier (user ID, IP address, etc.)
  identifier TEXT NOT NULL,
  
  -- Rate limit configuration
  window_seconds INTEGER NOT NULL, -- Time window in seconds (e.g., 60, 3600)
  limit INTEGER NOT NULL, -- Maximum requests allowed in window
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_window 
ON rate_limits(identifier, window_seconds, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at 
ON rate_limits(created_at DESC);

-- Index for cleanup queries (old records)
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
ON rate_limits(created_at) WHERE created_at < NOW() - INTERVAL '7 days';

-- Function to clean up old rate limit records (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE rate_limits IS 'Tracks API rate limit requests for general rate limiting across endpoints. Records older than 7 days are automatically cleaned up.';

