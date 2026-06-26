import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/working/community
 * Public feed of shared workings (no auth required).
 * Returns intent_text, conditions, shared_at, and ritual for display.
 * Palette excluded (large; not useful in a feed context).
 */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("workings")
      .select("id, intent_text, status, cast_at, conditions, shared_at, ritual, created_at")
      .not("shared_at", "is", null)
      .order("shared_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ workings: data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch community workings" },
      { status: 500 },
    );
  }
}
