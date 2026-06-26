"use client";

import Link from "next/link";
import { Network, Search, Sparkles, ArrowRight, FlaskConical } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const tools = [
  {
    name: "Knowledge Graph",
    description:
      "Traverse the correspondence graph — 1,980+ entities across traditions, connected by type, weight, and symbolic relationship. Follow a thread from stone to planet to deity.",
    href: "/graph",
    icon: Network,
    accent: "cyan",
  },
  {
    name: "Concept Search",
    description:
      "Semantic search across the library corpus. Find how a concept echoes across texts, traditions, and centuries — not keyword matching, but meaning matching.",
    href: "/search",
    icon: Search,
    accent: "violet",
  },
  {
    name: "Parallax Engine",
    description:
      "Ask one question through seven interpretive lenses simultaneously — Hermetic, Kabbalistic, Thelemic, Gnostic, and more. See where traditions converge and where they diverge.",
    href: "/seven-lenses",
    icon: Sparkles,
    accent: "amber",
  },
  {
    name: "Shared Workings",
    description:
      "Workings cast and shared by practitioners — intentions stated, rituals synthesized, conditions stamped at the moment of casting. A living record of practice.",
    href: "/explore/workings",
    icon: FlaskConical,
    accent: "emerald",
  },
];

const accentMap: Record<string, { border: string; icon: string; arrow: string; glow: string }> = {
  cyan:    { border: "border-cyan-500/20 hover:border-cyan-500/50",    icon: "text-cyan-400",    arrow: "text-cyan-400",    glow: "group-hover:shadow-[0_0_30px_rgba(6,182,212,0.08)]"   },
  violet:  { border: "border-violet-500/20 hover:border-violet-500/50", icon: "text-violet-400",  arrow: "text-violet-400",  glow: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]" },
  amber:   { border: "border-amber-500/20 hover:border-amber-500/50",   icon: "text-amber-400",   arrow: "text-amber-400",   glow: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]"  },
  emerald: { border: "border-emerald-500/20 hover:border-emerald-500/50", icon: "text-emerald-400", arrow: "text-emerald-400", glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]" },
};

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-3xl w-full">
          <div className="mb-14 text-center">
            <p className="text-xs font-mono text-cyan-500 uppercase tracking-[0.25em] mb-4">Explore</p>
            <h1 className="text-4xl font-bold text-zinc-100 mb-4 tracking-tight">
              Navigate the knowledge network
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-xl mx-auto">
              Three tools for moving through the archive — by connection, by concept, or by lens.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const a = accentMap[tool.accent];
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`group flex items-start gap-5 p-6 rounded-xl bg-zinc-950 border transition-all duration-300 ${a.border} ${a.glow}`}
                >
                  <div className="mt-0.5 shrink-0">
                    <Icon className={`w-6 h-6 ${a.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base font-semibold text-zinc-100">{tool.name}</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{tool.description}</p>
                  </div>
                  <div className="shrink-0 mt-1">
                    <ArrowRight className={`w-4 h-4 ${a.arrow} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
