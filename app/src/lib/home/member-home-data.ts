import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  COURSE_RELEASE_CONFIGURATION,
  getCourseReleaseStatus,
  isIntroductionCourse,
  isMainCourse,
  type CourseReleaseStatus,
} from "@/lib/courses/presentation";
import type { PlatformTotals } from "@/lib/platform/catalog";
import { getPlatformTotals } from "@/lib/platform/totals.server";
import { createServiceClient } from "@/lib/supabase/service";
import type { VerifiedUserIdentity } from "@/lib/supabase/identity";

export interface HomeCoursePreview {
  id: string;
  slug: string;
  title: string;
  question: string;
  courseIdTag: string | null;
  durationWeeks: number;
  releaseStatus: Extract<CourseReleaseStatus, "open-now" | "coming-next">;
}

export interface SharedCoursePreviews {
  currentPath: HomeCoursePreview | null;
  nextPath: HomeCoursePreview | null;
}

export interface HomeEnrollment {
  currentWeek: number;
  isCompleted: boolean;
}

export interface HomeResumeCourse extends HomeEnrollment {
  slug: string;
  title: string;
}

export interface RecentJournalEntry {
  id: string;
  title: string;
}

export interface SavedReading {
  id: string;
  title: string;
  author: string | null;
}

export interface GraphConnection {
  sourceName: string;
  targetName: string;
  href: string;
}

export interface MemberHomeData {
  memberName: string;
  journalName: string;
  platformTotals: PlatformTotals;
  currentPath: HomeCoursePreview | null;
  nextPath: HomeCoursePreview | null;
  currentEnrollment: HomeEnrollment | null;
  resumeCourse: HomeResumeCourse | null;
  recentJournalEntry: RecentJournalEntry | null;
  savedReading: SavedReading | null;
  graphConnection: GraphConnection | null;
}

export interface PublicCoursePreviewSource {
  id: string;
  slug: string;
  title: string;
  duration_weeks: number | null;
  content: {
    course_id_tag?: unknown;
    core_question?: unknown;
  } | null;
}

export interface HomeEnrollmentRow {
  course_id: string;
  current_week: number | null;
  progress: Record<string, unknown> | null;
  enrolled_at: string | null;
  courses:
    | {
        slug: string;
        title: string;
        duration_weeks: number | null;
        is_published: boolean;
      }
    | {
        slug: string;
        title: string;
        duration_weeks: number | null;
        is_published: boolean;
      }[]
    | null;
}

interface JournalRow {
  id: string;
  title: string | null;
}

interface BookmarkTextRow {
  id: string;
  title: string | null;
  author: string | null;
}

interface BookmarkRow {
  texts: BookmarkTextRow | BookmarkTextRow[] | null;
}

interface GraphRelationshipRow {
  source_id: string;
  target_id: string;
}

