-- Per-reading blurb draft/review workflow.
--
-- A blurb is a 150-250 word summary of what a single course reading argues,
-- written so a seeker who chooses not to read the source still gets the
-- central claim and why this week's question needs it. Mirrors the curator
-- note draft workflow on `texts`, but readings live nested inside
-- courses.content JSONB so we key by a stable `reading_id` slug that the
-- companion backfill script writes into each reading.

CREATE TABLE IF NOT EXISTS reading_blurbs (
  reading_id    TEXT PRIMARY KEY,
  course_slug   TEXT NOT NULL,
  week_number   INT  NOT NULL,
  text_title    TEXT NOT NULL,
  blurb_live    TEXT,
  blurb_draft   TEXT,
  status        TEXT NOT NULL DEFAULT 'none'
                  CHECK (status IN ('none', 'draft_pending', 'live', 'draft_rejected')),
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reading_blurbs_status_draft_idx
  ON reading_blurbs (status)
  WHERE status = 'draft_pending';

CREATE INDEX IF NOT EXISTS reading_blurbs_course_week_idx
  ON reading_blurbs (course_slug, week_number);

COMMENT ON TABLE reading_blurbs IS
  'Per-course-reading summary blurbs (if you skip the reading, here is what mattered). Draft -> review -> live workflow.';
COMMENT ON COLUMN reading_blurbs.reading_id IS
  'Stable slug stored on each reading inside courses.content (e.g. c06-w3-lives-alchemystical-philosophers).';
COMMENT ON COLUMN reading_blurbs.blurb_live IS
  'The published blurb shown to seekers once a learn-page surface ships.';
COMMENT ON COLUMN reading_blurbs.blurb_draft IS
  'AI-generated or human-authored draft awaiting review.';
COMMENT ON COLUMN reading_blurbs.status IS
  'none | draft_pending | live | draft_rejected';

CREATE OR REPLACE FUNCTION reading_blurbs_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reading_blurbs_touch_updated_at_trg ON reading_blurbs;
CREATE TRIGGER reading_blurbs_touch_updated_at_trg
  BEFORE UPDATE ON reading_blurbs
  FOR EACH ROW
  EXECUTE FUNCTION reading_blurbs_touch_updated_at();
