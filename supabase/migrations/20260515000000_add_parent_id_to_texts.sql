-- Add parent_id to texts for corpus collection nesting.
-- When a text is imported and its source URL appears inside an existing
-- corpus shell's items, the import handler stamps parent_id to that shell.
-- The library grid filters parent_id IS NULL so children only surface
-- through the parent shell's viewer.

ALTER TABLE texts
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES texts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_texts_parent_id ON texts(parent_id);

COMMENT ON COLUMN texts.parent_id IS
  'Parent corpus shell when this text belongs to a curated corpus collection. NULL for top-level library items.';
