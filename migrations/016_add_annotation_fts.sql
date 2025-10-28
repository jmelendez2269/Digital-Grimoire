-- Migration: Add Full-Text Search to Annotations
-- Description: Adds PostgreSQL full-text search capabilities to user_annotations table
-- Author: Digital Grimoire Development Team
-- Date: 2025-10-28

-- Add tsvector column for full-text search
ALTER TABLE user_annotations 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
-- GIN (Generalized Inverted Index) is optimal for full-text search
CREATE INDEX IF NOT EXISTS idx_annotations_search 
ON user_annotations USING GIN(search_vector);

-- Function to update search vector
-- Sets different weights: 'A' for quote (highest priority), 'B' for note
CREATE OR REPLACE FUNCTION update_annotation_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.quote, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.note, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector on insert/update
DROP TRIGGER IF EXISTS update_annotations_search_vector ON user_annotations;
CREATE TRIGGER update_annotations_search_vector
BEFORE INSERT OR UPDATE ON user_annotations
FOR EACH ROW EXECUTE FUNCTION update_annotation_search_vector();

-- Backfill existing annotations with search vectors
UPDATE user_annotations SET search_vector = 
  setweight(to_tsvector('english', COALESCE(quote, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(note, '')), 'B')
WHERE search_vector IS NULL;

-- Add helpful comments
COMMENT ON COLUMN user_annotations.search_vector IS 'Full-text search vector for quote and note fields';
COMMENT ON INDEX idx_annotations_search IS 'GIN index for fast full-text search on annotations';
COMMENT ON FUNCTION update_annotation_search_vector IS 'Automatically updates search_vector when annotation is created or modified';

