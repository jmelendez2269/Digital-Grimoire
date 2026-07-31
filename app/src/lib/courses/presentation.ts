export type CourseReleaseStatus = 'open-now' | 'coming-next' | 'coming-later';

export interface CoursePresentationRecord {
  slug: string;
  title: string;
  content?: {
    course_id_tag?: unknown;
    core_question?: unknown;
  } | null;
}

export interface CourseReleasePresentation {
  slug: string;
  title: string;
  courseIdTag: string | null;
  coreQuestion: string | null;
  releaseStatus: CourseReleaseStatus;
}

export interface CourseReleaseGroups<T extends CoursePresentationRecord> {
  current: T | null;
  next: T | null;
  open: T[];
  later: T[];
}

export interface CourseReleaseConfiguration {
  currentCourseSlug: string | null;
  nextCourseSlug: string | null;
  previouslyOpenedCourseSlugs: readonly string[];
}

function normalizeSlug(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function parseSlugList(value: string | null | undefined): string[] {
  if (!value) return [];

  return [...new Set(
    value
      .split(',')
      .map((slug) => normalizeSlug(slug))
      .filter((slug): slug is string => slug !== null),
  )];
}

/**
 * Release assignments are presentation metadata, separate from publication,
 * access, and a member's enrollment progress. No current/next assignment is
 * inferred from ordering or publication state.
 */
export const COURSE_RELEASE_CONFIGURATION: CourseReleaseConfiguration = {
  currentCourseSlug: normalizeSlug(
    process.env.NEXT_PUBLIC_PRISMARIUM_CURRENT_COURSE_SLUG,
  ),
  nextCourseSlug: normalizeSlug(
    process.env.NEXT_PUBLIC_PRISMARIUM_NEXT_COURSE_SLUG,
  ),
  previouslyOpenedCourseSlugs: parseSlugList(
    process.env.NEXT_PUBLIC_PRISMARIUM_PREVIOUSLY_OPENED_COURSE_SLUGS,
  ),
};

export const COURSE_RELEASE_LABELS: Record<CourseReleaseStatus, string> = {
  'open-now': 'Open now',
  'coming-next': 'Coming next',
  'coming-later': 'Coming later',
};

/**
 * Controls navigation in release-aware course presentation surfaces.
 * Server-side enrollment and content authorization remain separate.
 */
export function isCourseAvailable(
  releaseStatus: CourseReleaseStatus,
): boolean {
  return releaseStatus === 'open-now';
}

function getCourseIdTag(course: CoursePresentationRecord): string | null {
  const value = course.content?.course_id_tag;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getCoreQuestion(course: CoursePresentationRecord): string | null {
  const value = course.content?.core_question;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function isIntroductionCourse(course: CoursePresentationRecord): boolean {
  const tag = getCourseIdTag(course)?.toLowerCase();
  const slug = normalizeSlug(course.slug);

  return tag === 'pre' || slug === 'pre' || slug?.startsWith('pre-') === true;
}

export function isMainCourse(course: CoursePresentationRecord): boolean {
  const tag = getCourseIdTag(course)?.toLowerCase();
  const slug = normalizeSlug(course.slug);

  return (
    !isIntroductionCourse(course) &&
    tag !== 'taster' &&
    slug !== 'taster' &&
    slug?.startsWith('taster-') !== true
  );
}

export function getCourseReleaseStatus(
  course: CoursePresentationRecord,
  configuration: CourseReleaseConfiguration = COURSE_RELEASE_CONFIGURATION,
): CourseReleaseStatus {
  const slug = normalizeSlug(course.slug);
  const currentSlug = normalizeSlug(configuration.currentCourseSlug);
  const nextSlug = normalizeSlug(configuration.nextCourseSlug);
  const previouslyOpened = new Set(
    configuration.previouslyOpenedCourseSlugs
      .map((value) => normalizeSlug(value))
      .filter((value): value is string => value !== null),
  );

  if (
    isIntroductionCourse(course) ||
    (slug !== null &&
      ((isMainCourse(course) && slug === currentSlug) ||
        previouslyOpened.has(slug)))
  ) {
    return 'open-now';
  }

  if (
    slug !== null &&
    slug !== currentSlug &&
    !previouslyOpened.has(slug) &&
    isMainCourse(course) &&
    slug === nextSlug
  ) {
    return 'coming-next';
  }

  return 'coming-later';
}

export function getCourseReleasePresentation(
  course: CoursePresentationRecord,
  configuration: CourseReleaseConfiguration = COURSE_RELEASE_CONFIGURATION,
): CourseReleasePresentation {
  return {
    slug: course.slug,
    title: course.title,
    courseIdTag: getCourseIdTag(course),
    coreQuestion: getCoreQuestion(course),
    releaseStatus: getCourseReleaseStatus(course, configuration),
  };
}

export function groupCoursesByRelease<T extends CoursePresentationRecord>(
  courses: readonly T[],
  configuration: CourseReleaseConfiguration = COURSE_RELEASE_CONFIGURATION,
): CourseReleaseGroups<T> {
  const currentSlug = normalizeSlug(configuration.currentCourseSlug);
  const nextSlug = normalizeSlug(configuration.nextCourseSlug);
  const current = currentSlug
    ? courses.find(
        (course) =>
          normalizeSlug(course.slug) === currentSlug &&
          (isMainCourse(course) || isIntroductionCourse(course)) &&
          getCourseReleaseStatus(course, configuration) === 'open-now',
      ) ?? null
    : null;
  const next = nextSlug && nextSlug !== currentSlug
    ? courses.find(
        (course) =>
          normalizeSlug(course.slug) === nextSlug &&
          isMainCourse(course) &&
          getCourseReleaseStatus(course, configuration) === 'coming-next',
      ) ?? null
    : null;

  return {
    current,
    next,
    open: courses.filter(
      (course) =>
        (course !== current || isIntroductionCourse(course)) &&
        getCourseReleaseStatus(course, configuration) === 'open-now',
    ),
    later: courses.filter(
      (course) => getCourseReleaseStatus(course, configuration) === 'coming-later',
    ),
  };
}
