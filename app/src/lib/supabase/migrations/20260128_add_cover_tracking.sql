-- Add cover tracking columns to texts table

ALTER TABLE texts
ADD COLUMN IF NOT EXISTS cover_status text DEFAULT 'unchecked' CHECK (cover_status IN ('valid', 'broken', 'unchecked')),
ADD COLUMN IF NOT EXISTS cover_last_checked timestamptz;

-- Create index for faster querying of broken covers
CREATE INDEX IF NOT EXISTS idx_texts_cover_status ON texts(cover_status);
