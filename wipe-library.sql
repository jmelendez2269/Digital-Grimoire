-- ============================================================================
-- COMPLETE LIBRARY WIPE SCRIPT
-- ============================================================================
-- WARNING: This will permanently delete ALL library data!
-- This cannot be undone. Make sure you have backups if needed.
-- ============================================================================

-- Disable triggers temporarily to speed up deletion
SET session_replication_role = replica;

-- 1. Delete all annotations (child table, must go first)
DELETE FROM annotations;

-- 2. Delete all reading positions
DELETE FROM reading_positions;

-- 3. Delete all texts (main table)
DELETE FROM texts;

-- 4. Delete any orphaned storage files (optional, but recommended)
-- This will clean up R2/storage bucket files
-- Note: You may need to run this separately if you want to clean storage

-- 5. Reset sequences (optional - resets auto-increment IDs back to 1)
-- Uncomment if you want IDs to start from 1 again:
-- ALTER SEQUENCE texts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE annotations_id_seq RESTART WITH 1;
-- ALTER SEQUENCE reading_positions_id_seq RESTART WITH 1;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Display confirmation
SELECT 
  'Library wiped successfully!' as status,
  (SELECT COUNT(*) FROM texts) as remaining_texts,
  (SELECT COUNT(*) FROM annotations) as remaining_annotations,
  (SELECT COUNT(*) FROM reading_positions) as remaining_positions;

