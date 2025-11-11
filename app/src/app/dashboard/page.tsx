"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSearchHub from "@/components/DashboardSearchHub";
import ConvergenceMachineInfo from "@/components/ConvergenceMachineInfo";
import { BookOpen, Book } from "lucide-react";

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
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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

      {/* Secondary Features Section */}
      <div className="mb-12">
        <h2 className="mb-6 text-2xl font-bold text-amber-100 text-center">
          Explore Your Tools
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Library Card */}
          <Link
            href="/library"
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                <BookOpen className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-amber-100 group-hover:text-amber-400">
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
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                <Book className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-amber-100 group-hover:text-amber-400">
                {journalName}
              </h3>
            </div>
            <p className="text-sm text-zinc-400">
              Your personal collection of insights, truths, and discoveries. Create notes, organize thoughts, and build your understanding.
            </p>
          </Link>

          {/* Convergence Machine Card */}
          <div>
            <ConvergenceMachineInfo />
          </div>
        </div>
      </div>
    </div>
  );
}

