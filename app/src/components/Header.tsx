"use client";

import { useState, memo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import FeedbackModal from "./FeedbackModal";
import { ChevronDown, Search, Network } from "lucide-react";

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
  const { user, loading, signOut, isAdmin, refreshAdminStatus } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

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

  const adminLinks = [
    { label: "Admin Panel", icon: "🔐", href: "/admin" },
    { label: "Admin Upload", icon: "📤", href: "/admin/upload" },
    { label: "Import Sacred Text", icon: "🌐", href: "/admin/import-sacred-text" },
    { label: "Courses", icon: "📚", href: "/admin/courses" },
    { label: "Knowledge Graph", icon: "🕸️", href: "/admin/knowledge-graph" },
    { label: "Embeddings", icon: "🔮", href: "/admin/embeddings" },
    { label: "Feedback", icon: "💬", href: "/admin/feedback" },
  ];

  return (
    <header className="sticky top-0 z-50 pt-4 px-4 pb-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
      <nav className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 glass-panel rounded-full relative">
        {/* Decorative Grid Line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-50"></div>

        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-cyan-500/30 bg-black/50 group-hover:border-cyan-500/70 transition-colors">
            <div className="w-4 h-4 rounded-full bg-cyan-500/10 group-hover:bg-cyan-500/30 blur-[1px]"></div>
            <svg
              viewBox="0 0 100 100"
              className="absolute h-6 w-6 text-cyan-500 group-hover:text-cyan-400 transition-colors"
              fill="currentColor"
            >
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" className="opacity-50" />
              <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" fill="none" />
              <circle cx="50" cy="50" r="4" fill="currentColor" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-100 group-hover:text-white font-sans uppercase">
            Project Parallax
          </span>
        </Link>

        {/* Desktop Navigation (HUD Tabs) */}
        <div className="hidden items-center gap-1 md:flex ml-8">
          {[
            { name: 'Library', path: '/library' },
            { name: 'Search', path: '/search', icon: <Search className="w-3.5 h-3.5" /> },
            { name: 'Courses', path: '/courses' },
            { name: 'Journal', path: '/journal' },
            { name: 'Graph', path: '/graph', icon: <Network className="w-3.5 h-3.5" /> }
          ].map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`relative px-4 py-1.5 text-base font-medium transition-all duration-300 rounded-md border border-transparent ${isActive(item.path) || pathname?.startsWith(item.path + '/')
                ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                : "text-zinc-400 hover:text-cyan-200 hover:bg-white/5"
                }`}
            >
              <div className="flex items-center gap-2">
                {item.icon}
                {item.name}
              </div>
              {/* Active Indicator Dot */}
              {(isActive(item.path) || pathname?.startsWith(item.path + '/')) && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></div>
              )}
            </Link>
          ))}

          {/* More Menu */}
          <div className="relative ml-2" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm uppercase tracking-wider font-mono text-zinc-500 transition-colors hover:text-cyan-400"
            >
              EXTRAS <ChevronDown className={`w-3 h-3 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-48 glass-panel rounded-lg py-2 z-50">
                <div className="px-3 py-2 text-[10px] font-mono font-bold text-cyan-500/50 uppercase tracking-widest border-b border-white/5 mb-1">
                  Modules
                </div>
                <Link
                  href="/ritual-machine"
                  onClick={() => setMoreMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-zinc-300 hover:text-cyan-400 hover:bg-white/5 transition-colors font-mono"
                >
                  Ritual Machine
                </Link>
                <Link
                  href="/practitioner/rituals"
                  onClick={() => setMoreMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-zinc-300 hover:text-cyan-400 hover:bg-white/5 transition-colors font-mono"
                >
                  Workbench (Practitioner)
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Status & User */}
        <div className="flex items-center gap-3">
          {/* System Status Indicator (Hidden on mobile) */}
          {/* System Status Indicator - Removed per user request */}

          <button
            onClick={() => setFeedbackModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-white/5 rounded-md transition-colors"
            title="Send Feedback"
          >
            <span className="text-lg leading-none">💬</span>
            <span className="text-sm font-medium">Feedback</span>
          </button>

          {/* User Profile */}
          {!mounted || loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-white/10 hover:border-amber-500/30 bg-black/30 transition-all group"
              >
                <span className="hidden sm:block text-sm font-mono text-zinc-400 group-hover:text-amber-200 px-2 text-right">
                  {user.user_metadata?.username || user.email?.split("@")[0]}
                </span>

                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="User"
                    width={28}
                    height={28}
                    className="rounded-full object-cover ring-1 ring-white/10 group-hover:ring-cyan-500/50"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-cyan-900/40 flex items-center justify-center text-[10px] font-bold text-cyan-500 ring-1 ring-cyan-500/30">
                    {(user.user_metadata?.username || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
              </button>

              {/* Enhanced Dropdown */}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-[9999] mt-3 w-64 bg-zinc-950 border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
                    {/* Cyber Header */}
                    <div className="bg-gradient-to-r from-cyan-500/10 to-transparent px-4 py-3 border-b border-white/5">
                      <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1">Identity</div>
                      <div className="text-sm font-bold text-zinc-100 truncate">{user.email}</div>
                      {isAdmin && <div className="text-[10px] text-cyan-400 mt-1 font-mono">[ ADMIN ACCESS GRANTED ]</div>}
                    </div>

                    <div className="p-2 space-y-1">
                      {[
                        { href: '/profile', icon: '👤', label: 'Profile' },
                        { href: '/dashboard', icon: '📊', label: 'Dashboard' },
                        { href: '/library/my-library', icon: '📖', label: 'My Library' },
                        { href: '/journal', icon: '📝', label: 'Journal' },
                        { href: '/settings', icon: '⚙️', label: 'Settings' },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-cyan-300 hover:bg-white/5 rounded-md transition-all font-medium"
                        >
                          <span className="opacity-70">{item.icon}</span> {item.label}
                        </Link>
                      ))}

                      {isAdmin && (
                        <>
                          <div className="my-2 h-[1px] bg-white/5"></div>
                          <div className="px-3 py-1 text-[10px] font-mono text-cyan-500/70 uppercase">Admin Utilities</div>
                          {adminLinks.map(link => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-xs text-cyan-400 hover:text-cyan-200 hover:bg-cyan-900/10 rounded-md transition-all font-mono"
                            >
                              <span>{link.icon}</span> {link.label}
                            </Link>
                          ))}
                        </>
                      )}

                      <div className="my-2 h-[1px] bg-white/5"></div>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-md transition-all text-left"
                      >
                        🚪 Disconnect
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Log In</Link>
              <Link href="/register" className="px-4 py-1.5 text-sm font-bold text-black bg-cyan-500 hover:bg-cyan-400 rounded transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                JOIN_PARALLAX &gt;
              </Link>
            </div>
          )}
        </div>
      </nav>
      <FeedbackModal isOpen={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} />
    </header>
  );
}

export default memo(Header);

