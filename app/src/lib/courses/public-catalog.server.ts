import "server-only";

import { unstable_cache } from "next/cache";

import {
  PUBLIC_CATALOG_FALLBACK_SELECT,
  PUBLIC_CATALOG_SELECT,
  shapePublicCatalogCourse,
  type PublicCatalogRow,
} from "@/lib/courses/public-catalog";
import { EMPTY_PLATFORM_TOTALS } from "@/lib/platform/catalog";
import { getPlatformTotals } from "@/lib/platform/totals.server";
import { createPublicServerClient } from "@/lib/supabase/public.server";
import { createServiceClient } from "@/lib/supabase/service";

type CatalogClient = ReturnType<typeof createServiceClient>;

async function loadCatalogWithClient(supabase: CatalogClient, select: string) {
  const [courseResult, totals] = await Promise.all([
    supabase
      .from("courses")
      .select(select)
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
}

const loadPublicCourseCatalog = unstable_cache(
  async () => {
    try {
      return await loadCatalogWithClient(
        createServiceClient(),
        PUBLIC_CATALOG_SELECT
      );
    } catch (error) {
      console.warn(
        "[public course catalog] Privileged projection unavailable; using public metadata fallback",
        error instanceof Error ? error.message : String(error)
      );

      return loadCatalogWithClient(
        createPublicServerClient(),
        PUBLIC_CATALOG_FALLBACK_SELECT
      );
    }
  },
  ["public-course-catalog-v3"],
  {
    revalidate: 300,
    tags: ["public-course-catalog", "platform-totals"],
  }
);

export async function getPublicCourseCatalog() {
  return loadPublicCourseCatalog();
}
