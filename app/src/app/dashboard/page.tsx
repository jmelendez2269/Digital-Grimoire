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
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="text-sm font-medium text-zinc-400">Texts Read</div>
          <div className="mt-2 text-3xl font-bold text-amber-100">0</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="text-sm font-medium text-zinc-400">
            Grimoire Entries
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-100">0</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="text-sm font-medium text-zinc-400">Create Coins</div>
          <div className="mt-2 text-3xl font-bold text-amber-100">0</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="text-sm font-medium text-zinc-400">Rank</div>
          <div className="mt-2 text-3xl font-bold text-amber-100">Neophyte</div>
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
      <div>
        <h2 className="mb-6 text-2xl font-bold text-amber-100">
          Recent Activity
        </h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-center text-zinc-500">
            No recent activity yet. Start exploring!
          </p>
        </div>
      </div>
    </div>
  );
}

