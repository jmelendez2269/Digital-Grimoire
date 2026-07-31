"use client";

import Link from "next/link";
import { FlaskConical, Sparkles, ArrowRight, Moon, Flame, Leaf, BookOpen } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RitualMarkdown from "@/components/working/RitualMarkdown";

const SAMPLE_INTENTION = "clarity before a difficult decision";

const SAMPLE_RITUAL = `## Timing

Work on a **Wednesday** — Mercury's day, the planet of discernment and clear communication between inner and outer worlds. Near the **waning Moon**, when the sky is releasing what no longer serves, is ideal. But do not wait for perfection: any Wednesday evening will carry this current.

## Gather

- **A white or silver candle** — light that reveals without distorting, the lantern rather than the flame.
- **Mugwort or bay leaf** — both have long associations with prophetic clarity and the opening of inner sight.
- **Lapis lazuli or clear quartz** — lapis for truth that comes from depth; quartz if you need to clear static first.
- **Paper and pen** — the decision itself, written out. Not the outcome you want: the actual choice in front of you.
- **A small bowl of water** — Mercury moves between worlds; water holds what the mind cannot yet name.

*Use what you have. Hold the meaning of anything missing in mind — the focus is the vessel.*

## Begin

Sit where you will not be interrupted. Write the decision on the paper — the real one, the one that has been sitting in your chest — and place it face-down beneath the candle. Light the candle. Three slow breaths. On the third exhale, say aloud or silently: *"I step out of wanting and into knowing."*

## Name your intent

Speak plainly to the room. Not the outcome you hope for — the actual fear underneath the choice: the thing you are afraid to see clearly. Let it be unpolished. *"This is what I cannot yet see. This is what I am afraid the answer will be."*

## The rite

1. Hold the stone in your writing hand. Feel its weight — something that formed slowly, under pressure. *"I am not in a hurry for what is already true."*
2. Pass the paper through the candle's smoke (do not burn it): *"Let what is obscured become visible."*
3. Crumble the bay leaf (or hold the mugwort) over the bowl of water: *"I open the channel between what I know and what I am willing to know."*
4. Sit in silence for as long as feels right — five minutes, ten. Do not try to decide. Watch the candle. Watch what surfaces.
5. When something comes — a word, an image, a feeling in the body — write it down immediately, without editing.

## Close

Thank Mercury's quick intelligence and the Moon's honest reflection. Snuff the candle (do not blow it out — hold the intention sealed, not scattered). Keep the paper and what you wrote. Read it again in three days.

*Clarity rarely arrives as a verdict. It arrives as a quiet shift in what you are willing to see.*
`;

const SAMPLE_PALETTE = [
  { label: "Planet", value: "Mercury", icon: "☿" },
  { label: "Day", value: "Wednesday", icon: "🌿" },
  { label: "Moon Phase", value: "Waning Crescent", icon: "🌘" },
  { label: "Element", value: "Air / Water", icon: "💨" },
  { label: "Herbs", value: "Mugwort, Bay Leaf", icon: "🌿" },
  { label: "Stone", value: "Lapis Lazuli", icon: "🔵" },
  { label: "Candle", value: "White or Silver", icon: "🕯️" },
];

function StaticPalette() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-[10px] font-mono text-amber-500/50 uppercase tracking-widest mb-4">
        Assembled correspondence palette
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SAMPLE_PALETTE.map(({ label, value, icon }) => (
          <div key={label} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm text-zinc-300 font-medium">
              <span className="mr-1.5">{icon}</span>{value}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-600 mt-4 leading-relaxed">
        The Working pulls correspondences from the Knowledge Graph — planetary rulers, elemental associations,
        botanical and mineral affinities — and assembles them into a coherent palette for your specific intention.
      </p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <BookOpen size={16} className="text-amber-500/70" />,
      title: "State an intention",
      body: "Write what you are working toward in plain language. The engine reads meaning, not keywords.",
    },
    {
      icon: <Flame size={16} className="text-amber-500/70" />,
      title: "The engine assembles",
      body: "The Working queries the Knowledge Graph — plants, stones, planets, timing, tradition — and builds a correspondence palette unique to your intent.",
    },
    {
      icon: <Leaf size={16} className="text-amber-500/70" />,
      title: "A ritual is synthesized",
      body: "From the palette, a complete ritual is written: timing, materials, the rite itself, and a close. Grounded in tradition. Written for a real person doing this tonight.",
    },
    {
      icon: <Moon size={16} className="text-amber-500/70" />,
      title: "Cast it. Record it. Watch.",
      body: "The conditions at the moment you cast are stamped to your record — moon phase, planetary ruler, season. Then you watch what unfolds.",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {steps.map((step, i) => (
        <div key={i} className="rounded-xl bg-zinc-950 border border-zinc-800 p-5">
          <div className="flex items-center gap-2.5 mb-2">
            {step.icon}
            <h3 className="text-sm font-semibold text-zinc-200">{step.title}</h3>
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">{step.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function WorkingsLandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-20 max-w-3xl">

        {/* Hero */}
        <div className="mb-14">
          <div className="flex items-center gap-2.5 mb-4">
            <FlaskConical size={20} className="text-amber-500/70" />
            <p className="text-xs font-mono text-amber-500/70 uppercase tracking-widest">
              The Working
            </p>
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-4 leading-tight">
            State an intention.<br />Receive a ritual.
          </h1>
          <p className="text-base text-zinc-500 max-w-xl leading-relaxed">
            The Working synthesizes rituals from the correspondence knowledge graph. State what you are working
            toward in plain language — the engine assembles the palette and writes the rite.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-14">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-5">
            How it works
          </p>
          <HowItWorks />
        </div>

        {/* Sample working */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              Sample working
            </p>
            <span className="text-xs text-zinc-600 font-mono bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
              intent: &ldquo;{SAMPLE_INTENTION}&rdquo;
            </span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 mb-4">
            <div className="mb-5">
              <span className="text-[10px] font-mono text-amber-500/50 uppercase tracking-widest">
                The ritual
              </span>
            </div>
            <RitualMarkdown content={SAMPLE_RITUAL} />
          </div>

          <StaticPalette />
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-amber-900/30 bg-amber-950/10 p-8 text-center">
          <div className="flex justify-center mb-4">
            <Sparkles size={28} className="text-amber-500/60" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">
            Generate your own working
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-7 leading-relaxed">
            Free with an account. State your intention, receive your ritual, cast it, and record what unfolds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
            >
              <Sparkles size={14} />
              Create a free account
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-zinc-700 hover:bg-zinc-900 text-zinc-300 font-medium text-sm transition-colors"
            >
              Sign in
              <ArrowRight size={14} />
            </Link>
          </div>
          <p className="text-xs text-zinc-600 mt-5">
            Already exploring?{" "}
            <Link href="/explore/workings" className="text-zinc-500 hover:text-zinc-400 underline underline-offset-2 transition-colors">
              Browse community workings
            </Link>
          </p>
        </div>

      </main>

      <Footer />
    </div>
  );
}
