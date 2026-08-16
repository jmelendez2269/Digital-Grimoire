import "server-only";

import { getPublicCourseCatalog } from "@/lib/courses/public-catalog.server";
import { getSharedCoursePreviewsFromCourses } from "@/lib/home/member-home-data";

export async function getCachedPublicHomeData() {
  const { courses, totals } = await getPublicCourseCatalog();

  return {
    platformTotals: totals,
    coursePreviews: getSharedCoursePreviewsFromCourses(courses),
  };
}
