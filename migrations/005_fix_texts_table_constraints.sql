-- Fix texts table constraints and column names
-- This is a safe version that checks what exists first

-- Drop old constraints if they exist
ALTER TABLE texts DROP CONSTRAINT IF EXISTS texts_processing_status_check;
ALTER TABLE texts DROP CONSTRAINT IF EXISTS texts_document_type_check;

-- Update status constraint to match code expectations
ALTER TABLE texts DROP CONSTRAINT IF EXISTS texts_status_check;
ALTER TABLE texts ADD CONSTRAINT texts_status_check 
  CHECK (status IN ('processing', 'ready', 'error'));

-- Set default status
ALTER TABLE texts ALTER COLUMN status SET DEFAULT 'processing';

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

-- Ensure tags is JSONB array (only if column exists and is not already JSONB)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'texts' AND column_name = 'tags' AND data_type != 'jsonb'
  ) THEN
    ALTER TABLE texts ALTER COLUMN tags TYPE JSONB USING 
      CASE 
        WHEN tags IS NULL THEN '[]'::jsonb
        WHEN tags::text ~ '^[[:space:]]*\[' THEN tags::jsonb
        ELSE json_build_array(string_to_array(tags::text, ','))::jsonb
      END;
  END IF;
END $$;

-- Update index for tags
DROP INDEX IF EXISTS idx_texts_tags;
CREATE INDEX IF NOT EXISTS idx_texts_tags ON texts USING GIN(tags);

-- Success message
SELECT 'Texts table constraints updated successfully!' as message;

