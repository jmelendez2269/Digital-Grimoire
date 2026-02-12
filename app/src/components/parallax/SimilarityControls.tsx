"use client";

interface SimilarityControlsProps {
  minSimilarity: number;
  onSimilarityChange: (value: number) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTradition: string | null;
  onTraditionChange: (value: string | null) => void;
  traditions: string[];
}

export default function SimilarityControls({
  minSimilarity,
  onSimilarityChange,
  searchQuery,
  onSearchChange,
  selectedTradition,
  onTraditionChange,
  traditions,
}: SimilarityControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-zinc-900/30 border border-amber-900/20 rounded-lg p-4">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs text-amber-100/60 mb-1">Search Concepts</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name..."
          className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
        />
      </div>

      {/* Similarity Threshold */}
      <div className="min-w-[200px]">
        <label className="block text-xs text-amber-100/60 mb-1">
          Min Similarity: {(minSimilarity * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={minSimilarity}
          onChange={(e) => onSimilarityChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
        />
        <div className="flex justify-between text-xs text-amber-100/40 mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Tradition Filter */}
      <div className="min-w-[180px]">
        <label className="block text-xs text-amber-100/60 mb-1">Filter by Tradition</label>
        <select
          value={selectedTradition || ""}
          onChange={(e) => onTraditionChange(e.target.value || null)}
          className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
        >
          <option value="">All Traditions</option>
          {traditions.map((tradition) => (
            <option key={tradition} value={tradition}>
              {tradition}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters */}
      {(searchQuery || selectedTradition || minSimilarity > 0.3) && (
        <div className="flex items-end">
          <button
            onClick={() => {
              onSearchChange("");
              onTraditionChange(null);
              onSimilarityChange(0.3);
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
