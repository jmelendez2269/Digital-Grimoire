import "server-only";

import { unstable_cache } from "next/cache";

import { getSharedCoursePreviews } from "@/lib/home/member-home-data";
import { getPlatformTotals } from "@/lib/platform/totals.server";
import { createServiceClient } from "@/lib/supabase/service";

const loadCachedPublicHomeData = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const [platformTotals, coursePreviews] = await Promise.all([
      getPlatformTotals(supabase),
      getSharedCoursePreviews(supabase),
    ]);

    return { platformTotals, coursePreviews };
  },
  ["public-home-data-v2"],
  {
    revalidate: 300,
    tags: ["public-home-data", "platform-totals", "public-course-catalog"],
  }
);

export async function getCachedPublicHomeData() {
  return loadCachedPublicHomeData();
}
