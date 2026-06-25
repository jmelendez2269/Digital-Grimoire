import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/working
 * Returns the authenticated user's workings, most recent first.
 * Palette is excluded from the list view (it's large; fetch /api/working/[id] for full detail).
 */
export async function GET() {
  try {
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("workings")
      .select("id, intent_text, model_used, status, cast_at, conditions, shared_at, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ workings: data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to list workings" },
      { status: 500 },
    );
  }
}
