import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CORE_STUDY_TOOL_COUNT,
  type PlatformTotals,
} from "@/lib/platform/catalog";

interface PlatformCountError {
  code: string;
  details: string;
  hint: string;
  message: string;
}

function warnAboutCountFailure(label: string, error: PlatformCountError) {
  console.warn(`[platform totals] Failed to count ${label}:`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
}

export async function getPlatformTotals(
  supabase: SupabaseClient
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
    warnAboutCountFailure("Library books", booksResult.error);
  }
  if (coursesResult.error) {
    warnAboutCountFailure("published courses", coursesResult.error);
  }

  return {
    tools: CORE_STUDY_TOOL_COUNT,
    books: booksResult.error ? null : booksResult.count,
    courses: coursesResult.error ? null : coursesResult.count,
  };
}
