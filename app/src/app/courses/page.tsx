import CoursesCatalogClient from "@/components/courses/CoursesCatalogClient";
import { getPublicCourseCatalog } from "@/lib/courses/public-catalog.server";

export const revalidate = 300;

export default async function CoursesPage() {
  const catalog = await getPublicCourseCatalog();

  return (
    <CoursesCatalogClient
      initialCourses={catalog.courses}
      initialTotals={catalog.totals}
    />
  );
}
