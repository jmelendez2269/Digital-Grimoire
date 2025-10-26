-- Migration 009: Add User Annotations Table
-- Purpose: Add table for user annotations and highlights

-- User Annotations Table
CREATE TABLE IF NOT EXISTS user_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    text_id UUID REFERENCES texts(id) ON DELETE CASCADE NOT NULL,
    quote TEXT NOT NULL, -- The highlighted text
    note TEXT, -- Optional user note/commentary
    position JSONB DEFAULT '{}', -- Position info {page, rect, etc.}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_annotations_user_id ON user_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_annotations_text_id ON user_annotations(text_id);
CREATE INDEX IF NOT EXISTS idx_user_annotations_created_at ON user_annotations(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE user_annotations ENABLE ROW LEVEL SECURITY;

-- Annotations Policies
CREATE POLICY "Users can view own annotations" 
ON user_annotations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own annotations" 
ON user_annotations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations" 
ON user_annotations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations" 
ON user_annotations FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_annotations_updated_at 
BEFORE UPDATE ON user_annotations 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'User annotations table created successfully!' as message;

