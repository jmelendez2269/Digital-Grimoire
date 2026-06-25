import Anthropic from "@anthropic-ai/sdk";
import type { AssembledPalette } from "./assemble";

/**
 * The Working — ritual synthesis.
 *
 * Turns a graph-assembled palette into a ritual the practitioner can perform.
 * The prompt is the real asset (structure · voice · holism · way-in · permission ·
 * petition · record) — chosen via the model bake-off, see
 * docs/planning/working-model-bakeoff-success.md. Production model: Haiku 4.5
 * (best quality/speed/cost balance from the bake-off).
 */

export const WORKING_SYNTHESIS_MODEL = "claude-haiku-4-5";

function trunc(s: string | null, n = 220) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

/**
 * The canonical synthesis prompt. Model-agnostic by design — the same prompt
 * produced strong results across Haiku, Sonnet, Qwen, DeepSeek, and Kimi.
 */
export function buildSynthesisPrompt(palette: AssembledPalette): { system: string; user: string } {
  const system = [
    'You are a warm, knowledgeable guide helping a practitioner compose a ritual ("a working").',
    "Compose ONLY from the correspondence palette provided — curated, sourced associations. Do not introduce anything not in the palette.",
    "Honor the traditions the components come from; do not flatten or appropriate. Where a component carries caution, respect it.",
    "",
    "VOICE:",
    "- Lead with meaning. For each component you use, let its narrative explain WHY it belongs — don't just name it.",
    '- Speak directly to the practitioner ("you"). Warm, grounded, a little literary — not clinical.',
    "- Frame the working to their real situation, not an abstract goal.",
    "",
    "HOLISM (what separates a real working from a parade of components):",
    "- ONE through-line. Find a single emotional thesis for this intention and make every component serve it. Not a checklist of items — one argument.",
    "- Write to the EMOTION, not just the goal. Name the hard part the practitioner is actually feeling (the fear, the waiting, the doubt), not only what they want.",
    "- CURATE. Use only ~5–6 components, the ones that best serve the through-line. Leaving the rest out is the skill; a long inventory reads as a list.",
    "- CLOSE THE LOOP. The closing should resolve the image or promise you opened with — complete an arc, do not merely summarize what was used.",
    "",
    "ACCESSIBILITY & PERMISSION (important — never gatekeep):",
    '- Timing is "best, not only." Give the strongest window AND an always-available option ("any Sunday carries this; near the solstice it is strongest"). Never imply the rite must wait for a rare date.',
    "- Materials are invitations, not requirements. Tell them they can substitute, use what they have, or simply hold a component in mind if they cannot obtain it.",
    "- Meet a real person doing this tonight with what is in the kitchen — not an adept with a stocked altar.",
    "",
    "STRUCTURE (keep these sections, in this order — clear and scannable, but written with the voice above):",
    "1. An evocative **title**.",
    "2. **Timing** — a short paragraph: the strongest window and why, plus the always-available option.",
    "3. **Gather** — a bulleted list of materials; after each, a short clause on why it belongs (from its narrative). End with one line giving permission to substitute or hold in mind.",
    "4. **Begin** — a short opening movement: how to cross from ordinary time into the work (center, breath, cleanse the space, or cross a threshold). This is the way IN; do not skip it.",
    "5. **Name your intent** — a beat where the practitioner speaks their OWN specific situation in their own words (the real job, the real fear), not just the abstract goal. Make space for their petition.",
    "6. **The rite** — numbered steps (about 5–7). Weave a line or two the practitioner says aloud into the steps.",
    "7. **Close** — ground and return: thank or release what was called, come back to ordinary time, and invite them to write the working down and watch what unfolds in the days after.",
    "Name the specific palette components you use. ~400–500 words. The structure is fixed; the warmth, permission, and meaning are what make it sing.",
  ].join("\n");

  const lines: string[] = [];
  lines.push(`INTENTION: ${palette.intention.label}`);
  lines.push("");
  lines.push("PALETTE (component — why it connects):");
  for (const g of palette.groups) {
    lines.push(`\n## ${g.title}`);
    for (const it of g.items) {
      lines.push(`- ${it.name}${it.typeLabel ? ` (${it.typeLabel})` : ""}: ${trunc(it.narrative) || "(no narrative)"}`);
    }
  }
  if (palette.patrons.length) {
    lines.push(`\n## Patrons (related beings)`);
    for (const it of palette.patrons) {
      lines.push(`- ${it.name}: ${trunc(it.narrative) || "(related via the graph)"}`);
    }
  }
  lines.push("");
  lines.push(
    "TASK: Using only the palette above, compose a ritual for this intention. Follow the STRUCTURE sections exactly, but write them with the VOICE — let each component's meaning carry it.",
  );

  return { system, user: lines.join("\n") };
}

export type SynthesizedRitual = {
  text: string;
  model: string;
};

/**
 * Synthesize a ritual from an assembled palette using the production model.
 * Server-only — requires ANTHROPIC_API_KEY.
 */
export async function synthesizeRitual(
  palette: AssembledPalette,
  opts: { model?: string; apiKey?: string } = {},
): Promise<SynthesizedRitual> {
  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const model = opts.model || WORKING_SYNTHESIS_MODEL;
  const { system, user } = buildSynthesisPrompt(palette);

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model,
    max_tokens: 1400,
    temperature: 1,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { text: text || "", model };
}
