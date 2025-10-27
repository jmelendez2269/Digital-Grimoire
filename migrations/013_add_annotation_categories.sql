-- Migration 013: Add Categories to User Annotations
-- Purpose: Allow users to categorize annotations (important, question, insight, etc.)

-- Add category column to user_annotations
ALTER TABLE user_annotations 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' 
CHECK (category IN ('general', 'important', 'question', 'insight', 'to-research', 'quote', 'critique'));

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_user_annotations_category ON user_annotations(category);

-- Success message
SELECT 'Annotation categories added successfully!' as message;

