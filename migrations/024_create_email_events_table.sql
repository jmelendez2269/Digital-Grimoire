-- Migration: Create email_events table for SendGrid webhook monitoring
-- Created: November 10, 2025
-- Purpose: Store email events from SendGrid webhooks for monitoring and analytics

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'delivered', 'bounce', 'spamreport', 'open', 'click', etc.
  timestamp TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at);

-- Composite index for common queries (email + event_type + timestamp)
CREATE INDEX IF NOT EXISTS idx_email_events_composite ON email_events(email, event_type, timestamp DESC);

-- Enable RLS
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all email events
CREATE POLICY "Service role can manage email events"
  ON email_events FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Users can view their own email events (read-only)
CREATE POLICY "Users can view own email events"
  ON email_events FOR SELECT
  USING (auth.uid()::text = (raw_data->>'user_id')::text OR auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE email_events IS 'Stores email events from SendGrid webhooks for monitoring, analytics, and alerting';
COMMENT ON COLUMN email_events.event_type IS 'Type of email event: delivered, bounce, spamreport, open, click, etc.';
COMMENT ON COLUMN email_events.raw_data IS 'Complete event data from SendGrid webhook in JSON format';

