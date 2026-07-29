"use client";

type CorrespondenceLayoutDensity = "compact" | "balanced" | "expanded";
type CorrespondenceLayoutEngine = "clusters" | "organic";

interface CorrespondenceControlsProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    selectedCategory: string | null;
    onCategoryChange: (value: string | null) => void;
    categories: string[];
    graphScope?: "focused" | "full";
    onGraphScopeChange?: (value: "focused" | "full") => void;
    showGraphScopeControls?: boolean;
    layoutDensity?: CorrespondenceLayoutDensity;
    onLayoutDensityChange?: (value: CorrespondenceLayoutDensity) => void;
    showLayoutDensityControls?: boolean;
    layoutEngine?: CorrespondenceLayoutEngine;
    onLayoutEngineChange?: (value: CorrespondenceLayoutEngine) => void;
    showLayoutEngineControls?: boolean;
}

export default function CorrespondenceControls({
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    categories,
    graphScope = "full",
    onGraphScopeChange,
    showGraphScopeControls = false,
    layoutDensity = "balanced",
    onLayoutDensityChange,
    showLayoutDensityControls = false,
    layoutEngine = "clusters",
    onLayoutEngineChange,
    showLayoutEngineControls = false,
}: CorrespondenceControlsProps) {
    return (
        <div className="flex flex-wrap items-end gap-2 bg-zinc-900/30 border border-amber-900/20 rounded-xl p-2.5 animate-in slide-in-from-top-2 duration-300">
            {/* Category Filter */}
            <div className="min-w-[150px] flex-1 sm:flex-none">
                <label className="block text-[10px] uppercase tracking-wider text-amber-100/50 mb-1">Category</label>
                <select
                    aria-label="Filter by Category"
                    value={selectedCategory || ""}
                    onChange={(e) => onCategoryChange(e.target.value || null)}
                    className="h-9 w-full px-2.5 bg-zinc-800 border border-amber-900/30 rounded-lg text-xs text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
            </div>

            {showGraphScopeControls && onGraphScopeChange && (
                <div>
                    <label className="block text-[10px] uppercase tracking-wider text-amber-100/50 mb-1">Coverage</label>
                    <div className="flex items-center gap-1 rounded-lg border border-amber-900/30 bg-zinc-800 p-1">
                        <button
                            type="button"
                            onClick={() => onGraphScopeChange("full")}
                            className={`min-h-8 rounded-md px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                                graphScope === "full"
                                    ? "bg-amber-500/20 text-amber-200"
                                    : "text-amber-100/55 hover:text-amber-100"
                            }`}
                        >
                            Full Archive
                        </button>
                        <button
                            type="button"
                            onClick={() => onGraphScopeChange("focused")}
                            className={`min-h-8 rounded-md px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                                graphScope === "focused"
                                    ? "bg-amber-500/20 text-amber-200"
                                    : "text-amber-100/55 hover:text-amber-100"
                            }`}
                        >
                            Focused
                        </button>
                    </div>
                </div>
            )}

            {showLayoutEngineControls && onLayoutEngineChange && (
                <div>
                    <label className="block text-[10px] uppercase tracking-wider text-amber-100/50 mb-1">Layout</label>
                    <div className="flex items-center gap-1 rounded-lg border border-amber-900/30 bg-zinc-800 p-1">
                        {([
                            { key: "clusters", label: "Constellation" },
                            { key: "organic", label: "Organic" },
                        ] as const).map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => onLayoutEngineChange(option.key)}
                                className={`min-h-8 rounded-md px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors ${
                                    layoutEngine === option.key
                                        ? "bg-amber-500/20 text-amber-200"
                                        : "text-amber-100/55 hover:text-amber-100"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {showLayoutDensityControls && onLayoutDensityChange && (
                <div>
                    <label className="block text-[10px] uppercase tracking-wider text-amber-100/50 mb-1">Spacing</label>
                    <div className="flex items-center gap-1 rounded-lg border border-amber-900/30 bg-zinc-800 p-1">
                        {([
                            { key: "compact", label: "Compact" },
                            { key: "balanced", label: "Balanced" },
                            { key: "expanded", label: "Expanded" },
                        ] as const).map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => onLayoutDensityChange(option.key)}
                                className={`min-h-8 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.08em] transition-colors ${
                                    layoutDensity === option.key
                                        ? "bg-amber-500/20 text-amber-200"
                                        : "text-amber-100/55 hover:text-amber-100"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Clear Filters */}
            {(searchQuery || selectedCategory) && (
                <div className="flex items-end">
                    <button
                        onClick={() => {
                            onSearchChange("");
                            onCategoryChange(null);
                        }}
                        className="h-9 px-3 text-xs text-amber-100/70 hover:text-amber-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        Reset View
                    </button>
                </div>
            )}
        </div>
    );
}
