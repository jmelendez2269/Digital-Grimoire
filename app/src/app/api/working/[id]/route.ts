import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/working/[id]
 * Full working record including palette snapshot.
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("workings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
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

/**
 * PATCH /api/working/[id]
 * Update mutable fields: intent_text only (palette + ritual are immutable snapshots;
 * conditions are stamped by the /cast sub-route).
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { intent_text } = body;

    if (!intent_text || typeof intent_text !== "string" || !intent_text.trim()) {
      return NextResponse.json({ error: "intent_text is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("workings")
      .update({ intent_text: intent_text.trim() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, intent_text, status, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ working: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update working" },
      { status: 500 },
    );
  }
}
