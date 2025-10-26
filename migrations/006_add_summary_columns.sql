-- Add summary columns to texts table
-- Migration 006: Add short_summary and long_summary columns

ALTER TABLE texts 
ADD COLUMN IF NOT EXISTS short_summary TEXT,
ADD COLUMN IF NOT EXISTS long_summary TEXT;

-- Create index for better search performance on summaries
CREATE INDEX IF NOT EXISTS idx_texts_short_summary ON texts USING GIN(to_tsvector('english', short_summary));
CREATE INDEX IF NOT EXISTS idx_texts_long_summary ON texts USING GIN(to_tsvector('english', long_summary));

-- Success message
SELECT 'Summary columns added to texts table successfully!' as message;

