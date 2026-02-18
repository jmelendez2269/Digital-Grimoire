"use client";

import { ParallaxConcept } from "@/lib/types";

interface TraditionLegendProps {
  traditions: string[];
  concepts: ParallaxConcept[];
  selectedTradition: string | null;
  onSelectTradition: (tradition: string | null) => void;
}

// Color scheme matching ParallaxGraph
const TRADITION_COLORS: Record<string, string> = {
  Buddhist: "#8B5CF6",
  Christian: "#3B82F6",
  Taoist: "#10B981",
  Hindu: "#F59E0B",
  Islamic: "#EF4444",
  Jewish: "#6366F1",
  Quantum: "#06B6D4",
  Philosophy: "#EC4899",
  Hermetic: "#F97316",
  Other: "#6B7280",
};

const DEFAULT_COLOR = "#6B7280";

export default function TraditionLegend({
  traditions,
  concepts,
  selectedTradition,
  onSelectTradition,
}: TraditionLegendProps) {
  // Count concepts per tradition
  const traditionCounts = traditions.map((tradition) => ({
    tradition,
    count: concepts.filter((c) => c.tradition === tradition).length,
  }));

  return (
    <div>
      <h3 className="text-sm font-semibold text-amber-100/80 mb-3 uppercase tracking-wide">
        Traditions
      </h3>
      <div className="space-y-2">
        {traditionCounts.map(({ tradition, count }) => {
          const refColor = concepts.find((c) => c.tradition === tradition)?.tradition_ref?.color;
          const color = refColor || TRADITION_COLORS[tradition] || DEFAULT_COLOR;
          const isSelected = selectedTradition === tradition;

          return (
            <button
              key={tradition}
              onClick={() => onSelectTradition(isSelected ? null : tradition)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left ${isSelected
                ? "bg-amber-900/30 border border-amber-700/50"
                : "bg-zinc-800/50 hover:bg-zinc-800/70 border border-transparent"
                }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white/20"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-amber-100/90">{tradition}</span>
              </div>
              <span className="text-xs text-amber-100/50">{count}</span>
            </button>
          );
        })}
      </div>

      {selectedTradition && (
        <button
          onClick={() => onSelectTradition(null)}
          className="mt-4 w-full px-3 py-2 text-sm text-amber-100/70 hover:text-amber-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Clear Filter
        </button>
      )}
    </div>
  );
}
