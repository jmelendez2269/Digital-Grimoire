-- Migration 038: Fix attribution of "The Alchemists" in The Hermetic Tradition (C06)
--
-- The course c06-the-hermetic-tradition has a Week-3 reading cited as
-- "The Alchemists — (Morley, selected biographical chapters)". The intended
-- source is Arthur Edward Waite's "Lives of Alchemystical Philosophers"
-- (1888 expanded edition), hosted at:
--   https://archive.org/details/livesalchemistic00morl
-- The archive.org slug suffix "morl" is a cataloger artifact, not an author.
-- The original 1815 compilation is sometimes attributed to Francis Barrett,
-- but the canonical edition the curriculum draws from is Waite's.
--
-- The Morley name appears 4 times inside the course's content JSONB
-- (in `section`, `selection_rationale` x2, and one tier description on the
-- "The Alchemists" reading). This migration rewrites all four in place.

-- Sanity check: confirm the course exists and currently contains "Morley".
DO $$
DECLARE
  match_count INT;
BEGIN
  SELECT COUNT(*) INTO match_count
  FROM courses
  WHERE slug = 'c06-the-hermetic-tradition'
    AND content::text LIKE '%Morley%';

  IF match_count = 0 THEN
    RAISE NOTICE 'No course found with slug c06-the-hermetic-tradition containing "Morley"; nothing to update.';
  ELSE
    RAISE NOTICE 'Found % course(s) to update.', match_count;
  END IF;
END $$;

-- Replace every "Morley" with "Arthur Edward Waite" inside this one course,
-- and rename the reading title from the curator's shorthand "The Alchemists"
-- to the canonical book title "Lives of Alchemystical Philosophers" so the
-- auto-audit matches it to the corresponding library text once imported.
UPDATE courses
SET
  content = regexp_replace(
              regexp_replace(content::text, 'Morley', 'Arthur Edward Waite', 'g'),
              '"title":\s*"The Alchemists"',
              '"title": "Lives of Alchemystical Philosophers"',
              'g'
            )::jsonb,
  updated_at = NOW()
WHERE slug = 'c06-the-hermetic-tradition'
  AND content::text LIKE '%Morley%';

-- Verify zero remaining occurrences on this course.
DO $$
DECLARE
  leftover INT;
BEGIN
  SELECT COALESCE(SUM((LENGTH(content::text) - LENGTH(REPLACE(content::text, 'Morley', ''))) / LENGTH('Morley')), 0)
  INTO leftover
  FROM courses
  WHERE slug = 'c06-the-hermetic-tradition';

  IF leftover > 0 THEN
    RAISE EXCEPTION 'Migration failed: % "Morley" reference(s) still remain in c06-the-hermetic-tradition.', leftover;
  END IF;
END $$;