interface GraphEntityRow {
  id: string;
  name: string | null;
  slug: string | null;
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getMemberName(user: VerifiedUserIdentity): string {
  const metadata = user.user_metadata ?? {};
  return (
    cleanString(metadata.display_name) ??
    cleanString(metadata.username) ??
    cleanString(metadata.full_name) ??
    cleanString(user.email?.split("@")[0]) ??
    "there"
  );
}

function getJournalName(user: VerifiedUserIdentity): string {
  return cleanString(user.user_metadata?.journal_name) ?? "Study Journal";
}

function isEnrollmentComplete(
  enrollment: HomeEnrollmentRow,
  durationWeeks: number
): boolean {
  const progress = enrollment.progress ?? {};
  return (
    progress.completed === true ||
    progress.status === "completed" ||
    (durationWeeks > 0 && (enrollment.current_week ?? 1) >= durationWeeks)
  );
}

function getEnrollmentActivityTime(enrollment: HomeEnrollmentRow): number {
  const savedAt = enrollment.progress?.savedAt;
  const activityDate =
    typeof savedAt === "string" && Number.isFinite(Date.parse(savedAt))
      ? savedAt
      : enrollment.enrolled_at;

  return activityDate && Number.isFinite(Date.parse(activityDate))
    ? Date.parse(activityDate)
    : 0;
}

export function getResumeCourse(
  enrollments: HomeEnrollmentRow[]
): HomeResumeCourse | null {
  const candidates = enrollments
    .map((enrollment) => {
      const course = Array.isArray(enrollment.courses)
        ? enrollment.courses[0] ?? null
        : enrollment.courses;

      if (!course?.is_published) return null;

      const durationWeeks = course.duration_weeks ?? 8;
      return {
        slug: course.slug,
        title: course.title,
        currentWeek: Math.max(1, enrollment.current_week ?? 1),
        isCompleted: isEnrollmentComplete(enrollment, durationWeeks),
        activityTime: getEnrollmentActivityTime(enrollment),
      };
    })
    .filter((course): course is NonNullable<typeof course> => course !== null)
    .sort(
      (left, right) =>
        Number(left.isCompleted) - Number(right.isCompleted) ||
        right.activityTime - left.activityTime
    );

  const course = candidates[0];
  if (!course) return null;

  return {
    slug: course.slug,
    title: course.title,
    currentWeek: course.currentWeek,
    isCompleted: course.isCompleted,
  };
}

function toCoursePreview(
  course: PublicCoursePreviewSource,
  releaseStatus: HomeCoursePreview["releaseStatus"]
): HomeCoursePreview {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    question:
      cleanString(course.content?.core_question) ??
      "The core question for this path will be shared soon.",
    courseIdTag: cleanString(course.content?.course_id_tag),
    durationWeeks: course.duration_weeks ?? 8,
    releaseStatus,
  };
}

function getConfiguredSlugs(): string[] {
  return [
    COURSE_RELEASE_CONFIGURATION.currentCourseSlug,
    COURSE_RELEASE_CONFIGURATION.nextCourseSlug,
  ].filter((slug): slug is string => Boolean(slug));
}

