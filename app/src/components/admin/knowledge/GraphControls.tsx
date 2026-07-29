import { Network, Database, Layers } from "lucide-react";

import type { GraphType } from "@/lib/types";

type ViewMode = "cards" | "graph";

interface GraphControlsProps {
    graphType: GraphType;
    onGraphTypeChange: (type: GraphType) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    showViewMode?: boolean;
}

export default function GraphControls({
    graphType,
    onGraphTypeChange,
    viewMode,
    onViewModeChange,
    showViewMode = true,
}: GraphControlsProps) {
    return (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
            {/* Graph Source Switch */}
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-1 flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onGraphTypeChange("correspondences")}
                    className={`flex min-h-11 items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${graphType === "correspondences"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        }`}
                >
                    <Database className="w-3 h-3" />
                    Correspondences
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                    type="button"
                    onClick={() => onGraphTypeChange("parallax")}
                    className={`flex min-h-11 items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${graphType === "parallax"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        }`}
                >
                    <Network className="w-3 h-3" />
                    Concepts
                </button>
            </div>

            {/* View Mode Switch */}
            {showViewMode && <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-1 flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onViewModeChange("cards")}
                    aria-label="Card view"
                    className={`flex h-11 w-11 items-center justify-center rounded-md transition-all ${viewMode === "cards"
                        ? "bg-zinc-800 text-amber-400 border border-white/10"
                        : "text-zinc-600 hover:text-zinc-400"
                        }`}
                    title="Grid View"
                >
                    <Layers className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => onViewModeChange("graph")}
                    aria-label="Graph view"
                    className={`flex h-11 w-11 items-center justify-center rounded-md transition-all ${viewMode === "graph"
                        ? "bg-zinc-800 text-amber-400 border border-white/10"
                        : "text-zinc-600 hover:text-zinc-400"
                        }`}
                    title="Graph View"
                >
                    <Network className="w-4 h-4" />
                </button>
            </div>}
        </div>
    );
}
