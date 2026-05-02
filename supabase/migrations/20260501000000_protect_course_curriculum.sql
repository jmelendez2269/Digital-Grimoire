-- Protect Prismarium-authored curriculum from direct public table reads.
-- Public users may read published course preview metadata. Full JSON curriculum
-- remains available through server APIs that verify admin or enrollment access.

BEGIN;

DROP POLICY IF EXISTS "Courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Published course previews are viewable by everyone" ON public.courses;

CREATE POLICY "Published course previews are viewable by everyone"
ON public.courses
FOR SELECT
USING (
  is_published = true
  OR EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

REVOKE ALL ON TABLE public.courses FROM anon;
REVOKE ALL ON TABLE public.courses FROM authenticated;

GRANT SELECT (
  id,
  title,
  slug,
  description,
  premise,
  learning_outcomes,
  course_type,
  level,
  duration_weeks,
  is_published,
  sort_order,
  created_at,
  updated_at
) ON public.courses TO anon, authenticated;

GRANT ALL ON TABLE public.courses TO service_role;

DROP POLICY IF EXISTS "Course texts are viewable by everyone" ON public.course_texts;
DROP POLICY IF EXISTS "Published course text references are viewable by everyone" ON public.course_texts;

CREATE POLICY "Published course text references are viewable by everyone"
ON public.course_texts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.courses
    WHERE courses.id = course_texts.course_id
      AND courses.is_published = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

REVOKE ALL ON TABLE public.course_texts FROM anon;
REVOKE ALL ON TABLE public.course_texts FROM authenticated;

GRANT SELECT (
  id,
  course_id,
  text_id,
  week_number,
  selection_notes,
  is_required,
  created_at
) ON public.course_texts TO anon, authenticated;

GRANT ALL ON TABLE public.course_texts TO service_role;

COMMIT;
