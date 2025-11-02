"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut, isAdmin: contextIsAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [localIsAdmin, setLocalIsAdmin] = useState(false);

  // Use context admin status immediately, then verify with direct check
  // This ensures we don't miss showing admin links while the check runs
  const isAdmin = contextIsAdmin || localIsAdmin;

  // Double-check admin status directly to ensure it's always correct
  useEffect(() => {
    if (user && !loading) {
      // Use context value immediately
      if (contextIsAdmin) {
        setLocalIsAdmin(true);
      }

      const checkAdmin = async () => {
        try {
          const supabase = createClient();
          
          // Verify session first
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) {
            console.warn('[Header] No active session found');
            setLocalIsAdmin(false);
            return;
          }
          
          // Verify user ID matches session
          if (currentSession.user.id !== user.id) {
            console.warn('[Header] User ID mismatch:', {
              sessionUserId: currentSession.user.id,
              contextUserId: user.id
            });
          }
          
          // Query profile - RLS policy "Users can view own profile" should automatically filter
          // Try querying by current user ID first
          const { data: profile, error, status } = await supabase
            .from('users')
            .select('role, id, email')
            .eq('id', currentSession.user.id)
            .maybeSingle(); // Use maybeSingle instead of single to handle missing records gracefully
          
          // If that fails, try a direct query letting RLS handle filtering
          // (Some RLS setups prefer queries without explicit filters)
          if (error || !profile) {
            console.log('[Header] Primary query failed, trying alternative query method...');
            const { data: altProfile, error: altError } = await supabase
              .from('users')
              .select('role, id, email')
              .maybeSingle();
            
            if (altProfile && !altError) {
              // Alternative query succeeded - use its result
              const finalProfile = altProfile;
              const userIsAdmin = finalProfile?.role === 'admin';
              setLocalIsAdmin(userIsAdmin);
              console.log('[Header] Alternative query succeeded:', { role: finalProfile?.role, isAdmin: userIsAdmin });
              return;
            }
          }
          
          if (error) {
            console.error('[Header] Error fetching profile:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
              status,
              userId: user.id,
              sessionUserId: currentSession.user.id,
              userEmail: user.email,
              rlsIssue: 'This might be an RLS policy issue. Check if the policy allows SELECT on users table.'
            });
            
            // Check if it's a "not found" error (profile doesn't exist)
            if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
              console.warn('[Header] User profile does not exist in users table.');
              console.warn('[Header] To fix: Run FIX_ADMIN_ACCESS.sql in Supabase SQL Editor, or check if auto-profile migration is installed.');
              
              // Try to auto-create the profile (may fail due to RLS, but worth trying)
              try {
                const { error: insertError } = await supabase
                  .from('users')
                  .insert({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
                    role: 'user', // Default to user, admin must be set manually in DB
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                
                if (!insertError) {
                  console.log('[Header] Successfully created user profile');
                  // Profile created, but role is 'user' by default
                  // Admin role must be set in database manually
                  setLocalIsAdmin(false);
                  return;
                } else {
                  console.warn('[Header] Could not auto-create profile:', insertError.message);
                }
              } catch (createError) {
                console.warn('[Header] Auto-create profile failed (expected if RLS prevents it):', createError);
              }
              
              // Try to see if we can access auth.users metadata
              const userMetadata = user.user_metadata;
              if (userMetadata?.role === 'admin') {
                console.log('[Header] Found admin role in user_metadata, using that');
                setLocalIsAdmin(true);
                return;
              }
            }
            
            // Keep context value if available
            setLocalIsAdmin(contextIsAdmin || false);
            return;
          }
          
          // Handle case where profile doesn't exist (maybeSingle returns null)
          if (!profile) {
            console.warn('[Header] Profile query returned null/no data', {
              userId: currentSession.user.id,
              userEmail: user.email,
              queryStatus: status,
              errorMessage: error?.message
            });
            setLocalIsAdmin(contextIsAdmin || false);
            return;
          }
          
          const userIsAdmin = profile?.role === 'admin';
          setLocalIsAdmin(userIsAdmin);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[Header] Direct admin check:', { 
              userId: user.id,
              sessionUserId: currentSession.user.id,
              userEmail: user.email,
              profileExists: !!profile,
              profileId: profile?.id,
              profileEmail: profile?.email,
              role: profile?.role, 
              userIsAdmin,
              contextIsAdmin,
              localIsAdmin: userIsAdmin,
              finalIsAdmin: userIsAdmin || contextIsAdmin
            });
          }
        } catch (error) {
          console.error('[Header] Exception checking admin status:', error);
          // Fallback to context value
          setLocalIsAdmin(contextIsAdmin || false);
        }
      };
      
      checkAdmin();
    } else {
      setLocalIsAdmin(false);
    }
  }, [user, loading, contextIsAdmin]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  // --- Admin Navigation Config ---
  // All admin navigation must exist only in this array, and only inside the profile dropdown.
  // Do not add admin links to the main navigation bar; new admin pages must be added to this array.
  // REQUIRED: Admin Panel and Admin Upload must ALWAYS be in this array for admin users.
  const adminLinks = [
    { label: "Admin Panel", icon: "🔐", href: "/admin" },
    { label: "Admin Upload", icon: "📤", href: "/admin/upload" },
    { label: "Import Sacred Text", icon: "🌐", href: "/admin/import-sacred-text" },
    // To add new admin pages, add entries here!
  ];

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

                    {/* Admin Section - Always render for admins */}
                    {isAdmin && (
                      <>
                        <hr className="my-1 border-zinc-800" />
                        <div className="py-1">
                          <div className="px-4 py-1 text-xs font-semibold text-amber-500/70 uppercase tracking-wider">
                            Admin
                          </div>
                          {adminLinks.map(link => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-amber-400 transition-colors hover:bg-zinc-800 hover:text-amber-300 font-medium"
                              onClick={() => setMenuOpen(false)}
                            >
                              <span className="text-base">{link.icon}</span>
                              <span>{link.label}</span>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                    {/* Debug info - only in development */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-800">
                        Debug: isAdmin={String(isAdmin)}, contextIsAdmin={String(contextIsAdmin)}, localIsAdmin={String(localIsAdmin)}
                      </div>
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

