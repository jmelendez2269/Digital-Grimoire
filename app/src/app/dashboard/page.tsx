"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Welcome Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-amber-100">
          Welcome, {user?.user_metadata?.username || "Scholar"}!
        </h1>
        <p className="mt-2 text-lg text-zinc-400">
          Your mystical journey continues...
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Texts Read */}
        <div className="group rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6 transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-400">Texts Read</div>
            <div className="text-2xl opacity-50 transition-opacity group-hover:opacity-100">📚</div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-4xl font-bold text-amber-100">0</div>
            <div className="text-sm text-zinc-500">documents</div>
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full w-0 bg-gradient-to-r from-amber-500 to-amber-600 transition-all" />
          </div>
        </div>

        {/* Grimoire Entries */}
        <div className="group rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6 transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-400">Grimoire Entries</div>
            <div className="text-2xl opacity-50 transition-opacity group-hover:opacity-100">📖</div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-4xl font-bold text-amber-100">0</div>
            <div className="text-sm text-zinc-500">notes</div>
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full w-0 bg-gradient-to-r from-purple-500 to-purple-600 transition-all" />
          </div>
        </div>

        {/* Create Coins */}
        <div className="group rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6 transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-400">Create Coins</div>
            <div className="text-2xl opacity-50 transition-opacity group-hover:opacity-100">🪙</div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-4xl font-bold text-amber-100">0</div>
            <div className="text-sm text-zinc-500">earned</div>
          </div>
          <div className="mt-3 text-xs text-zinc-600">
            +10 for uploading your first text
          </div>
        </div>

        {/* Rank */}
        <div className="group rounded-lg border border-amber-800/50 bg-gradient-to-br from-amber-900/20 to-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-400">Current Rank</div>
            <div className="text-2xl opacity-70 transition-opacity group-hover:opacity-100">⭐</div>
          </div>
          <div className="mt-3 text-3xl font-bold text-amber-400">Neophyte</div>
          <div className="mt-3 text-xs text-zinc-500">
            Level 1 • Next: Adept (100 coins)
          </div>
        </div>
      </div>

      {/* Getting Started Banner */}
      <div className="mb-12 rounded-lg border border-amber-800/30 bg-gradient-to-r from-amber-900/10 to-amber-800/5 p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">🎓</div>
          <div className="flex-1">
            <h3 className="mb-2 text-xl font-bold text-amber-100">
              Begin Your Journey
            </h3>
            <p className="mb-4 text-zinc-400">
              Start exploring the Digital Grimoire by uploading your first esoteric text, creating a personal note, or browsing the public library.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400"
              >
                📤 Upload First Text
              </Link>
              <Link
                href="/grimoire"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/20"
              >
                ✍️ Create Entry
              </Link>
              <Link
                href="/library"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                📚 Browse Library
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-12">
        <h2 className="mb-6 text-2xl font-bold text-amber-100">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/library"
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
          >
            <div className="mb-2 text-3xl">📚</div>
            <h3 className="mb-1 text-lg font-semibold text-amber-100 group-hover:text-amber-400">
              Browse Library
            </h3>
            <p className="text-sm text-zinc-400">
              Explore esoteric texts and documents
            </p>
          </Link>

          <Link
            href="/grimoire"
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
          >
            <div className="mb-2 text-3xl">📖</div>
            <h3 className="mb-1 text-lg font-semibold text-amber-100 group-hover:text-amber-400">
              My Grimoire
            </h3>
            <p className="text-sm text-zinc-400">
              Create and organize your notes
            </p>
          </Link>

          <Link
            href="/correspondences"
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
          >
            <div className="mb-2 text-3xl">🔮</div>
            <h3 className="mb-1 text-lg font-semibold text-amber-100 group-hover:text-amber-400">
              Correspondences
            </h3>
            <p className="text-sm text-zinc-400">
              Explore mystical connections
            </p>
          </Link>

          <Link
            href="/rituals"
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
          >
            <div className="mb-2 text-3xl">⚗️</div>
            <h3 className="mb-1 text-lg font-semibold text-amber-100 group-hover:text-amber-400">
              Ritual Inventory
            </h3>
            <p className="text-sm text-zinc-400">
              Track your ritual components
            </p>
          </Link>

          <Link
            href="/profile"
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
          >
            <div className="mb-2 text-3xl">👤</div>
            <h3 className="mb-1 text-lg font-semibold text-amber-100 group-hover:text-amber-400">
              Profile
            </h3>
            <p className="text-sm text-zinc-400">
              View and edit your profile
            </p>
          </Link>

          <Link
            href="/settings"
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
          >
            <div className="mb-2 text-3xl">⚙️</div>
            <h3 className="mb-1 text-lg font-semibold text-amber-100 group-hover:text-amber-400">
              Settings
            </h3>
            <p className="text-sm text-zinc-400">
              Configure your preferences
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Activity Feed */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-amber-100">
            Recent Activity
          </h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-zinc-500">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-xl">
                  👤
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-zinc-400">You</span> created an account
                  </p>
                  <p className="text-xs text-zinc-600">Just now</p>
                </div>
              </div>
              
              <div className="border-t border-zinc-800 pt-4 text-center text-sm text-zinc-600">
                Your activity will appear here as you explore
              </div>
            </div>
          </div>
        </div>

        {/* Community Highlights */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-amber-100">
            Community Highlights
          </h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-900/30 bg-amber-900/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <span className="text-sm font-medium text-amber-300">
                    Tip of the Day
                  </span>
                </div>
                <p className="text-sm text-zinc-400">
                  Upload esoteric texts to earn Create Coins and unlock new ranks. The more you contribute, the more features you unlock!
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">🌟</span>
                  <span className="text-sm font-medium text-zinc-300">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-zinc-400">
                  Knowledge Graph visualization will help you discover connections between mystical concepts across texts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

