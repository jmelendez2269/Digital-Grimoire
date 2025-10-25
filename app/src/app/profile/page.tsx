"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setUsername(session.user.user_metadata?.username || "");
        setDisplayName(session.user.user_metadata?.display_name || "");
        setBio(session.user.user_metadata?.bio || "");
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          username,
          display_name: displayName,
          bio,
        },
      });

      if (error) {
        setMessage("Error updating profile: " + error.message);
      } else {
        setMessage("Profile updated successfully!");
      }
    } catch (err) {
      setMessage("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-amber-100">Your Profile</h1>
            <p className="mt-2 text-zinc-400">
              Manage your personal information and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
                {/* Avatar */}
                <div className="mb-6 flex justify-center">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-4xl font-bold text-zinc-950">
                    {username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-100">Neophyte</div>
                    <div className="text-sm text-zinc-500">Current Rank</div>
                  </div>

                  <div className="flex justify-around border-t border-zinc-800 pt-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-100">0</div>
                      <div className="text-xs text-zinc-500">Texts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-100">0</div>
                      <div className="text-xs text-zinc-500">Entries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-100">0</div>
                      <div className="text-xs text-zinc-500">Coins</div>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="mt-6 border-t border-zinc-800 pt-6">
                  <h3 className="mb-3 text-sm font-semibold text-amber-100">Badges</h3>
                  <div className="text-center text-sm text-zinc-500">
                    No badges earned yet
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8">
                <h2 className="mb-6 text-2xl font-bold text-amber-100">
                  Personal Information
                </h2>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-amber-100">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-500 opacity-60"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Email cannot be changed
                    </p>
                  </div>

                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-amber-100">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="mystic_scholar"
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-amber-100">
                      Display Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="The Mystic Scholar"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-amber-100">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="Share a bit about your esoteric journey..."
                    />
                  </div>

                  {/* Message */}
                  {message && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${
                      message.includes("Error")
                        ? "border-red-500/20 bg-red-500/10 text-red-400"
                        : "border-green-500/20 bg-green-500/10 text-green-400"
                    }`}>
                      {message}
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-md bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