async function getFeaturedGraphConnection(
  supabase: SupabaseClient
): Promise<GraphConnection | null> {
  const { data: relationshipData, error: relationshipError } = await supabase
    .from("correspondence_relationships")
    .select("source_id, target_id")
    .order("weight", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(12);

  if (relationshipError) {
    console.error(
      "[home] Failed to load a Knowledge Graph connection:",
      relationshipError
    );
    return null;
  }

  const relationship = (
    (relationshipData ?? []) as GraphRelationshipRow[]
  ).find(
    (candidate) =>
      Boolean(candidate.source_id) &&
      Boolean(candidate.target_id) &&
      candidate.source_id !== candidate.target_id
  );

  if (!relationship) {
    return null;
  }

  const { data: entityData, error: entityError } = await supabase
    .from("correspondences")
    .select("id, name, slug")
    .in("id", [relationship.source_id, relationship.target_id]);

  if (entityError) {
    console.error(
      "[home] Failed to load Knowledge Graph connection labels:",
      entityError
    );
    return null;
  }

  const entities = (entityData ?? []) as GraphEntityRow[];
  const source = entities.find(
    (entity) => entity.id === relationship.source_id
  );
  const target = entities.find(
    (entity) => entity.id === relationship.target_id
  );
  const sourceName = cleanString(source?.name);
  const targetName = cleanString(target?.name);

  if (!source || !target || !sourceName || !targetName) {
    return null;
  }

  const focus = cleanString(source.slug) ?? source.id;

  return {
    sourceName,
    targetName,
    href: `/graph?focus=${encodeURIComponent(focus)}`,
  };
}

export async function getSharedCoursePreviews(
  supabase: SupabaseClient
): Promise<SharedCoursePreviews> {
  const slugs = getConfiguredSlugs();
  if (slugs.length === 0) {
    return { currentPath: null, nextPath: null };
  }

  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, duration_weeks, content")
    .in("slug", slugs)
    .eq("is_published", true);

  if (error) {
    console.error("[home] Failed to load shared course presentation:", error);
    return { currentPath: null, nextPath: null };
  }

  return getSharedCoursePreviewsFromCourses(
    (data ?? []) as PublicCoursePreviewSource[]
  );
}

export function getSharedCoursePreviewsFromCourses(
  courses: readonly PublicCoursePreviewSource[]
): SharedCoursePreviews {
  // The current path may be the introduction course (PRE), which is not a
  // main course — mirrors groupCoursesByRelease in @/lib/courses/presentation.
  const currentCourse = courses.find(
    (course) =>
      course.slug === COURSE_RELEASE_CONFIGURATION.currentCourseSlug &&
      (isMainCourse(course) || isIntroductionCourse(course)) &&
      getCourseReleaseStatus(course) === "open-now"
  );
  const nextCourse = courses.find(
    (course) =>
      course.slug === COURSE_RELEASE_CONFIGURATION.nextCourseSlug &&
      isMainCourse(course) &&
      getCourseReleaseStatus(course) === "coming-next"
  );

  return {
    currentPath: currentCourse
      ? toCoursePreview(currentCourse, "open-now")
      : null,
    nextPath: nextCourse ? toCoursePreview(nextCourse, "coming-next") : null,
  };
}

export async function getMemberHomeData(
  supabase: SupabaseClient,
  user: VerifiedUserIdentity,
  platformTotalsOverride?: PlatformTotals,
  coursePreviewsOverride?: SharedCoursePreviews
): Promise<MemberHomeData> {
  const [
    courseResult,
    enrollmentResult,
    journalResult,
    bookmarkResult,
    graphConnection,
    platformTotals,
  ] = await Promise.all([
    coursePreviewsOverride ?? getSharedCoursePreviews(supabase),
    supabase
      .from("course_enrollments")
      .select(
        "course_id, current_week, progress, enrolled_at, courses!course_enrollments_course_id_fkey(slug, title, duration_weeks, is_published)"
      )
      .eq("user_id", user.id)
      .not("course_id", "is", null),
    supabase
      .from("journal_pages")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("user_bookmarks")
      .select("texts(id, title, author)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    getFeaturedGraphConnection(supabase),
    platformTotalsOverride ?? getPlatformTotals(createServiceClient()),
  ]);

  if (enrollmentResult.error) {
    console.error(
      "[home] Failed to load course enrollment:",
      enrollmentResult.error
    );
  }
  if (journalResult.error) {
    console.error(
      "[home] Failed to load recent journal entry:",
      journalResult.error
    );
  }
  if (bookmarkResult.error) {
    console.error("[home] Failed to load saved reading:", bookmarkResult.error);
  }

  const enrollments = (enrollmentResult.data ?? []) as HomeEnrollmentRow[];
  const currentEnrollmentRow = courseResult.currentPath
    ? (enrollments.find(
        (enrollment) => enrollment.course_id === courseResult.currentPath?.id
      ) ?? null)
    : null;

  const recentJournal = ((journalResult.data ?? []) as JournalRow[])[0] ?? null;
  const bookmark = ((bookmarkResult.data ?? []) as BookmarkRow[])[0] ?? null;
  const bookmarkText = Array.isArray(bookmark?.texts)
    ? (bookmark.texts[0] ?? null)
    : (bookmark?.texts ?? null);

  return {
    memberName: getMemberName(user),
    journalName: getJournalName(user),
    platformTotals,
    currentPath: courseResult.currentPath,
    nextPath: courseResult.nextPath,
    currentEnrollment:
      currentEnrollmentRow && courseResult.currentPath
        ? {
            currentWeek: Math.max(1, currentEnrollmentRow.current_week ?? 1),
            isCompleted: isEnrollmentComplete(
              currentEnrollmentRow,
              courseResult.currentPath.durationWeeks
            ),
          }
        : null,
    resumeCourse: getResumeCourse(enrollments),
    recentJournalEntry: recentJournal
      ? {
          id: recentJournal.id,
          title: cleanString(recentJournal.title) ?? "Untitled note",
        }
      : null,
    savedReading:
      bookmarkText && cleanString(bookmarkText.title)
        ? {
            id: bookmarkText.id,
            title: cleanString(bookmarkText.title) as string,
            author: cleanString(bookmarkText.author),
          }
        : null,
    graphConnection,
  };
}
