"use client";

type CorrespondenceRelationshipLayer = "corresponds_to" | "associated_with" | "shares_correspondence_with" | "refines";

interface CorrespondenceControlsProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    selectedCategory: string | null;
    onCategoryChange: (value: string | null) => void;
    categories: string[];
    graphScope?: "focused" | "full";
    onGraphScopeChange?: (value: "focused" | "full") => void;
    showGraphScopeControls?: boolean;
    relationshipFilters?: Record<CorrespondenceRelationshipLayer, boolean>;
    onRelationshipFilterChange?: (layer: CorrespondenceRelationshipLayer, value: boolean) => void;
    relationshipCounts?: Record<CorrespondenceRelationshipLayer, number>;
    showRelationshipFilters?: boolean;
}

const RELATIONSHIP_LAYER_OPTIONS: Array<{
    key: CorrespondenceRelationshipLayer;
    label: string;
    accentClass: string;
}> = [
    { key: "corresponds_to", label: "Direct", accentClass: "border-amber-500/30 text-amber-200" },
    { key: "associated_with", label: "Associative", accentClass: "border-sky-500/30 text-sky-200" },
    { key: "shares_correspondence_with", label: "Semantic Overlap", accentClass: "border-teal-500/30 text-teal-200" },
    { key: "refines", label: "Refines", accentClass: "border-fuchsia-500/30 text-fuchsia-200" },
];
const DEFAULT_RELATIONSHIP_FILTERS: Record<CorrespondenceRelationshipLayer, boolean> = {
    corresponds_to: true,
    associated_with: true,
    shares_correspondence_with: true,
    refines: false,
};

export default function CorrespondenceControls({
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    categories,
    graphScope = "full",
    onGraphScopeChange,
    showGraphScopeControls = false,
    relationshipFilters,
    onRelationshipFilterChange,
    relationshipCounts,
    showRelationshipFilters = false,
}: CorrespondenceControlsProps) {
    const hasRelationshipFilterChanges = relationshipFilters
        ? RELATIONSHIP_LAYER_OPTIONS.some((option) => relationshipFilters[option.key] !== DEFAULT_RELATIONSHIP_FILTERS[option.key])
        : false;

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

            {showRelationshipFilters && relationshipFilters && onRelationshipFilterChange && relationshipCounts && (
                <div className="min-w-[280px] flex-1">
                    <label className="block text-xs text-amber-100/60 mb-1">Visible Link Layers</label>
                    <div className="flex flex-wrap gap-2 rounded-lg border border-amber-900/30 bg-zinc-800/80 p-2">
                        {RELATIONSHIP_LAYER_OPTIONS.map((option) => {
                            const active = relationshipFilters[option.key];
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => onRelationshipFilterChange(option.key, !active)}
                                    className={`rounded-md border px-3 py-2 text-left text-[11px] uppercase tracking-[0.14em] transition-all ${
                                        active
                                            ? `${option.accentClass} bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]`
                                            : "border-white/8 text-zinc-500 hover:border-white/15 hover:text-zinc-300"
                                    }`}
                                >
                                    <span className="block">{option.label}</span>
                                    <span className="mt-1 block text-[10px] normal-case tracking-normal opacity-70">
                                        {relationshipCounts[option.key]} links
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Clear Filters */}
            {(searchQuery || selectedCategory || hasRelationshipFilterChanges) && (
                <div className="flex items-end">
                    <button
                        onClick={() => {
                            onSearchChange("");
                            onCategoryChange(null);
                            if (onRelationshipFilterChange && relationshipFilters) {
                                onRelationshipFilterChange("corresponds_to", true);
                                onRelationshipFilterChange("associated_with", true);
                                onRelationshipFilterChange("shares_correspondence_with", true);
                                onRelationshipFilterChange("refines", false);
                            }
                        }}
                        className="px-4 py-2 text-sm text-amber-100/70 hover:text-amber-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        Reset View
                    </button>
                </div>
            )}
        </div>
    );
}
