-- Migration: Add reading positions table
-- Tracks user reading progress for text-to-speech functionality

-- Create reading_positions table
CREATE TABLE IF NOT EXISTS reading_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_id UUID NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  
  -- Reading position data
  char_position INTEGER NOT NULL DEFAULT 0,
  text_source VARCHAR(10) NOT NULL DEFAULT 'ocr', -- 'ocr' or 'pdf'
  
  -- Playback settings (saved preferences)
  playback_rate DECIMAL(3,1) DEFAULT 1.0,
  selected_voice TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one position per user per text
  UNIQUE(user_id, text_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reading_positions_user_text 
ON reading_positions(user_id, text_id);

-- Enable Row Level Security
ALTER TABLE reading_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own reading positions
CREATE POLICY "Users can view their own reading positions"
ON reading_positions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own reading positions
CREATE POLICY "Users can insert their own reading positions"
ON reading_positions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reading positions
CREATE POLICY "Users can update their own reading positions"
ON reading_positions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reading positions
CREATE POLICY "Users can delete their own reading positions"
ON reading_positions FOR DELETE
USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reading_position_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_reading_positions_updated_at
BEFORE UPDATE ON reading_positions
FOR EACH ROW
EXECUTE FUNCTION update_reading_position_updated_at();

-- Add tts_preferences JSONB column to users table for global TTS settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS tts_preferences JSONB DEFAULT '{}'::jsonb;

-- Add index for JSONB column
CREATE INDEX IF NOT EXISTS idx_users_tts_preferences ON users USING GIN (tts_preferences);

COMMENT ON TABLE reading_positions IS 'Stores user reading progress for text-to-speech functionality';
COMMENT ON COLUMN reading_positions.char_position IS 'Character position in the text where user last stopped';
COMMENT ON COLUMN reading_positions.text_source IS 'Source of text being read: ocr or pdf';
COMMENT ON COLUMN reading_positions.playback_rate IS 'Last used playback speed';
COMMENT ON COLUMN users.tts_preferences IS 'Global TTS preferences (engine, voice, etc.)';

