"use client";

import { useState, memo, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import FeedbackModal from "./FeedbackModal";
import { ChevronDown, Search, ArrowUpDown } from "lucide-react";
import AdvancedFilters from "@/components/AdvancedFilters";

interface LibrarySearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterOptions: any;
  filterValues: any;
  onFilterChange: (values: any) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  getSortLabel: () => string;
  showSortDropdown: boolean;
  setShowSortDropdown: (show: boolean) => void;
}

interface HeaderProps {
  librarySearch?: LibrarySearchProps;
}

function Header({ librarySearch }: HeaderProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut, isAdmin, refreshAdminStatus } = useAuth(); // Single source of truth
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Ensure client-only rendering to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (path: string) => {
    // Only check pathname after mount to prevent hydration mismatch
    if (!mounted) return false;
    return pathname === path;
  };

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }

    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  // --- Admin Navigation Config ---
  // All admin navigation must exist only in this array, and only inside the profile dropdown.
  // Do not add admin links to the main navigation bar; new admin pages must be added to this array.
  // REQUIRED: Admin Panel and Admin Upload must ALWAYS be in this array for admin users.
  const adminLinks = [
    { label: "Admin Panel", icon: "🔐", href: "/admin" },
    { label: "Admin Upload", icon: "📤", href: "/admin/upload" },
    { label: "Import Sacred Text", icon: "🌐", href: "/admin/import-sacred-text" },
    { label: "Courses", icon: "📚", href: "/admin/courses" },
    { label: "Feedback", icon: "💬", href: "/admin/feedback" },
    // To add new admin pages, add entries here!
  ];

  return (
    <header className="relative z-50 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
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
          <span className="text-xl font-bold text-amber-100">Convergence</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex flex-1 ml-8">
          <Link
            href="/library"
            className={`text-sm font-medium transition-colors ${
              mounted && isActive("/library")
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            📚 Library
          </Link>
          <Link
            href="/courses"
            className={`text-sm font-medium transition-colors ${
              isActive("/courses") || (mounted && pathname?.startsWith("/courses/"))
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            🎓 Courses
          </Link>
          <Link
            href="/journal"
            className={`text-sm font-medium transition-colors ${
              isActive("/journal") || (mounted && pathname?.startsWith("/journal/"))
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            📝 Journal
          </Link>
          <Link
            href="/convergence-machine"
            className={`text-sm font-medium transition-colors ${
              mounted && isActive("/convergence-machine")
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            ⚡ Convergence Machine
          </Link>

          {/* More Menu - Coming Soon Features */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="flex items-center gap-1 text-sm font-medium text-zinc-400 transition-colors hover:text-amber-300"
            >
              More
              <ChevronDown className={`w-4 h-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl py-2 z-50">
                <div className="px-3 py-2 text-xs font-semibold text-amber-500/70 uppercase tracking-wider">
                  Coming Soon
                </div>
                <div className="px-3 py-1.5 text-sm text-zinc-500">
                  <div className="flex items-center gap-2 py-1">
                    <span>🎵</span>
                    <span>Media</span>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <span>🔮</span>
                    <span>Correspondences</span>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <span>⚗️</span>
                    <span>Ritual Machine</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Auth Buttons / User Menu */}
        <div className="flex items-center gap-4">
          {/* Feedback Button - Always accessible */}
          <button
            onClick={() => setFeedbackModalOpen(true)}
            className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-amber-100 transition-all hover:bg-zinc-700 hover:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            aria-label="Send Feedback"
          >
            <span className="text-base">💬</span>
            <span className="hidden sm:inline">Feedback</span>
          </button>

          {/* Debug info - remove after testing */}
          {process.env.NODE_ENV === 'development' && mounted && (
            <div className="text-xs text-zinc-500">
              {loading ? '⏳' : user ? '👤' : '🚫'}
            </div>
          )}
          
          {/* Only render auth-dependent UI after mount to prevent hydration mismatch */}
          {!mounted ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-zinc-800">
              <span className="sr-only">Loading user menu...</span>
            </div>
          ) : loading ? (
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
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setMenuOpen(false)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 z-[9999] mt-2 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/50 overflow-y-auto max-h-[90vh]">
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
                        <span>{user?.user_metadata?.journal_name || "Journal"}</span>
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

                    {/* Coming Soon Section */}
                    <hr className="my-1 border-zinc-800" />
                    <div className="py-1">
                      <div className="px-4 py-1 text-xs font-semibold text-amber-500/70 uppercase tracking-wider">
                        Coming Soon
                      </div>
                      <div className="px-4 py-2 text-sm text-zinc-500">
                        <div className="flex items-center gap-3 py-1">
                          <span className="text-base">🎵</span>
                          <span>Media</span>
                        </div>
                        <div className="flex items-center gap-3 py-1">
                          <span className="text-base">🔮</span>
                          <span>Correspondences</span>
                        </div>
                        <div className="flex items-center gap-3 py-1">
                          <span className="text-base">⚗️</span>
                          <span>Ritual Machine</span>
                        </div>
                      </div>
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
                    {/* Debug info - temporarily visible in all environments for troubleshooting */}
                    <hr className="my-1 border-zinc-800" />
                    <div className="px-4 py-3 text-xs border-t-2 border-amber-500/30 bg-amber-500/5 space-y-2">
                      <div className="font-semibold text-amber-400 mb-2">🔧 Debug Tools</div>
                      <div className="text-zinc-400 space-y-1">
                        <div>isAdmin: <span className={isAdmin ? "text-green-400" : "text-red-400"}>{String(isAdmin)}</span></div>
                        <div>User ID: {user?.id?.substring(0, 8)}...</div>
                      </div>
                      <div className="space-y-1 pt-2">
                        <button
                          onClick={async () => {
                            console.log('🔄 Manually refreshing admin status...');
                            await refreshAdminStatus();
                            // Don't close menu so user can see the result
                          }}
                          className="w-full rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 font-medium"
                        >
                          🔄 Refresh Admin Status
                        </button>
                        <button
                          onClick={async () => {
                            console.log('🧪 Testing admin status API...');
                            try {
                              const response = await fetch('/api/auth/admin-status', {
                                credentials: 'include',
                              });
                              const data = await response.json();
                              console.log('🧪 API Response:', data);
                              alert(`Admin Status Test:\n\nisAdmin: ${data.isAdmin}\nrole: ${data.role}\nuserId: ${data.userId}\n\nCheck console for full details.`);
                              await refreshAdminStatus();
                            } catch (err) {
                              console.error('🧪 API Test Error:', err);
                              alert('Error testing API. Check console.');
                            }
                          }}
                          className="w-full rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 font-medium"
                        >
                          🧪 Test Admin API
                        </button>
                      </div>
                    </div>

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


      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />
    </header>
  );
}

export default memo(Header);

