"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSearchHub from "@/components/DashboardSearchHub";
import ConvergenceMachineInfo from "@/components/ConvergenceMachineInfo";
import { BookOpen, Book, Network, GraduationCap } from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  // Get custom journal name or default to "Digital Grimoire"
  const journalName = user?.user_metadata?.journal_name || "Digital Grimoire";

  return (
    <div className="flex flex-1 flex-col px-8 py-12">
      <div className="mx-auto w-full max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-amber-100">
            Welcome, {user?.user_metadata?.username || "Scholar"}!
          </h1>
          <p className="mt-2 text-lg text-zinc-400">
            Your journey of discovery begins here
          </p>
        </div>

        {/* Integrated Search Hub - Primary Focus */}
        <div className="mb-16">
          <DashboardSearchHub />
        </div>

        {/* Explore Your Tools Section */}
        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold text-amber-100 text-center">
            Explore Your Tools
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {/* Library Card */}
            <Link
              href="/library"
              className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900 overflow-visible"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-amber-600/30 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                  <BookOpen className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-amber-100 group-hover:text-amber-400">
                  Library
                </h3>
              </div>
              <p className="text-sm text-zinc-400">
                Browse and explore the collection of esoteric texts, sacred writings, and wisdom traditions from across cultures and time periods.
              </p>
            </Link>

            {/* Journal Card */}
            <Link
              href="/journal"
              className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-zinc-900 overflow-visible"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 to-indigo-600/30 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/20">
                  <Book className="w-6 h-6 text-indigo-400" />
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
              className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-cyan-500/50 hover:bg-zinc-900 overflow-visible"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 to-cyan-600/30 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
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
              className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-blue-500/50 hover:bg-zinc-900 overflow-visible"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 to-blue-600/30 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
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

            {/* Convergence Machine Card */}
            <ConvergenceMachineInfo />
          </div>
        </div>
      </div>
    </div>
  );
}

