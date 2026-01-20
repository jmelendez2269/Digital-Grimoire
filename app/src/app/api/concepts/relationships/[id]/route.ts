import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

async function isAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { similarity, source_citation, notes } = body || {};

    const svc = createServiceClient();
    const updateData: any = {};

    if (similarity !== undefined) updateData.similarity = similarity;
    if (source_citation !== undefined) updateData.source_citation = source_citation;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await svc
      .from("convergence_relationships")
      .update(updateData)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ relationship: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update relationship" },
      { status: 500 }
    );
  }
}
