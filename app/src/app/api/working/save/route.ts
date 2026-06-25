import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/working/save
 * Body: { intent_text, palette, ritual, model_used, status? }
 *
 * Persists a generated working as a draft experiment. The palette and ritual
 * are snapshotted at save time so the record is self-contained regardless
 * of future graph changes.
 */
export async function POST(req: Request) {
  try {
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { intent_text, palette, ritual, model_used, status = "draft" } = body;

    if (!intent_text || typeof intent_text !== "string" || !intent_text.trim()) {
      return NextResponse.json({ error: "intent_text is required" }, { status: 400 });
    }
    if (!palette || typeof palette !== "object") {
      return NextResponse.json({ error: "palette is required" }, { status: 400 });
    }
    if (typeof ritual !== "string") {
      return NextResponse.json({ error: "ritual is required" }, { status: 400 });
    }
    if (!["draft", "cast"].includes(status)) {
      return NextResponse.json({ error: "status must be draft or cast" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("workings")
      .insert({
        user_id: user.id,
        intent_text: intent_text.trim(),
        palette,
        ritual,
        model_used: model_used || "",
        status,
      })
      .select("id, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id, created_at: data.created_at }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save working" },
      { status: 500 },
    );
  }
}
