import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assemblePalette } from "@/lib/working/assemble";

/**
 * POST /api/working/assemble
 * Body: { intention: string }  — a slug or free-text intent ("attract prosperity")
 *
 * Returns a graph-grounded ritual palette for The Working: components grouped
 * by category, each with its approved narrative, plus one-hop patron beings.
 */
export async function POST(req: Request) {
  try {
    // Auth: The Working is a practitioner feature.
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const intention = typeof body?.intention === "string" ? body.intention : "";
    if (!intention.trim()) {
      return NextResponse.json({ error: "intention is required" }, { status: 400 });
    }

    // Graph data is public-read; service client keeps the query simple.
    const supabase = createServiceClient();
    const palette = await assemblePalette(supabase, intention);

    if (!palette) {
      return NextResponse.json(
        { error: `No intention matched "${intention}". Try a different word.` },
        { status: 404 },
      );
    }

    const res = NextResponse.json({ palette });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to assemble palette" },
      { status: 500 },
    );
  }
}
