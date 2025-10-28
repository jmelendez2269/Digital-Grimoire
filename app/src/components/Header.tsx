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
    
    // Safety timeout - ensure loading doesn't get stuck
    const timeoutId = setTimeout(() => {
      console.log('[Header] Safety timeout triggered - forcing loading to false');
      setLoading(false);
    }, 3000);
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Header] Session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
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
            console.warn('[Header] Could not fetch user profile:', error.message);
            console.log('[Header] Setting admin to false due to error');
            setIsAdmin(false);
          } else {
            console.log('[Header] User profile fetched:', {
              role: profile?.role,
              isAdmin: profile?.role === 'admin'
            });
            setIsAdmin(profile?.role === 'admin');
          }
        } catch (err) {
          console.error('[Header] Error checking admin status:', err);
          setIsAdmin(false);
        }
      }
      
      clearTimeout(timeoutId);
      setLoading(false);
      console.log('[Header] Loading complete, setting loading to false');
    }).catch((error) => {
      console.error('[Header] Error getting session:', error);
      clearTimeout(timeoutId);
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

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
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
            href="/journal"
            className={`text-sm font-medium transition-colors ${
              isActive("/journal") || pathname?.startsWith("/journal/")
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            📝 Journal
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
          {/* Debug info - remove after testing */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-zinc-500">
              {loading ? '⏳' : user ? '👤' : '🚫'}
            </div>
          )}
          
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-zinc-800">
              <span className="sr-only">Loading user menu...</span>
            </div>
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-amber-100 transition-all hover:bg-zinc-700 hover:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                aria-label="User menu"
                aria-expanded={menuOpen}
              >
                {/* User Avatar/Initial */}
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="User avatar"
                    className="h-6 w-6 rounded-full object-cover ring-1 ring-amber-500/50"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-xs font-bold text-zinc-900 ring-1 ring-amber-500/50">
                    {(user.user_metadata?.username || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                
                {/* Username - visible on larger screens */}
                <span className="hidden sm:inline text-amber-100">
                  {user.user_metadata?.username || user.email?.split("@")[0] || "User"}
                </span>
                
                {/* Dropdown indicator */}
                <svg
                  className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
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
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/50 overflow-hidden">
                    {/* User Info Header */}
                    <div className="border-b border-zinc-800 bg-zinc-800/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.user_metadata?.avatar_url ? (
                          <img
                            src={user.user_metadata.avatar_url}
                            alt="User avatar"
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-500/50"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-base font-bold text-zinc-900 ring-2 ring-amber-500/50">
                            {(user.user_metadata?.username || user.email || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                          <div className="text-sm font-semibold text-amber-100 truncate">
                            {user.user_metadata?.username || user.email?.split("@")[0] || "User"}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            {user.email}
                          </div>
                          {isAdmin && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              Admin
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-amber-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="text-base">👤</span>
                        <span>Profile</span>
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-amber-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="text-base">📊</span>
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/library/my-library"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-amber-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="text-base">📖</span>
                        <span>My Library</span>
                      </Link>
                      <Link
                        href="/journal"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-amber-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="text-base">📝</span>
                        <span>Study Journal</span>
                      </Link>
                      <Link
                        href="/annotations/search"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-amber-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="text-base">🔍</span>
                        <span>Search Annotations</span>
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-amber-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="text-base">⚙️</span>
                        <span>Settings</span>
                      </Link>
                    </div>

                    {/* Admin Section */}
                    {isAdmin && (
                      <>
                        <hr className="my-1 border-zinc-800" />
                        <div className="py-1">
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-amber-400 transition-colors hover:bg-zinc-800 hover:text-amber-300"
                            onClick={() => setMenuOpen(false)}
                          >
                            <span className="text-base">🔐</span>
                            <span>Admin Panel</span>
                          </Link>
                          <Link
                            href="/admin/upload"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-amber-400 transition-colors hover:bg-zinc-800 hover:text-amber-300"
                            onClick={() => setMenuOpen(false)}
                          >
                            <span className="text-base">📤</span>
                            <span>Admin Upload</span>
                          </Link>
                        </div>
                      </>
                    )}

                    {/* Sign Out */}
                    <hr className="my-1 border-zinc-800" />
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleSignOut();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-400 transition-colors hover:bg-zinc-800 hover:text-red-300"
                      >
                        <span className="text-base">🚪</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
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

