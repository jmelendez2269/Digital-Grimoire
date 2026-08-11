-- Make PRE Week 1 reading identities and the shipowner assignment explicit.
-- The original V2 import treated trailing authors as section names, and the
-- Keystone shorthand did not tell learners what Clifford's example contains.

BEGIN;

WITH rewritten_course AS (
  SELECT
    course.id,
    jsonb_set(
      course.content,
      '{weeks}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN week.value->>'week_number' = '1' THEN
              jsonb_set(
                week.value,
                '{readings}',
                (
                  SELECT jsonb_agg(
                    CASE reading.value->>'title'
                      WHEN 'The Ethics of Belief' THEN
                        jsonb_set(
                          jsonb_set(
                            (reading.value - 'section')
                              || jsonb_build_object('author', 'William Kingdon Clifford'),
                            '{tiers,keystone,reference}',
                            to_jsonb('Part I, opening shipowner example'::text)
                          ),
                          '{tiers,keystone,description}',
                          to_jsonb(
                            'Clifford asks us to imagine a shipowner who suppresses serious doubts about an unsafe vessel, convinces himself it is sound, and sends passengers to their deaths.'::text
                          )
                        )
                      WHEN 'The Will to Believe' THEN
                        (reading.value - 'section')
                          || jsonb_build_object('author', 'William James')
                      WHEN 'An Enquiry Concerning Human Understanding' THEN
                        (reading.value - 'section')
                          || jsonb_build_object('author', 'David Hume')
                      ELSE reading.value
                    END
                    ORDER BY reading.ordinality
                  )
                  FROM jsonb_array_elements(week.value->'readings')
                    WITH ORDINALITY AS reading(value, ordinality)
                )
              )
            ELSE week.value
          END
          ORDER BY week.ordinality
        )
        FROM jsonb_array_elements(course.content->'weeks')
          WITH ORDINALITY AS week(value, ordinality)
      )
    ) AS content
  FROM public.courses AS course
  WHERE course.slug = 'pre-how-to-hold-two-things-at-once'
)
UPDATE public.courses AS course
SET
  content = rewritten_course.content,
  updated_at = now()
FROM rewritten_course
WHERE course.id = rewritten_course.id;

DO $$
DECLARE
  shipowner_reference text;
  shipowner_summary text;
BEGIN
  SELECT
    reading.value #>> '{tiers,keystone,reference}',
    reading.value #>> '{tiers,keystone,description}'
  INTO shipowner_reference, shipowner_summary
  FROM public.courses AS course
  CROSS JOIN LATERAL jsonb_array_elements(course.content->'weeks') AS week(value)
  CROSS JOIN LATERAL jsonb_array_elements(week.value->'readings') AS reading(value)
  WHERE course.slug = 'pre-how-to-hold-two-things-at-once'
    AND reading.value->>'title' = 'The Ethics of Belief';

  IF shipowner_reference IS DISTINCT FROM 'Part I, opening shipowner example'
    OR shipowner_summary NOT LIKE 'Clifford asks us to imagine a shipowner%' THEN
    RAISE EXCEPTION 'PRE shipowner reading context was not updated as expected.';
  END IF;
END $$;

COMMIT;
