"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import RitualRunner from "@/components/ritual/RitualRunner";
import { ArrowLeft, Play, Clock, BarChart, ShieldCheck } from "lucide-react";

// Mock data - in real app, fetch based on ID
const MOCK_RITUALS: Record<string, any> = {
    "moon-cleansing": {
        id: "moon-cleansing",
        title: "Lunar Cleansing Ritual",
        description: "A purifying rite performed during the waning moon to banish negativity and prepare for new beginnings. This ritual utilizes the decreasing energy of the moon to release what no longer serves you.",
        duration: "45 min",
        difficulty: "Beginner",
        imageUrl: "/rituals/lunar_ritual.png",
        source: "Traditional Wicca",
        ingredients: [
            "White Sage or Palo Santo",
            "Sea Salt",
            "Black Candle",
            "Paper and Pen",
            "Fireproof bowl"
        ],
        steps: [
            { title: "Preparation", instruction: "Cleanse your space with smoke. Light the black candle." },
            { title: "Grounding", instruction: "Sit comfortably. Close your eyes. Visualize roots extending from your spine into the earth.", duration: 5 },
            { title: "Writing", instruction: "Write down everything you wish to release on the paper." },
            { title: "Burning", instruction: "Safely burn the paper in the bowl, visualizing the negativity dissolving.", duration: 10 },
            { title: "Closing", instruction: "Bury the ashes or wash them away. Extinguish the candle." }
        ]
    },
    "solar-invocation": {
        id: "solar-invocation",
        title: "Solar Invocation of Strength",
        description: "Connect with the vitality of the sun to build confidence, willpower, and physical stamina.",
        duration: "20 min",
        difficulty: "Intermediate",
        imageUrl: "/rituals/solar_ritual.png",
        source: "Golden Dawn (Adapted)",
        ingredients: ["Gold or Yellow Candle", "Citrine Crystal", "Sunflower Oil"],
        steps: [
            { title: "Facing East", instruction: "Stand facing East at sunrise." },
            { title: "Invocation", instruction: "Recite the solar hymn of awakening." },
            { title: "Absorption", instruction: "Visualize golden light filling your solar plexus." }
        ]
    }
};

export default function RitualDetailPage() {
    const params = useParams();
    const router = useRouter();
    const ritualId = params.id as string;
    const ritual = MOCK_RITUALS[ritualId] || MOCK_RITUALS["moon-cleansing"]; // Fallback for demo

    const [mode, setMode] = useState<'overview' | 'active'>('overview');

    const handleComplete = () => {
        // In real app: save completion to DB/User profile
        setMode('overview'); // Or redirect to specific completion screen
        alert("Ritual Completed!");
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Breadcrumb / Back */}
                <div className="mb-6">
                    <Link href="/ritual-machine" className="inline-flex items-center gap-2 text-zinc-500 hover:text-amber-400 transition-colors text-sm font-mono uppercase tracking-wider">
                        <ArrowLeft className="w-4 h-4" /> Back to Protocols
                    </Link>
                </div>

                {mode === 'overview' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Hero Header */}
                        <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 mb-8">
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
                            <Image
                                src={ritual.imageUrl || "https://images.unsplash.com/photo-1514489024785-d5ba8df4e6ed?auto=format&fit=crop&q=80"}
                                alt="Background"
                                fill
                                priority
                                className="object-cover opacity-30"
                                sizes="100vw"
                            />

                            <div className="relative z-20 p-8 md:p-12">
                                <div className="flex flex-wrap gap-3 mb-4">
                                    <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono uppercase tracking-wider rounded-full flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {ritual.duration}
                                    </span>
                                    <span className="px-3 py-1 bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-mono uppercase tracking-wider rounded-full flex items-center gap-1">
                                        <BarChart className="w-3 h-3" /> {ritual.difficulty}
                                    </span>
                                    {ritual.source && (
                                        <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono uppercase tracking-wider rounded-full flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" /> {ritual.source}
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-4xl md:text-5xl font-serif font-bold text-amber-50 mb-6 drop-shadow-lg">
                                    {ritual.title}
                                </h1>

                                <p className="text-lg text-zinc-300 max-w-2xl leading-relaxed mb-8">
                                    {ritual.description}
                                </p>

                                <button
                                    onClick={() => setMode('active')}
                                    className="flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:shadow-[0_0_50px_rgba(245,158,11,0.4)] transition-all transform hover:-translate-y-1"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    INITIATE RITUAL
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Ingredients / Prep */}
                            <div className="md:col-span-1">
                                <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-6">
                                    <h3 className="text-lg font-serif font-bold text-amber-100 mb-4 flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-amber-500" />
                                        Requirements
                                    </h3>
                                    <ul className="space-y-3">
                                        {ritual.ingredients.map((item: string, i: number) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 mt-1.5" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Steps Preview */}
                            <div className="md:col-span-2">
                                <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-6">
                                    <h3 className="text-lg font-serif font-bold text-amber-100 mb-4">Sequence Overview</h3>
                                    <div className="space-y-4">
                                        {ritual.steps.map((step: any, i: number) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                                                <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-500 group-hover:border-amber-500/30 group-hover:text-amber-400">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-zinc-200">{step.title}</h4>
                                                    <p className="text-xs text-zinc-500">{step.instruction.substring(0, 60)}...</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        {/* Active Ritual Mode */}
                        <RitualRunner
                            steps={ritual.steps}
                            onComplete={handleComplete}
                        />

                        <button
                            onClick={() => setMode('overview')}
                            className="mt-8 mx-auto block text-zinc-500 hover:text-red-400 text-sm font-mono uppercase tracking-wider transition-colors"
                        >
                            Abort Protocol
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
