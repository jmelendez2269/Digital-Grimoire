import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assemblePalette } from "@/lib/working/assemble";
import { synthesizeRitual } from "@/lib/working/synthesize";

/**
 * POST /api/working/generate
 * Body: { intention: string }  — a slug or free-text intent ("attract prosperity")
 *
 * Assembles a graph-grounded palette and synthesizes a ritual from it.
 * Returns { palette, ritual } so the UI can show both the sourced components
 * and the composed working.
 */
export const maxDuration = 60; // ritual synthesis can take ~15–35s

export async function POST(req: Request) {
  try {
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

    const supabase = createServiceClient();
    const palette = await assemblePalette(supabase, intention);
    if (!palette) {
      return NextResponse.json(
        { error: `No intention matched "${intention}". Try a different word.` },
        { status: 404 },
      );
    }

    const ritual = await synthesizeRitual(palette);

    const res = NextResponse.json({ palette, ritual });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate working" },
      { status: 500 },
    );
  }
}
