-- Migration 012: Add fields for enhanced library card display
-- Purpose: Add cover_image_url and curator_note fields for beautiful library cards

-- Add cover image URL field
ALTER TABLE texts
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add curator note field (why this document is in the collection)
ALTER TABLE texts
ADD COLUMN IF NOT EXISTS curator_note TEXT;

-- Add comment explaining the new fields
COMMENT ON COLUMN texts.cover_image_url IS 'URL to the book cover image for display in the library. Can be stored in R2/Azure or external URL.';
COMMENT ON COLUMN texts.curator_note IS 'Explanation of why this document was chosen for the collection and its significance.';

-- Success message
SELECT 'Library card enhancement fields added successfully!' as message;

