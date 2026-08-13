import type { AssembledPalette } from "@/lib/working/assemble";

export interface RecordedWorkingDemo {
  intention: string;
  capturedAt: string;
  provenance: string;
  interpretation: string;
  ritual: string;
  palette: AssembledPalette;
}

/**
 * Editorial fixture written for the public Working preview. It is not derived
 * from a member working and can be rendered without contacting the database or
 * a model provider.
 */
export const RECORDED_WORKING_DEMO = {
  intention: "find steadiness before a difficult conversation",
  capturedAt: "2026-08-13T16:00:00.000Z",
  provenance:
    "An editorial example created for this preview. It is not a member's working.",
  interpretation:
    "Steadiness, clear communication, courage, and a grounded return to what can be said honestly.",
  ritual: `## The Working of the Steady Voice

### Purpose

This working is for the hour before a conversation that matters. It does not promise control over the other person or the outcome. Its purpose is simpler: to help you arrive grounded enough to listen, speak plainly, and remain present when the exchange becomes difficult.

### Gather

- A small bowl of water
- A smooth stone that fits comfortably in your hand
- A sprig of rosemary, or a pinch of the dried herb
- A sheet of paper and a pen

Use what you already have. The practice lives in the attention you bring, not in perfect materials.

### Prepare

Place the bowl in front of you and the stone beside it. Write one sentence that begins, **“What I most need to say honestly is…”** Do not write an argument. Write the truth beneath the argument.

Set the rosemary on the paper. Take four slow breaths, making each exhale a little longer than the inhale. Feel the floor carrying your weight.

### The rite

1. Hold the stone in both hands. Name three things you can feel in your body without trying to change them.
2. Touch the rosemary to the water and say: *“Let clarity be clean, not sharp.”*
3. Read your sentence aloud once. Then turn the paper face down.
4. Ask: *“What would listening require of me?”* Sit quietly until one practical answer appears.
5. Dip two fingers into the water and touch your throat, then your sternum. Say: *“A steady voice. An open ear. A boundary I can keep without cruelty.”*

### Close

Carry the stone into the conversation if that feels useful. Let it remind you that steadiness is not silence and honesty is not force. Pour the water onto soil after the conversation, then record what changed in you—whether or not the outcome changed around you.
`,
  palette: {
    intention: {
      slug: "steadiness",
      label: "Steadiness",
      aliases: ["clarity", "courage", "communication"],
      matchedFrom: "fuzzy",
    },
    groups: [
      {
        key: "timing",
        title: "Timing",
        items: [
          {
            id: "demo-wednesday",
            slug: "wednesday",
            name: "Wednesday",
            category: "weekday",
            typeLabel: "Day of Mercury",
            narrative:
              "Traditionally associated with language, exchange, discernment, and the movement of meaning between people.",
            matchedVia: ["communication", "clarity"],
          },
        ],
      },
      {
        key: "materials",
        title: "Materials",
        items: [
          {
            id: "demo-rosemary",
            slug: "rosemary",
            name: "Rosemary",
            category: "herb_garden",
            typeLabel: "Herb",
            narrative:
              "Used here as a sensory anchor for remembrance, clarity, and deliberate speech.",
            matchedVia: ["clarity"],
          },
          {
            id: "demo-smooth-stone",
            slug: "smooth-stone",
            name: "Smooth stone",
            category: "stone",
            typeLabel: "Grounding object",
            narrative:
              "A simple weight in the hand can return attention to the body when a conversation becomes charged.",
            matchedVia: ["steadiness", "courage"],
          },
        ],
      },
      {
        key: "energetics",
        title: "Energetics",
        items: [
          {
            id: "demo-water",
            slug: "water",
            name: "Water",
            category: "element",
            typeLabel: "Element",
            narrative:
              "Water supports receptivity and response: yielding enough to listen without surrendering one's shape.",
            matchedVia: ["communication", "steadiness"],
          },
          {
            id: "demo-blue",
            slug: "blue",
            name: "Blue",
            category: "color",
            typeLabel: "Color",
            narrative:
              "A visual cue for spaciousness, calm attention, and words chosen with care.",
            matchedVia: ["clarity", "communication"],
          },
        ],
      },
    ],
    patrons: [],
    stats: {
      intentionSlugsUnioned: [
        "steadiness",
        "clarity",
        "courage",
        "communication",
      ],
      totalMatched: 18,
      totalReturned: 5,
    },
  },
} satisfies RecordedWorkingDemo;
