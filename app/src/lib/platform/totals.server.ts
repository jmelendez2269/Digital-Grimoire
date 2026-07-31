import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CORE_STUDY_TOOL_COUNT,
  type PlatformTotals,
} from "@/lib/platform/catalog";

export async function getPlatformTotals(
  supabase: SupabaseClient,
): Promise<PlatformTotals> {
  const [booksResult, coursesResult] = await Promise.all([
    supabase
      .from("texts")
      .select("id", { count: "exact", head: true })
      .is("parent_id", null)
      .eq("status", "ready"),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
  ]);

  if (booksResult.error) {
    console.error("[platform totals] Failed to count Library books:", booksResult.error);
  }
  if (coursesResult.error) {
    console.error("[platform totals] Failed to count published courses:", coursesResult.error);
  }

  return {
    tools: CORE_STUDY_TOOL_COUNT,
    books: booksResult.error ? null : booksResult.count,
    courses: coursesResult.error ? null : coursesResult.count,
  };
}
