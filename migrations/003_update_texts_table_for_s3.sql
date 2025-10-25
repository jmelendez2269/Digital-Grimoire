-- Update texts table to match current S3-based implementation
-- Changes: blob_url -> s3_key, processing_status -> status, add missing fields

-- Rename blob_url to s3_key
ALTER TABLE texts RENAME COLUMN blob_url TO s3_key;

-- Rename processing_status to status
ALTER TABLE texts RENAME COLUMN processing_status TO status;

-- Update status constraint to match code expectations
ALTER TABLE texts DROP CONSTRAINT IF EXISTS texts_status_check;
ALTER TABLE texts ADD CONSTRAINT texts_status_check 
  CHECK (status IN ('processing', 'ready', 'error'));

-- Set default status
ALTER TABLE texts ALTER COLUMN status SET DEFAULT 'processing';

-- Rename document_type to type for consistency
ALTER TABLE texts RENAME COLUMN document_type TO type;

-- Update type constraint to match code expectations  
ALTER TABLE texts DROP CONSTRAINT IF EXISTS texts_type_check;
ALTER TABLE texts ADD CONSTRAINT texts_type_check 
  CHECK (type IN (
    'book_esoteric', 'book_spiritual', 'book_psychology', 'book_science',
    'article_scholarly', 'anthropology', 'reference_table', 'historical',
    'mythology', 'medical_overview', 'commentary', 'webpage', 'dictionary',
    'astrology', 'ritual_guide', 'diagram', 'transcript', 'summary',
    'speculative', 'misc'
  ));

-- Ensure tags is JSONB array for easier querying
ALTER TABLE texts ALTER COLUMN tags TYPE JSONB USING 
  CASE 
    WHEN tags IS NULL THEN '[]'::jsonb
    WHEN tags ~ '^[[:space:]]*\[' THEN tags::jsonb
    ELSE json_build_array(string_to_array(tags, ','))::jsonb
  END;

-- Update index for new tags format
DROP INDEX IF EXISTS idx_texts_tags;
CREATE INDEX idx_texts_tags ON texts USING GIN(tags);

-- Success message
SELECT 'Texts table updated for S3 compatibility!' as message;

