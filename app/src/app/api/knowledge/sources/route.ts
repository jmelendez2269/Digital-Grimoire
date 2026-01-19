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
      .from("knowledge_sources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch sources" },
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
    const { title, author, year, citation, url, notes } = body || {};
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("knowledge_sources")
      .insert({ title, author, year, citation, url, notes })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ source: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create source" },
      { status: 500 }
    );
  }
}
