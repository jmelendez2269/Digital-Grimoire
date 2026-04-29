"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BookOpen, Lightbulb, Network, Tablet } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import FeatureOnboardingModal from "@/components/FeatureOnboardingModal";

const DashboardSearchHub = dynamic(() => import("@/components/DashboardSearchHub"), {
  loading: () => <div className="h-[500px] animate-pulse bg-zinc-900/10 rounded-xl mb-12" />,
  ssr: false,
});

const ParallaxEngineInfo = dynamic(() => import("@/components/ParallaxEngineInfo"), {
  ssr: false,
});

export default function DashboardView() {
  const { user, loading } = useAuth();

  const journalName = user?.user_metadata?.journal_name || "Study Journal";
  const username = user?.user_metadata?.username || null;

  return (
    <>
      <FeatureOnboardingModal />
      <div className="flex flex-1 flex-col px-6 py-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-12 text-center">
            <div className="min-h-[60px] md:min-h-[72px] flex items-center justify-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-100">
                {loading ? "Welcome!" : username ? `Welcome, ${username}!` : "Welcome to Prismarium"}
              </h1>
            </div>
            <p className="mt-2 text-lg text-zinc-400">What will you uncover today?</p>
          </div>

          <div className="mb-12">
            <Link
              href="/courses"
              onClick={async () => {
                try {
                  await fetch("/api/track/courses-click", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ source: "featured-banner" }),
                  });
                } catch {
                  // Silently fail
                }
              }}
              className="group relative flex flex-col md:flex-row items-center md:items-stretch gap-6 md:gap-0 rounded-2xl overflow-hidden border border-amber-500/20 hover:border-amber-400/40 transition-all duration-500 shadow-[0_0_40px_-10px_rgba(180,143,74,0.15)] hover:shadow-[0_0_60px_-5px_rgba(180,143,74,0.25)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-amber-950/10 to-zinc-950 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(180,143,74,0.07),transparent)] pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
              <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-amber-500/60 to-transparent" />

              <div className="relative flex flex-col md:flex-row items-center md:items-center gap-8 w-full px-8 py-10 md:pl-12 md:pr-10">
                <div className="flex-shrink-0 relative">
                  <div className="relative w-20 h-20 md:w-24 md:h-24">
                    <svg viewBox="0 0 96 96" className="courses-sigil absolute inset-0 w-full h-full text-amber-500/20 group-hover:text-amber-500/35 group-hover:rotate-[30deg]">
                      <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="0.8" fill="none" strokeDasharray="4 3" />
                      <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="0.5" fill="none" />
                      <polygon points="48,8 84,68 12,68" stroke="currentColor" strokeWidth="0.6" fill="none" />
                      <polygon points="48,88 12,28 84,28" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center group-hover:border-amber-400/60 group-hover:bg-amber-500/20 transition-all duration-500">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/80 text-[10px] font-mono font-bold uppercase tracking-[0.25em] mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Featured Learning Path
                  </div>
                  <h2 className="font-serif text-3xl md:text-4xl font-bold text-amber-100 group-hover:text-amber-50 transition-colors duration-300 mb-2 leading-tight">
                    Courses & Learning Paths
                  </h2>
                  <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-lg group-hover:text-zinc-300 transition-colors duration-300">
                    Navigate the depths of esoteric wisdom through structured courses. Hermetic philosophy, Qabalah, sacred geometry, and beyond through guided paths.
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <div className="relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-black bg-amber-500 group-hover:bg-amber-400 transition-all duration-300 shadow-[0_0_20px_rgba(180,143,74,0.3)] group-hover:shadow-[0_0_35px_rgba(180,143,74,0.5)]">
                    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                      <div className="absolute -inset-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] translate-x-[-150%] group-hover:translate-x-[350%] transition-transform duration-700 ease-in-out" />
                    </div>
                    Begin Your Path
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="mb-20">
            <Suspense fallback={<div className="w-full h-64 bg-zinc-900/30 rounded-xl animate-pulse" />}>
              <DashboardSearchHub />
            </Suspense>
          </div>

          <div className="mb-16">
            <h2 className="mb-10 text-2xl font-bold text-cyan-100 text-center">Explore Your Tools</h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/library"
                className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-cyan-500/50 hover:bg-zinc-900 overflow-visible"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/15 to-cyan-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
                    <BookOpen className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-cyan-100 group-hover:text-cyan-400">Library</h3>
                </div>
                <p className="text-sm text-zinc-400">
                  Browse and explore the collection of esoteric texts, sacred writings, and wisdom traditions from across cultures and time periods.
                </p>
              </Link>

              <Link
                href="/journal"
                className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-indigo-500/50 hover:bg-zinc-900 overflow-visible"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/15 to-indigo-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/20">
                    <Tablet className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-100 group-hover:text-indigo-400">{journalName}</h3>
                </div>
                <p className="text-sm text-zinc-400">
                  Your personal collection of insights, truths, and discoveries. Create notes, organize thoughts, and build your understanding.
                </p>
              </Link>

              <Link
                href="/graph"
                className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-cyan-500/50 hover:bg-zinc-900 overflow-visible"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/15 to-cyan-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
                    <Network className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-cyan-100 group-hover:text-cyan-400">Graph</h3>
                </div>
                <p className="text-sm text-zinc-400">
                  Explore connections between concepts, traditions, and ideas through an interactive knowledge graph.
                </p>
              </Link>

              <ParallaxEngineInfo />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-4xl mx-auto mt-8">
              <Link
                href="/search"
                className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-emerald-500/50 hover:bg-zinc-900 overflow-visible"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/15 to-teal-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
                    <Lightbulb className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-100 group-hover:text-emerald-400">Concept Search</h3>
                </div>
                <p className="text-sm text-zinc-400">
                  Search for ideas directly across the corpus and surface the books, passages, and traditions most closely tied to them.
                </p>
              </Link>

              <Link
                href="/courses"
                onClick={async () => {
                  try {
                    await fetch("/api/track/courses-click", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ source: "tools-grid" }),
                    });
                  } catch {
                    // Silently fail
                  }
                }}
                className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-amber-500/50 hover:bg-zinc-900 overflow-visible"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/15 to-orange-600/15 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                    <BookOpen className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-amber-100 group-hover:text-amber-400">Guided Courses</h3>
                </div>
                <p className="text-sm text-zinc-400">
                  Move from browsing to structured inquiry with learning paths that connect readings, concepts, and synthesis work.
                </p>
              </Link>
            </div>
          </div>

          <div className="mb-8 text-center">
            <p className="text-sm text-zinc-500">
              By using this site, you agree to our{" "}
              <Link href="/privacy" className="text-cyan-400 underline transition-colors hover:text-cyan-300">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-cyan-400 underline transition-colors hover:text-cyan-300">
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
