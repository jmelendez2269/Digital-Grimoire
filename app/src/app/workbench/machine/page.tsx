"use client";

import { useState } from "react";
import RitualCard from "@/components/ritual/RitualCard";
import { Sparkles, Search, Filter } from "lucide-react";

// Pre-built ritual protocols — the "machine" side of the workbench
const RITUAL_PROTOCOLS = [
    {
        id: "moon-cleansing",
        title: "Lunar Cleansing Ritual",
        description: "A purifying rite performed during the waning moon to banish negativity and prepare for new beginnings.",
        duration: "45 min",
        difficulty: "Beginner" as const,
        tags: ["moon", "cleansing", "water"],
        imageUrl: "/rituals/lunar_ritual.png",
        source: "Traditional Wicca"
    },
    {
        id: "solar-invocation",
        title: "Solar Invocation of Strength",
        description: "Connect with the vitality of the sun to build confidence, willpower, and physical stamina.",
        duration: "20 min",
        difficulty: "Intermediate" as const,
        tags: ["sun", "fire", "strength"],
        imageUrl: "/rituals/solar_ritual.png",
        source: "Golden Dawn (Adapted)"
    },
    {
        id: "mercury-study",
        title: "Mercurial Focus Rite",
        description: "Enhance mental clarity, communication, and learning capabilities before a period of intense study.",
        duration: "15 min",
        difficulty: "Beginner" as const,
        tags: ["mercury", "air", "study"],
        imageUrl: "/rituals/mercury_ritual.png",
        source: "AI Generated (Hermetic Style)"
    },
    {
        id: "ancestral-communion",
        title: "Ancestral Communion",
        description: "A deep meditative ritual to honor and seek guidance from one's ancestors.",
        duration: "60 min",
        difficulty: "Advanced" as const,
        tags: ["spirit", "ancestors", "earth"],
        imageUrl: null,
        source: "Shamanic Practice"
    }
];

export default function WorkbenchMachinePage() {
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = RITUAL_PROTOCOLS.filter(ritual =>
        ritual.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ritual.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-10 border-b border-zinc-800/50 pb-8">
                <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                    <h1 className="text-3xl font-serif text-amber-100">Ritual Machine</h1>
                </div>
                <p className="text-zinc-400 max-w-2xl">
                    Access curated <span className="text-amber-500/80 font-mono text-sm uppercase mx-1">RITUAL_GUIDE</span> protocols.
                    Select a rite to begin your practice.
                </p>
            </div>

            {/* Search & Filter */}
            <div className="mb-10 flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/30 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search protocols by name or tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 font-mono placeholder:text-zinc-600"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 rounded-lg text-sm border border-white/5 transition-colors">
                        <Filter className="w-4 h-4" />
                        <span>Filter</span>
                    </button>
                    <div className="h-4 w-px bg-white/10 mx-2 hidden md:block" />
                    <span className="text-xs font-mono text-zinc-500 hidden md:block">
                        {filtered.length} PROTOCOLS FOUND
                    </span>
                </div>
            </div>

            {/* Ritual Grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((ritual) => (
                        <RitualCard key={ritual.id} {...ritual} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
                    <div className="text-4xl mb-4 opacity-50">🌑</div>
                    <h3 className="text-xl font-medium text-zinc-300 mb-2">No protocols found</h3>
                    <p className="text-zinc-500">Try adjusting your search query or filters.</p>
                </div>
            )}
        </div>
    );
}
