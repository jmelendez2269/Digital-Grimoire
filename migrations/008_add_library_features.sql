-- Migration 008: Add Library Features (Reading Progress & Collections)
-- Purpose: Add tables for reading progress tracking and custom document collections

-- Reading Progress Table
CREATE TABLE IF NOT EXISTS reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    text_id UUID REFERENCES texts(id) ON DELETE CASCADE NOT NULL,
    current_page INT DEFAULT 1,
    total_pages INT,
    progress_percent FLOAT DEFAULT 0.0 CHECK (progress_percent >= 0.0 AND progress_percent <= 100.0),
    last_position JSONB DEFAULT '{}', -- {page, scrollTop, etc.}
    time_spent_seconds INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, text_id)
);

-- User Collections Table
CREATE TABLE IF NOT EXISTS user_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Emoji or icon name
    color TEXT DEFAULT '#f59e0b', -- Amber color by default
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collection Items (many-to-many relationship)
CREATE TABLE IF NOT EXISTS collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES user_collections(id) ON DELETE CASCADE NOT NULL,
    text_id UUID REFERENCES texts(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(collection_id, text_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_text_id ON reading_progress(text_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_completed ON reading_progress(completed);
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_text_id ON collection_items(text_id);

-- Row Level Security (RLS) policies
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Reading Progress Policies
CREATE POLICY "Users can view own reading progress" 
ON reading_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading progress" 
ON reading_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress" 
ON reading_progress FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading progress" 
ON reading_progress FOR DELETE 
USING (auth.uid() = user_id);

-- Collections Policies
CREATE POLICY "Users can view own collections" 
ON user_collections FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own collections" 
ON user_collections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections" 
ON user_collections FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections" 
ON user_collections FOR DELETE 
USING (auth.uid() = user_id);

-- Collection Items Policies
CREATE POLICY "Users can view own collection items" 
ON collection_items FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_collections 
        WHERE id = collection_items.collection_id 
        AND (user_id = auth.uid() OR is_public = true)
    )
);

CREATE POLICY "Users can add items to own collections" 
ON collection_items FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_collections 
        WHERE id = collection_items.collection_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update own collection items" 
ON collection_items FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM user_collections 
        WHERE id = collection_items.collection_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete own collection items" 
ON collection_items FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM user_collections 
        WHERE id = collection_items.collection_id 
        AND user_id = auth.uid()
    )
);

-- Trigger for updated_at on reading_progress
CREATE TRIGGER update_reading_progress_updated_at 
BEFORE UPDATE ON reading_progress 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on user_collections
CREATE TRIGGER update_user_collections_updated_at 
BEFORE UPDATE ON user_collections 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Library features migration completed successfully!' as message;

