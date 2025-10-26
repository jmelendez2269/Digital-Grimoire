-- Migration 007: Add lenses column to texts table
-- This enables filtering documents by The Convergence Machine's 7 perspectives

-- Add lenses column as text array
ALTER TABLE texts
ADD COLUMN IF NOT EXISTS lenses TEXT[] DEFAULT '{}';

-- Add constraint to ensure only valid lenses are stored
ALTER TABLE texts
ADD CONSTRAINT valid_lenses CHECK (
  lenses <@ ARRAY[
    'scientific',
    'psychological', 
    'philosophical',
    'religious_spiritual',
    'historical_anthropological',
    'symbolic_occult',
    'mathematical'
  ]::TEXT[]
);

-- Create index for efficient lens filtering
CREATE INDEX IF NOT EXISTS idx_texts_lenses ON texts USING GIN (lenses);

-- Add comment explaining the lenses
COMMENT ON COLUMN texts.lenses IS 'The 7 Convergence Machine lenses that apply to this document: scientific, psychological, philosophical, religious_spiritual, historical_anthropological, symbolic_occult, mathematical. Documents can have multiple lenses.';

