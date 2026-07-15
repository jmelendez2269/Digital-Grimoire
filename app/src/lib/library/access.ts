import { getCourseAccessTier } from '@/lib/courses/access';

// Loosely typed on purpose: this is called with both the anon SSR client
// (middleware, page routes) and the service-role client, whose generated
// generic types are too deep/incompatible to structurally unify here.
type QueryableClient = {
  from: (table: string) => {
    select: (columns: string) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
  };
};

type CourseAccessInput = Parameters<typeof getCourseAccessTier>[0];

/**
 * A text counts as free when it's linked (via course_texts) to a course
 * that getCourseAccessTier classifies as 'free' (the taster/pre-course).
 * There's no separate is_free flag on texts — this mirrors the course
 * access tier instead of duplicating it.
 */
export async function getFreeLibraryTextIds(client: QueryableClient): Promise<Set<string>> {
  const { data: courses } = await client.from('courses').select('id, slug, title, content');

  const freeCourseIds = new Set(
    ((courses ?? []) as CourseAccessInput[])
      .filter((course) => getCourseAccessTier(course) === 'free')
      .map((course) => course.id as string)
  );

  if (freeCourseIds.size === 0) return new Set();

  const { data: courseTexts } = await client.from('course_texts').select('course_id, text_id');

  return new Set(
    ((courseTexts ?? []) as Array<{ course_id: string; text_id: string }>)
      .filter((row) => freeCourseIds.has(row.course_id))
      .map((row) => row.text_id)
  );
}

export async function isFreeLibraryText(client: QueryableClient, textId: string): Promise<boolean> {
  const freeIds = await getFreeLibraryTextIds(client);
  return freeIds.has(textId);
}
