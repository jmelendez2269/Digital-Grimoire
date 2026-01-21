import { Search, Plus, Activity, Cpu } from "lucide-react";
import { useState } from "react";

interface KnowledgeGraphHeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onCreateClick?: () => void;
    entityCount: number;
    connectionCount: number;
    loading?: boolean;
}

export default function KnowledgeGraphHeader({
    searchQuery,
    onSearchChange,
    onCreateClick,
    entityCount,
    connectionCount,
    loading
}: KnowledgeGraphHeaderProps) {
    return (
        <div className="fixed top-20 left-4 right-4 z-40 bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-full py-3 px-6 shadow-2xl flex items-center justify-between gap-6 pointer-events-auto">
            {/* Title & Stats */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                    <h1 className="text-lg font-bold text-amber-100 tracking-wide uppercase">
                        Neural Interface <span className="text-amber-500/50">v2.0</span>
                    </h1>
                </div>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-4 text-[10px] font-mono tracking-wider text-amber-100/50">
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
                <div className="relative group w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-amber-500/50 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="block w-full pl-10 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-full text-sm text-amber-100 placeholder-amber-100/20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-mono"
                        placeholder="SEARCH_NEURAL_NET..."
                    />
                </div>

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
