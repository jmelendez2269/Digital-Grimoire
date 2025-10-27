-- Migration 014: Add Highlight Colors to User Annotations
-- Purpose: Allow users to customize the color of their PDF highlights

-- Add highlight_color column to user_annotations
ALTER TABLE user_annotations 
ADD COLUMN IF NOT EXISTS highlight_color TEXT DEFAULT 'yellow' 
CHECK (highlight_color IN ('yellow', 'green', 'blue', 'pink', 'red', 'purple', 'orange'));

-- Add index for potential color filtering
CREATE INDEX IF NOT EXISTS idx_user_annotations_highlight_color ON user_annotations(highlight_color);

-- Success message
SELECT 'Highlight colors added successfully!' as message;

