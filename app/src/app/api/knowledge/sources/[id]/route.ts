import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
    const { title, author, year, citation, url, notes } = body || {};
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (author !== undefined) updateData.author = author;
    if (year !== undefined) updateData.year = year;
    if (citation !== undefined) updateData.citation = citation;
    if (url !== undefined) updateData.url = url;
    if (notes !== undefined) updateData.notes = notes;

    const svc = createServiceClient();
    const { data, error } = await svc
      .from("knowledge_sources")
      .update(updateData)
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ source: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update source" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const svc = createServiceClient();
    const { error } = await svc
      .from("knowledge_sources")
      .delete()
      .eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete source" },
      { status: 500 }
    );
  }
}
