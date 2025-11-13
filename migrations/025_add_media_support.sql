-- Add media support columns to texts table
-- Migration 025: Add media_type, duration, transcript, thumbnail_url columns

-- Add media_type column with default 'document' for existing records
ALTER TABLE texts 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'document' 
CHECK (media_type IN ('audio', 'video', 'photo', 'document'));

-- Add duration column (in seconds) for audio/video files
ALTER TABLE texts 
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Add transcript column for audio/video files
ALTER TABLE texts 
ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Add thumbnail_url column for media files
ALTER TABLE texts 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create index for media_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_texts_media_type ON texts(media_type);

-- Create index for duration for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_texts_duration ON texts(duration) WHERE duration IS NOT NULL;

-- Update existing records to have media_type = 'document'
UPDATE texts SET media_type = 'document' WHERE media_type IS NULL;

-- Success message
SELECT 'Media support columns added to texts table successfully!' as message;

