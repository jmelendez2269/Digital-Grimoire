import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assemblePalette, assemblePaletteForSlugs } from "@/lib/working/assemble";
import { resolveIntentSemantic } from "@/lib/working/resolve-intent";
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

    // Deterministic first; fall back to the semantic resolver (Phase 2.5) so
    // modern free-text intents ("a new job aligned with my highest timeline")
    // map onto the curated vocabulary.
    let palette = await assemblePalette(supabase, intention);
    let interpretation: string | undefined;
    if (!palette) {
      const resolved = await resolveIntentSemantic(supabase, intention);
      if (resolved) {
        interpretation = resolved.interpretation;
        palette = await assemblePaletteForSlugs(supabase, resolved.slugs, {
          slug: resolved.slugs[0],
          label: resolved.label,
          aliases: resolved.slugs.slice(1),
          matchedFrom: "fuzzy",
        });
      }
    }
    if (!palette) {
      return NextResponse.json(
        { error: `Could not map "${intention}" to the correspondence graph. Try different words.` },
        { status: 404 },
      );
    }

    const ritual = await synthesizeRitual(palette);

    const res = NextResponse.json({ palette, ritual, interpretation });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate working" },
      { status: 500 },
    );
  }
}
