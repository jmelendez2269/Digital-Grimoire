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
    const { slug, label, color, icon, description, sort_order, is_active } = body || {};
    const updateData: any = {};
    if (slug !== undefined) updateData.slug = slug;
    if (label !== undefined) updateData.label = label;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const svc = createServiceClient();
    const { data, error } = await svc
      .from("convergence_traditions")
      .update(updateData)
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ tradition: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update tradition" },
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
      .from("convergence_traditions")
      .delete()
      .eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete tradition" },
      { status: 500 }
    );
  }
}
