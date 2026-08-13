import { assemblePalette } from "../src/lib/working/assemble";
import { createServiceClient } from "../src/lib/supabase/service";
import { synthesizeRitual } from "../src/lib/working/synthesize";

async function main(): Promise<void> {
  const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(localUrl)) {
    throw new Error("LEAN_L4_06_PREFLIGHT_REFUSED_NON_LOCAL_SUPABASE");
  }

  const palette = await assemblePalette(createServiceClient(), "clarity");
  if (!palette || palette.stats.totalReturned < 1) {
    throw new Error("LEAN_L4_06_PREFLIGHT_EMPTY_PALETTE");
  }

  console.log(
    JSON.stringify({
      stage: "palette",
      groups: palette.groups.length,
      components: palette.stats.totalReturned,
      patrons: palette.patrons.length,
    }),
  );

  if (process.argv.includes("--palette-only")) return;

  const ritual = await synthesizeRitual(palette);
  if (!ritual.text.trim()) {
    throw new Error("LEAN_L4_06_PREFLIGHT_EMPTY_RITUAL");
  }

  console.log(
    JSON.stringify({
      stage: "provider",
      model: ritual.model,
      inputUnits: ritual.usage.inputTokens,
      outputUnits: ritual.usage.outputTokens,
      resultCharacters: ritual.text.length,
      moderated: ritual.moderated,
    }),
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
