-- Digital Grimoire Library Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (compatible with NextAuth.js)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified TIMESTAMP,
    image TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'contributor')),
    tokens_earned INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Texts table (main library content)
CREATE TABLE texts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT, -- Full text content
    summary TEXT, -- AI-generated summary
    
    -- Azure Blob metadata
    blob_url TEXT, -- Azure storage URL
    mime_type TEXT,
    file_size BIGINT,
    
    -- Document classification (20 allowed types)
    document_type TEXT CHECK (document_type IN (
        'book_esoteric', 'book_spiritual', 'book_psychology', 'book_science',
        'article_scholarly', 'anthropology', 'reference_table', 'historical',
        'mythology', 'medical_overview', 'commentary', 'webpage', 'dictionary',
        'astrology', 'ritual_guide', 'diagram', 'transcript', 'summary',
        'speculative', 'misc'
    )),
    author TEXT,
    year INT,
    publisher TEXT,
    license TEXT CHECK (license IN ('public-domain', 'cc-by', 'all-rights-reserved')),
    domain TEXT, -- astrology, psychology, anthropology, etc.
    confidence TEXT CHECK (confidence IN ('established', 'interpretive', 'speculative', 'tradition')),
    source_url TEXT,
    tags TEXT, -- Comma-separated
    associated_names TEXT,
    
    -- System fields
    metadata JSONB DEFAULT '{}', -- Additional custom fields
    embedding VECTOR(1536), -- pgvector for semantic search
    uploaded_by UUID REFERENCES users(id),
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Correspondences table (symbolic associations)
CREATE TABLE correspondences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    source_id TEXT UNIQUE, -- For duplicate detection
    
    -- Standard correspondence fields
    element TEXT,
    planet TEXT,
    deity TEXT,
    zodiac_sign TEXT,
    color TEXT,
    hebrew_letter TEXT,
    tarot_card TEXT,
    chakra TEXT,
    tree_of_life_path TEXT,
    rune TEXT,
    i_ching_hexagram TEXT,
    metal TEXT,
    gemstone TEXT,
    plant TEXT,
    animal TEXT,
    number TEXT,
    day_of_week TEXT,
    direction TEXT,
    season TEXT,
    mythology_tradition TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Correspondence relationships (graph connections)
