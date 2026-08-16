import "server-only";

import { unstable_cache } from "next/cache";

import {
  PUBLIC_CATALOG_SELECT,
  shapePublicCatalogCourse,
  type PublicCatalogRow,
} from "@/lib/courses/public-catalog";
import { EMPTY_PLATFORM_TOTALS } from "@/lib/platform/catalog";
import { getPlatformTotals } from "@/lib/platform/totals.server";
import { createServiceClient } from "@/lib/supabase/service";

const loadPublicCourseCatalog = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const [courseResult, totals] = await Promise.all([
      supabase
        .from("courses")
        .select(PUBLIC_CATALOG_SELECT)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true }),
      getPlatformTotals(supabase).catch((error) => {
        console.error("[public course catalog] Failed to load totals", error);
        return EMPTY_PLATFORM_TOTALS;
      }),
    ]);

    if (courseResult.error) {
      throw new Error(
        `Failed to load public course catalog: ${courseResult.error.message}`
      );
    }

    return {
      courses: ((courseResult.data ?? []) as unknown as PublicCatalogRow[]).map(
        shapePublicCatalogCourse
      ),
      totals,
    };
  },
  ["public-course-catalog-v2"],
  {
    revalidate: 300,
    tags: ["public-course-catalog", "platform-totals"],
  }
);

export async function getPublicCourseCatalog() {
  return loadPublicCourseCatalog();
}
