"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { BookOpen, Tablet, Network, GraduationCap, Sparkles } from "lucide-react";

const DashboardSearchHub = dynamic(() => import("@/components/DashboardSearchHub"), {
    loading: () => <div className="h-[500px] animate-pulse bg-zinc-900/10 rounded-xl mb-12" />,
    ssr: false
});

const ParallaxEngineInfo = dynamic(() => import("@/components/ParallaxEngineInfo"), {
    ssr: false
});

export default function DashboardView() {
    const { user, loading } = useAuth();

    // Get custom journal name or default to "Digital Grimoire"
    const journalName = user?.user_metadata?.journal_name || "Digital Grimoire";
    const username = user?.user_metadata?.username || null;

    return (
        <div className="flex flex-1 flex-col px-6 py-10">
            <div className="mx-auto w-full max-w-7xl">
                {/* Welcome Section */}
                <div className="mb-12 text-center">
                    <div className="min-h-[60px] md:min-h-[72px] flex items-center justify-center">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-100">
                            {loading ? (
                                "Welcome!"
                            ) : username ? (
                                `Welcome, ${username}!`
                            ) : (
                                "Welcome to Project Parallax"
                            )}
                        </h1>
                    </div>
                    <p className="mt-2 text-lg text-zinc-400">
                        What will you uncover today?
                    </p>
                </div>

                {/* Integrated Search Hub - Primary Focus */}
                <div className="mb-20">
                    <Suspense fallback={<div className="w-full h-64 bg-zinc-900/30 rounded-xl animate-pulse" />}>
                        <DashboardSearchHub />
                    </Suspense>
                </div>

                {/* Explore Your Tools Section */}
                <div className="mb-16">
                    <h2 className="mb-10 text-2xl font-bold text-cyan-100 text-center">
                        Explore Your Tools
                    </h2>

                    {/* Primary Tools Grid */}
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-16">
                        {/* Library Card */}
                        <Link
                            href="/library"
                            className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-cyan-500/50 hover:bg-zinc-900 overflow-visible"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/15 to-cyan-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
                                    <BookOpen className="w-6 h-6 text-cyan-400" />
                                </div>
                                <h3 className="text-xl font-bold text-cyan-100 group-hover:text-cyan-400">
                                    Library
                                </h3>
                            </div>
                            <p className="text-sm text-zinc-400">
                                Browse and explore the collection of esoteric texts, sacred writings, and wisdom traditions from across cultures and time periods.
                            </p>
                        </Link>

                        {/* Digital Grimoire Card */}
                        <Link
                            href="/journal"
                            className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-indigo-500/50 hover:bg-zinc-900 overflow-visible"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/15 to-indigo-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/20">
                                    <Tablet className="w-6 h-6 text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-bold text-indigo-100 group-hover:text-indigo-400">
                                    {journalName}
                                </h3>
                            </div>
                            <p className="text-sm text-zinc-400">
                                Your personal collection of insights, truths, and discoveries. Create notes, organize thoughts, and build your understanding.
                            </p>
                        </Link>

                        {/* Graph Card */}
                        <Link
                            href="/graph"
                            className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-cyan-500/50 hover:bg-zinc-900 overflow-visible"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/15 to-cyan-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
                                    <Network className="w-6 h-6 text-cyan-400" />
                                </div>
                                <h3 className="text-xl font-bold text-cyan-100 group-hover:text-cyan-400">
                                    Graph
                                </h3>
                            </div>
                            <p className="text-sm text-zinc-400">
                                Explore connections between concepts, traditions, and ideas through an interactive knowledge graph.
                            </p>
                        </Link>

                        {/* Courses Card */}
                        <Link
                            href="/courses"
                            onClick={async (e) => {
                                try {
                                    await fetch('/api/track/courses-click', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ source: 'card' })
                                    });
                                } catch (err) {
                                    // Silently fail - tracking shouldn't block navigation
                                }
                            }}
                            className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-blue-500/50 hover:bg-zinc-900 overflow-visible"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/15 to-blue-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                                    <GraduationCap className="w-6 h-6 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold text-blue-100 group-hover:text-blue-400">
                                    Courses
                                </h3>
                            </div>
                            <p className="text-sm text-zinc-400">
                                Structured learning paths through esoteric wisdom traditions.
                            </p>
                        </Link>

                        {/* Parallax Engine Card */}
                        <ParallaxEngineInfo />
                    </div>

                    {/* Extras Separator */}
                    <div className="flex items-center gap-4 mb-8 max-w-6xl mx-auto">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
                        <span className="text-[10px] font-mono font-bold text-cyan-500/50 uppercase tracking-[0.3em] whitespace-nowrap">
                            Extras
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
                    </div>

                    {/* Extras Tools Grid - Centered & Expanded for Tarot */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-6xl mx-auto">
                        {/* Ritual Library Card */}
                        <Link
                            href="/ritual-machine"
                            className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-cyan-500/50 hover:bg-zinc-900 overflow-visible"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/15 to-cyan-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
                                    <span className="text-2xl">📜</span>
                                </div>
                                <h3 className="text-xl font-bold text-cyan-100 group-hover:text-cyan-400">
                                    Ritual Library
                                </h3>
                            </div>
                            <p className="text-sm text-zinc-400">
                                Browse curated ritual protocols drawn from esoteric traditions. Select a rite and follow along step by step.
                            </p>
                        </Link>

                        {/* Workbench Card */}
                        <Link
                            href="/workbench"
                            className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-amber-500/50 hover:bg-zinc-900 overflow-visible"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/15 to-amber-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                                    <span className="text-2xl">🛠️</span>
                                </div>
                                <h3 className="text-xl font-bold text-amber-100 group-hover:text-amber-400">
                                    Workbench
                                </h3>
                            </div>
                            <p className="text-sm text-zinc-400">
                                Design rituals, run the Ritual Machine, and forge custom tarot cards. Your maker's space for crafting personalized practice.
                            </p>
                        </Link>

                        {/* Oracle Card */}
                        <Link
                            href="/extras/tarot"
                            className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-purple-500/50 hover:bg-zinc-900 overflow-visible"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/15 to-pink-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                                    <Sparkles className="w-6 h-6 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold text-purple-100 group-hover:text-purple-400">
                                    The Oracle
                                </h3>
                            </div>
                            <p className="text-sm text-zinc-400">
                                Consult the digital cards for guidance. Draw from the standard 78-card deck and save your readings.
                            </p>
                        </Link>
                    </div>
                </div>

                {/* Home/Dashboard Footer/Legal Text - Only rendered here if we want it on both pages. 
            However, (home)/page.tsx had it. dashboard/page.tsx did NOT. 
            Since we want them to look 'identical', we should include it.
        */}
                <div className="mb-8 text-center">
                    <p className="text-sm text-zinc-500">
                        By using this site, you agree to our{" "}
                        <Link
                            href="/privacy"
                            className="text-cyan-400 underline transition-colors hover:text-cyan-300"
                        >
                            Privacy Policy
                        </Link>
                        {" "}and{" "}
                        <Link
                            href="/terms"
                            className="text-cyan-400 underline transition-colors hover:text-cyan-300"
                        >
                            Terms of Service
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}
