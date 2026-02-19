import { Search, Filter, X } from "lucide-react";

interface CorrespondenceControlsProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedCategory: string | null;
    onCategoryChange: (category: string | null) => void;
    categories: string[];
}

export default function CorrespondenceControls({
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    categories
}: CorrespondenceControlsProps) {
    return (
        <div className="flex flex-wrap items-center gap-4 bg-black/40 backdrop-blur-md border border-white/5 rounded-lg p-2">

            {/* Search Input */}
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search correspondences..."
                    className="pl-9 pr-4 py-1.5 bg-black/20 border border-white/10 rounded-md text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 w-48 transition-all"
                />
            </div>

            <div className="h-6 w-px bg-white/5" />

            {/* Category Filter */}
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-500" />
                <div className="flex flex-wrap gap-1">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => onCategoryChange(selectedCategory === category ? null : category)}
                            className={`px-2 py-1 rounded text-xs border transition-all ${selectedCategory === category
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                    : "bg-white/5 text-zinc-500 border-white/5 hover:bg-white/10 hover:text-zinc-400"
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                    {selectedCategory && (
                        <button
                            onClick={() => onCategoryChange(null)}
                            className="px-1.5 py-1 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                            title="Clear filter"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Empty state/helper if no categories */}
            {categories.length === 0 && (
                <span className="text-xs text-zinc-600 italic">No categories available</span>
            )}

        </div>
    );
}
