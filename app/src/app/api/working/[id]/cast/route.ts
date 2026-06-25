import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stampConditions } from "@/lib/working/conditions";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/working/[id]/cast
 * Body: { cast_at?: string } — ISO timestamp; defaults to now().
 *
 * Marks a working as cast and auto-stamps the environmental conditions
 * (moon phase, planetary day-ruler, season) from the cast time.
 * Idempotent: re-casting updates the timestamp and re-stamps conditions.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    let castAt: Date;
    if (body?.cast_at) {
      castAt = new Date(body.cast_at);
      if (isNaN(castAt.getTime())) {
        return NextResponse.json({ error: "cast_at must be a valid ISO timestamp" }, { status: 400 });
      }
    } else {
      castAt = new Date();
    }

    const conditions = stampConditions(castAt);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("workings")
      .update({
        status: "cast",
        cast_at: castAt.toISOString(),
        conditions,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, status, cast_at, conditions")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ working: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to cast working" },
      { status: 500 },
    );
  }
}
