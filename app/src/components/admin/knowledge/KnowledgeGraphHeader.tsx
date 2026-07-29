import { Search, Plus, Activity, Cpu, X } from "lucide-react";
import { useId, useState } from "react";

export type GraphSearchSuggestion = { id: string; name: string; context?: string };

interface KnowledgeGraphHeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onCreateClick?: () => void;
    entityCount: number;
    connectionCount: number;
    loading?: boolean;
    title?: string;
    subtitle?: string;
    suggestions?: GraphSearchSuggestion[];
    onSuggestionSelect?: (suggestion: GraphSearchSuggestion) => void;
    showSearch?: boolean;
}

export default function KnowledgeGraphHeader({
    searchQuery,
    onSearchChange,
    onCreateClick,
    entityCount,
    connectionCount,
    loading,
    title,
    subtitle,
    suggestions = [],
    onSuggestionSelect,
    showSearch = true,
}: KnowledgeGraphHeaderProps) {
    const [searchFocused, setSearchFocused] = useState(false);
    const listboxId = useId();
    const showSuggestions = searchFocused && searchQuery.trim().length > 0 && suggestions.length > 0;

    return (
        <div className="relative z-40 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-2 shadow-2xl backdrop-blur-md pointer-events-auto">
            {/* Title & Stats */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${loading ? 'bg-cyan-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-amber-100 tracking-wide uppercase font-serif leading-tight">
                            {title || <>The Parallax <span className="text-amber-500/50">Graph</span></>}
                        </h1>
                        <span className="text-[10px] font-mono text-cyan-500/50 tracking-[0.2em] uppercase">
                            {subtitle || "Neural Interface Active"}
                        </span>
                    </div>
                </div>

                <div className="h-4 w-px bg-white/10" />

                <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono tracking-wider text-amber-100/50">
                    <div className="flex items-center gap-1.5">
                        <Cpu className="w-3 h-3 text-cyan-500" />
                        <span>NODES: <span className="text-cyan-400">{entityCount}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-amber-500" />
                        <span>LINKS: <span className="text-amber-400">{connectionCount}</span></span>
                    </div>
                </div>
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-3 flex-1 justify-end max-w-2xl">
                {/* Search Bar */}
                {showSearch && <div className="relative group w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-amber-500/50 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && suggestions[0]) {
                                event.preventDefault();
                                (onSuggestionSelect || ((item) => onSearchChange(item.name)))(suggestions[0]);
                                setSearchFocused(false);
                            }
                            if (event.key === "Escape") setSearchFocused(false);
                        }}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-controls={listboxId}
                        aria-expanded={showSuggestions}
                        className="block min-h-9 w-full rounded-xl border border-white/10 bg-black/40 py-1 pl-10 pr-9 font-mono text-sm text-amber-100 placeholder-amber-100/20 transition-all focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        placeholder="Find a node..."
                    />
                    {searchQuery && (
                        <button type="button" onClick={() => onSearchChange("")} aria-label="Clear graph search" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {showSuggestions && (
                        <div id={listboxId} role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-amber-900/40 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-xl">
                            {suggestions.map((suggestion) => (
                                <button key={suggestion.id} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => { (onSuggestionSelect || ((item) => onSearchChange(item.name)))(suggestion); setSearchFocused(false); }} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left hover:bg-amber-500/10 focus:bg-amber-500/10 focus:outline-none">
                                    <span className="truncate text-sm text-amber-100">{suggestion.name}</span>
                                    {suggestion.context && <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-500">{suggestion.context}</span>}
                                </button>
                            ))}
                            <p className="px-3 py-1.5 text-[10px] text-zinc-600">Enter selects the closest match</p>
                        </div>
                    )}
                </div>}

                {/* Create Button */}
                {onCreateClick && (
                    <button
                        onClick={onCreateClick}
                        className="flex items-center gap-2 px-4 py-1.5 bg-amber-600/80 hover:bg-amber-600 backdrop-blur-sm border border-amber-500/30 rounded-full text-white text-xs font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] group"
                    >
                        <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                        <span>Inject Node</span>
                    </button>
                )}
            </div>
        </div>
    );
}
