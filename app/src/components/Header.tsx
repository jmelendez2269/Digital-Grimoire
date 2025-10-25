"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // Check if user is admin
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.warn('Could not fetch user profile:', error.message);
            setIsAdmin(false);
          } else {
            setIsAdmin(profile?.role === 'admin');
          }
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      // Update admin status
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.warn('Could not fetch user profile:', error.message);
            setIsAdmin(false);
          } else {
            setIsAdmin(profile?.role === 'admin');
          }
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <svg
            viewBox="0 0 100 100"
            className="h-8 w-8 text-amber-500/70"
            fill="currentColor"
          >
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="50" cy="50" r="3" fill="currentColor" />
          </svg>
          <span className="text-xl font-bold text-amber-100">Digital Grimoire</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/library"
            className={`text-sm font-medium transition-colors ${
              isActive("/library")
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            📚 Library
          </Link>
          <Link
            href="/correspondences"
            className={`text-sm font-medium transition-colors ${
              isActive("/correspondences")
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            🔮 Correspondences
          </Link>
          <Link
            href="/grimoire"
            className={`text-sm font-medium transition-colors ${
              isActive("/grimoire")
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            📖 My Grimoire
          </Link>
          <Link
            href="/rituals"
            className={`text-sm font-medium transition-colors ${
              isActive("/rituals")
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            ⚗️ Rituals
          </Link>
        </div>

        {/* Auth Buttons / User Menu */}
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-zinc-800" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-zinc-700"
              >
                <span className="hidden sm:inline">
                  {user.user_metadata?.username || user.email?.split("@")[0]}
                </span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      👤 Profile
                    </Link>
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      📊 Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      ⚙️ Settings
                    </Link>
                    {isAdmin && (
                      <>
                        <hr className="my-1 border-zinc-700" />
                        <Link
                          href="/admin/upload"
                          className="block px-4 py-2 text-sm text-amber-400 hover:bg-zinc-800"
                          onClick={() => setMenuOpen(false)}
                        >
                          🔐 Admin Upload
                        </Link>
                      </>
                    )}
                    <hr className="my-1 border-zinc-700" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleSignOut();
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-amber-300"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

