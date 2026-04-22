"use client";

interface CorrespondenceControlsProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    selectedCategory: string | null;
    onCategoryChange: (value: string | null) => void;
    categories: string[];
    graphScope?: "focused" | "full";
    onGraphScopeChange?: (value: "focused" | "full") => void;
    showGraphScopeControls?: boolean;
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
}: CorrespondenceControlsProps) {
    return (
        <div className="flex flex-wrap items-center gap-4 bg-zinc-900/30 border border-amber-900/20 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-amber-100/60 mb-1">Search Correspondences</label>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search by name, key, or alias..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                />
            </div>

            {/* Category Filter */}
            <div className="min-w-[180px]">
                <label className="block text-xs text-amber-100/60 mb-1">Filter by Category</label>
                <select
                    aria-label="Filter by Category"
                    value={selectedCategory || ""}
                    onChange={(e) => onCategoryChange(e.target.value || null)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
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
                <div className="min-w-[220px]">
                    <label className="block text-xs text-amber-100/60 mb-1">Graph Coverage</label>
                    <div className="flex items-center gap-1 rounded-lg border border-amber-900/30 bg-zinc-800 p-1">
                        <button
                            type="button"
                            onClick={() => onGraphScopeChange("full")}
                            className={`flex-1 rounded-md px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
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
                            className={`flex-1 rounded-md px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
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

            {/* Clear Filters */}
            {(searchQuery || selectedCategory) && (
                <div className="flex items-end">
                    <button
                        onClick={() => {
                            onSearchChange("");
                            onCategoryChange(null);
                        }}
                        className="px-4 py-2 text-sm text-amber-100/70 hover:text-amber-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>
            )}
        </div>
    );
}
