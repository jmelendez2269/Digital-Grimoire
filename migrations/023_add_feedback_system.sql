-- Migration 023: Feedback System
-- Adds table for user feedback (bugs, feature requests, general feedback)

-- Feedback table for collecting user feedback
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous feedback
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature_request', 'general', 'book_request', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT, -- Optional screenshot URL
  user_email TEXT, -- Optional contact email (for anonymous users or follow-up)
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  admin_notes TEXT, -- Internal notes for admins
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Index for recent feedback (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Index for priority (for critical bug alerts)
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority, status) WHERE priority IN ('high', 'critical');

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own feedback
CREATE POLICY "Users can view their own feedback"
  ON feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own feedback (only if status is 'open')
CREATE POLICY "Users can update their own open feedback"
  ON feedback
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'open')
  WITH CHECK (auth.uid() = user_id AND status = 'open');

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update all feedback
CREATE POLICY "Admins can update all feedback"
  ON feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- Add comments for documentation
COMMENT ON TABLE feedback IS 'User feedback system for bugs, feature requests, and general feedback. Supports both authenticated and anonymous submissions.';
COMMENT ON COLUMN feedback.user_id IS 'User ID if authenticated, NULL for anonymous feedback';
COMMENT ON COLUMN feedback.priority IS 'Priority level: critical and high priority bugs trigger email notifications to admins';
COMMENT ON COLUMN feedback.status IS 'Feedback status workflow: open -> in_progress -> resolved -> closed';

-- Success message
SELECT 'Feedback system schema added successfully!' as message;

