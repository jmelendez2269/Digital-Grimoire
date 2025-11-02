-- Migration 020: Add source format tracking
-- Adds source_format column to track the original format of imported documents

-- Add source_format column to texts table
ALTER TABLE texts 
ADD COLUMN IF NOT EXISTS source_format TEXT 
CHECK (source_format IN ('pdf', 'html', 'markdown', 'plaintext', NULL));

-- Add comment for documentation
COMMENT ON COLUMN texts.source_format IS 'Original format of the source document: pdf (uploaded), html (web-imported), markdown (web-imported), plaintext (web-imported), or NULL';

-- Add index for filtering by source format (useful for analytics and debugging)
CREATE INDEX IF NOT EXISTS idx_texts_source_format ON texts(source_format);

