-- Align PRE's opening language with Prismarium's non-coercive philosophy.
-- The course invites inquiry into tensions; it does not presume that a
-- learner's thoughts or truths are mistakes in need of correction.

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
                '{title}',
                to_jsonb('What Happens When Belief Meets Uncertainty?'::text)
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
  premise = $premise$
Tensions do not all ask the same thing of us. Some become clearer through language, evidence, or context, while others remain alive because different ways of seeing illuminate different dimensions of the question.

This short course is an invitation to meet these tensions with curiosity, discernment, and care.

We begin with belief by noticing how openness, caution, evidence, trust, and timing shape the ways we respond. Then we turn toward perspective, attention, and the limits of conceptual grasping. The aim is not to prescribe one relationship with uncertainty, but to become more aware of what a question may be asking of us—and of what happens within us when we resolve it or let it remain open.
$premise$,
  description = 'Tensions do not all ask the same thing of us. Some become clearer through language, evidence, or context, while others remain alive because different ways of seeing illuminate different dimensions of the question.',
  content = rewritten_course.content,
  updated_at = now()
FROM rewritten_course
WHERE course.id = rewritten_course.id;

DO $$
DECLARE
  revised_premise text;
  revised_week_title text;
BEGIN
  SELECT
    course.premise,
    week.value->>'title'
  INTO revised_premise, revised_week_title
  FROM public.courses AS course
  CROSS JOIN LATERAL jsonb_array_elements(course.content->'weeks') AS week(value)
  WHERE course.slug = 'pre-how-to-hold-two-things-at-once'
    AND week.value->>'week_number' = '1';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRE Week 1 was not found.';
  END IF;

  IF revised_premise NOT LIKE 'Tensions do not all ask the same thing of us.%'
    OR revised_week_title IS DISTINCT FROM 'What Happens When Belief Meets Uncertainty?' THEN
    RAISE EXCEPTION 'PRE belief framing was not updated as expected.';
  END IF;
END $$;

COMMIT;
