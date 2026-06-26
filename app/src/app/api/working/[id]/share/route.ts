import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/working/[id]/share
 * Marks a working as shared (status=shared, shared_at=now()).
 * Must be cast first — only cast workings can be shared.
 */
export async function POST(_req: Request, { params }: Params) {
  try {
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceClient();

    // Verify ownership and that it's been cast
    const { data: existing } = await supabase
      .from("workings")
      .select("status, cast_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!existing.cast_at) {
      return NextResponse.json({ error: "Only cast workings can be shared" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("workings")
      .update({ status: "shared", shared_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, status, shared_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    return NextResponse.json({ working: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to share working" }, { status: 500 });
  }
}

/**
 * DELETE /api/working/[id]/share
 * Retracts sharing (status=cast, shared_at=null).
 */
export async function DELETE(_req: Request, { params }: Params) {
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
      .update({ status: "cast", shared_at: null })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, status, shared_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ working: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to unshare working" }, { status: 500 });
  }
}
