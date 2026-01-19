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

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("convergence_traditions")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch traditions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { slug, label, color, icon, description, sort_order = 0, is_active = true } = body || {};
    if (!slug || !label) {
      return NextResponse.json({ error: "slug and label are required" }, { status: 400 });
    }
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("convergence_traditions")
      .insert({ slug, label, color, icon, description, sort_order, is_active })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ tradition: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create tradition" },
      { status: 500 }
    );
  }
}
