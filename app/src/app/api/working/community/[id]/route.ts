import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/working/community/[id]
 * Returns a single shared working by ID (no auth required).
 * Returns 404 if the working doesn't exist or isn't shared.
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("workings")
      .select("id, intent_text, status, cast_at, conditions, shared_at, ritual, created_at")
      .eq("id", id)
      .not("shared_at", "is", null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ working: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch working" },
      { status: 500 },
    );
  }
}
