"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { AssembledPalette, PaletteItem } from "@/lib/working/assemble";

function PaletteItemCard({ item }: { item: PaletteItem }) {
  return (
    <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-3">
      <div className="text-sm font-medium text-zinc-200">{item.name}</div>
      {item.typeLabel && (
        <div className="text-xs text-zinc-600 mt-0.5">{item.typeLabel}</div>
      )}
      {item.narrative && (
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-3">
          {item.narrative}
        </p>
      )}
      {item.matchedVia.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.matchedVia.map((v) => (
            <span
              key={v}
              className="text-[10px] font-mono text-amber-500/50 bg-amber-500/5 border border-amber-500/10 rounded px-1.5 py-0.5"
            >
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PalettePanel({ palette }: { palette: AssembledPalette }) {
  const [open, setOpen] = useState(false);

  const allGroups: Array<{ key: string; title: string; items: PaletteItem[] }> = [
    ...palette.groups,
    ...(palette.patrons.length > 0
      ? [{ key: "patrons-hop", title: "Patrons & Beings", items: palette.patrons }]
      : []),
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles size={13} className="text-amber-500/50" />
          <span className="font-mono text-xs uppercase tracking-widest">
            Correspondence palette · {palette.stats.totalReturned} components
          </span>
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="border-t border-zinc-800 p-5 space-y-6">
          {palette.intention.matchedFrom !== "slug" && (
            <p className="text-xs text-zinc-600 font-mono">
              Resolved as{" "}
              <span className="text-amber-400/60">"{palette.intention.label}"</span>
              {palette.intention.aliases.length > 0 && (
                <> + {palette.intention.aliases.join(", ")}</>
              )}
            </p>
          )}
          {allGroups.map((group) => (
            <div key={group.key}>
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">
                {group.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((item) => (
                  <PaletteItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