CREATE TABLE correspondence_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_correspondence_id UUID REFERENCES correspondences(id) ON DELETE CASCADE,
    target_correspondence_id UUID REFERENCES correspondences(id) ON DELETE CASCADE,
    relationship_type TEXT, -- 'associated_with', 'rules', 'influenced_by'
    strength FLOAT DEFAULT 1.0 CHECK (strength >= 0.0 AND strength <= 1.0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Text-correspondence links
CREATE TABLE text_correspondences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text_id UUID REFERENCES texts(id) ON DELETE CASCADE,
    correspondence_id UUID REFERENCES correspondences(id) ON DELETE CASCADE,
    context TEXT, -- Where in the text this appears
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Text relationships (influences, contradicts, etc.)
CREATE TABLE text_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES texts(id) ON DELETE CASCADE,
    target_id UUID REFERENCES texts(id) ON DELETE CASCADE,
    relationship_type TEXT, -- 'influences', 'contradicts', 'builds_upon'
    lens TEXT, -- 'historical', 'psychological', 'symbolic'
    confidence FLOAT CHECK (confidence >= 0.0 AND confidence <= 1.0),
    discovered_by TEXT, -- 'ai' or 'user'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User grimoires (personal workspace)
CREATE TABLE user_grimoires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB DEFAULT '{}', -- Notion-style blocks
    parent_id UUID REFERENCES user_grimoires(id), -- For nested pages
    icon TEXT, -- Emoji or image URL
    cover_image TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User bookmarks
CREATE TABLE user_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    text_id UUID REFERENCES texts(id) ON DELETE CASCADE,
    notes TEXT,
    grimoire_id UUID REFERENCES user_grimoires(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User annotations
CREATE TABLE user_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    text_id UUID REFERENCES texts(id) ON DELETE CASCADE,
    quote TEXT, -- The highlighted text
    note TEXT, -- User's note
    position JSONB DEFAULT '{}', -- {page, paragraph, startOffset, endOffset}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import history (track imports)
CREATE TABLE import_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_type TEXT CHECK (import_type IN ('airtable_csv', 'obsidian_markdown')),
    file_name TEXT,
    records_imported INT DEFAULT 0,
    records_skipped INT DEFAULT 0,
    errors JSONB DEFAULT '[]',
    imported_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent logs (for future n8n agents)
CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name TEXT,
    action TEXT,
    status TEXT CHECK (status IN ('success', 'failure', 'warning')),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_texts_type ON texts(document_type);
CREATE INDEX idx_texts_author ON texts(author);
CREATE INDEX idx_texts_year ON texts(year);
CREATE INDEX idx_texts_domain ON texts(domain);
CREATE INDEX idx_texts_tags ON texts USING GIN(to_tsvector('english', tags));
CREATE INDEX idx_texts_content ON texts USING GIN(to_tsvector('english', content));
CREATE INDEX idx_texts_embedding ON texts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_correspondences_name ON correspondences(name);
CREATE INDEX idx_correspondences_element ON correspondences(element);
CREATE INDEX idx_correspondences_planet ON correspondences(planet);
CREATE INDEX idx_correspondences_deity ON correspondences(deity);

CREATE INDEX idx_user_grimoires_user_id ON user_grimoires(user_id);
CREATE INDEX idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX idx_user_annotations_user_id ON user_annotations(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE correspondences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_grimoires ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_annotations ENABLE ROW LEVEL SECURITY;

-- Public read access for texts and correspondences
CREATE POLICY "Public read access for texts" ON texts FOR SELECT USING (true);
CREATE POLICY "Public read access for correspondences" ON correspondences FOR SELECT USING (true);

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own grimoires" ON user_grimoires FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own annotations" ON user_annotations FOR ALL USING (auth.uid() = user_id);

-- Admin policies (will be set up after auth)
-- CREATE POLICY "Admins can manage texts" ON texts FOR ALL USING (
--   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
-- );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_texts_updated_at BEFORE UPDATE ON texts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_correspondences_updated_at BEFORE UPDATE ON correspondences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_grimoires_updated_at BEFORE UPDATE ON user_grimoires FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO correspondences (name, element, planet, deity, color, zodiac_sign, source_id) VALUES
('Mars', 'Fire', 'Mars', 'Ares', 'Red', 'Aries', 'mars-001'),
('Venus', 'Earth', 'Venus', 'Aphrodite', 'Green', 'Taurus', 'venus-001'),
('Mercury', 'Air', 'Mercury', 'Hermes', 'Yellow', 'Gemini', 'mercury-001'),
('Sun', 'Fire', 'Sun', 'Apollo', 'Gold', 'Leo', 'sun-001'),
('Moon', 'Water', 'Moon', 'Artemis', 'Silver', 'Cancer', 'moon-001');

INSERT INTO correspondence_relationships (source_correspondence_id, target_correspondence_id, relationship_type, strength) VALUES
((SELECT id FROM correspondences WHERE name = 'Mars'), (SELECT id FROM correspondences WHERE name = 'Aries'), 'rules', 1.0),
((SELECT id FROM correspondences WHERE name = 'Venus'), (SELECT id FROM correspondences WHERE name = 'Taurus'), 'rules', 1.0),
((SELECT id FROM correspondences WHERE name = 'Mercury'), (SELECT id FROM correspondences WHERE name = 'Gemini'), 'rules', 1.0),
((SELECT id FROM correspondences WHERE name = 'Sun'), (SELECT id FROM correspondences WHERE name = 'Leo'), 'rules', 1.0),
((SELECT id FROM correspondences WHERE name = 'Moon'), (SELECT id FROM correspondences WHERE name = 'Cancer'), 'rules', 1.0);

-- Success message
SELECT 'Digital Grimoire Library database schema created successfully!' as message;
