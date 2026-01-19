-- Add courses_clicks column to user_activity_summary
ALTER TABLE user_activity_summary 
ADD COLUMN IF NOT EXISTS courses_clicks INT DEFAULT 0;

-- Create function to track courses clicks
CREATE OR REPLACE FUNCTION track_courses_click(
  p_user_id UUID,
  p_source TEXT DEFAULT 'unknown'
)
RETURNS void AS $$
BEGIN
  -- Update or insert user activity for today
  INSERT INTO user_activity_summary (
    user_id,
    date,
    courses_clicks
  )
  VALUES (
    p_user_id,
    CURRENT_DATE,
    1
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    courses_clicks = user_activity_summary.courses_clicks + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_activity_courses_clicks 
ON user_activity_summary(date DESC, courses_clicks DESC) 
WHERE courses_clicks > 0;
