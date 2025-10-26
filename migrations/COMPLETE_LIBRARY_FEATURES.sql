-- ============================================================================
-- COMPLETE LIBRARY FEATURES MIGRATION
-- Run this in Supabase SQL Editor to add all library features at once
-- ============================================================================
-- This includes:
-- 1. Reading Progress tracking
-- 2. User Collections
-- 3. Collection Items
-- 4. User Annotations
-- ============================================================================

-- ============================================================================
-- 1. READING PROGRESS TABLE
-- ============================================================================
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

-- ============================================================================
-- 2. USER COLLECTIONS TABLE
-- ============================================================================
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

-- ============================================================================
-- 3. COLLECTION ITEMS TABLE (many-to-many relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES user_collections(id) ON DELETE CASCADE NOT NULL,
    text_id UUID REFERENCES texts(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(collection_id, text_id)
);

-- ============================================================================
-- 4. USER ANNOTATIONS TABLE
-- ============================================================================
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

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Reading Progress indexes
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_text_id ON reading_progress(text_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_completed ON reading_progress(completed);

-- User Collections indexes
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);

-- Collection Items indexes
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_text_id ON collection_items(text_id);

-- User Annotations indexes
CREATE INDEX IF NOT EXISTS idx_user_annotations_user_id ON user_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_annotations_text_id ON user_annotations(text_id);
CREATE INDEX IF NOT EXISTS idx_user_annotations_created_at ON user_annotations(created_at DESC);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_annotations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: READING PROGRESS
-- ============================================================================
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

-- ============================================================================
-- RLS POLICIES: USER COLLECTIONS
-- ============================================================================
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

-- ============================================================================
-- RLS POLICIES: COLLECTION ITEMS
-- ============================================================================
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

-- ============================================================================
-- RLS POLICIES: USER ANNOTATIONS
-- ============================================================================
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

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_reading_progress_updated_at 
BEFORE UPDATE ON reading_progress 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_collections_updated_at 
BEFORE UPDATE ON user_collections 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_annotations_updated_at 
BEFORE UPDATE ON user_annotations 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '✅ All library features (Reading Progress, Collections, Annotations) created successfully!' as message;

