"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Network, Search, Sparkles } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import FeedbackModal from "./FeedbackModal";

interface LibrarySearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterOptions: Record<string, unknown>;
  filterValues: Record<string, unknown>;
  onFilterChange: (values: Record<string, unknown>) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (field: string, order: "asc" | "desc") => void;
  getSortLabel: () => string;
  showSortDropdown: boolean;
  setShowSortDropdown: (show: boolean) => void;
}

interface HeaderProps {
  librarySearch?: LibrarySearchProps;
}

const primaryNav = [
  { name: "Library", path: "/library" },
  { name: "Courses", path: "/courses" },
  { name: "Graph", path: "/graph", icon: <Network className="w-3.5 h-3.5" /> },
  { name: "Concept Search", path: "/search", icon: <Search className="w-3.5 h-3.5" /> },
  { name: "Parallax Search", path: "/seven-lenses", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { name: "Journal", path: "/journal" },
];

const mobileNav = [
  { name: "Library", path: "/library", icon: "📚" },
  { name: "Courses", path: "/courses", icon: "🎓" },
  { name: "Graph", path: "/graph", icon: "🕸️" },
  { name: "Concept Search", path: "/search", icon: "💡" },
  { name: "Seven Lenses", path: "/seven-lenses", icon: "✨" },
  { name: "Journal", path: "/journal", icon: "📝" },
];

function Header({ librarySearch }: HeaderProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [mounted, setMounted] = useState(typeof window !== "undefined");

  void librarySearch;

  useEffect(() => {
    if (!mounted) {
      const frame = window.requestAnimationFrame(() => setMounted(true));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [mounted]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`);

  const adminLinks = [
    { label: "Admin Panel", icon: "🔐", href: "/admin" },
    { label: "Admin Upload", icon: "📤", href: "/admin/upload" },
    { label: "Import Sacred Text", icon: "🌐", href: "/admin/import-sacred-text" },
    { label: "Courses", icon: "📚", href: "/admin/courses" },
    { label: "Knowledge Graph", icon: "🕸️", href: "/admin/knowledge-graph" },
    { label: "Embeddings", icon: "🔮", href: "/admin/embeddings" },
    { label: "Feedback", icon: "💬", href: "/admin/feedback" },
    { label: "Technical Wiki", icon: "📖", href: "/admin/wiki" },
    { label: "Blog", icon: "📝", href: "/admin/blog" },
  ];

  return (
    <header className="sticky top-0 z-50 pt-4 px-4 pb-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
      <nav className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between px-6 py-4 glass-panel rounded-full relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-50"></div>

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

          <div className="flex flex-col leading-none font-sans">
            <span className="text-xl font-bold tracking-widest text-zinc-100 group-hover:text-cyan-400 transition-colors uppercase">
              Prismarium
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex ml-8">
          {primaryNav.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`relative px-5 py-2 text-lg font-medium transition-all duration-300 rounded-md border border-transparent ${
                isActive(item.path)
                  ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                  : "text-zinc-400 hover:text-cyan-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon}
                {item.name}
              </div>
              {isActive(item.path) && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></div>
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-zinc-400 hover:text-cyan-400 focus:outline-none bg-black/30 rounded-full border border-white/10"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex items-center justify-end min-w-[32px] sm:min-w-[140px]">
            {!mounted || loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
            ) : user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-white/10 hover:border-cyan-500/30 bg-black/30 transition-all group"
                >
                  <span className="hidden sm:block text-sm font-mono font-bold text-zinc-400 group-hover:text-cyan-200 px-2 text-right">
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

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-[9999] mt-3 w-64 bg-zinc-950 border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
                      <div className="bg-gradient-to-r from-cyan-500/10 to-transparent px-4 py-3 border-b border-white/5">
                        <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1">Identity</div>
                        <div className="text-sm font-bold text-zinc-100 truncate">{user.email}</div>
                        {isAdmin && <div className="text-[10px] text-cyan-400 mt-1 font-mono">[ ADMIN ACCESS GRANTED ]</div>}
                      </div>

                      <div className="p-2 space-y-1">
                        {[
                          { href: "/profile", icon: "👤", label: "Profile" },
                          { href: "/dashboard", icon: "📊", label: "Dashboard" },
                          { href: "/library/my-library", icon: "📖", label: "My Library" },
                          { href: "/journal", icon: "📝", label: "Journal" },
                          { href: "/settings", icon: "⚙️", label: "Settings" },
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
                            {adminLinks.map((link) => (
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
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 text-sm font-bold text-black bg-cyan-500 hover:bg-cyan-400 rounded transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  JOIN PRISMARIUM &gt;
                </Link>
              </div>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 mt-2 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 mx-4 flex flex-col z-50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>

            {user ? (
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  {user.user_metadata?.avatar_url ? (
                    <Image src={user.user_metadata.avatar_url} alt="User" width={36} height={36} className="rounded-full" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-cyan-900/40 flex items-center justify-center font-bold text-cyan-500">
                      {(user.user_metadata?.username || user.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-zinc-100">{user.user_metadata?.username || user.email?.split("@")[0]}</div>
                    <div className="text-xs text-zinc-500">{user.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pb-4 border-b border-white/10">
                  {mobileNav.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`p-3 rounded-lg flex flex-col items-center justify-center text-center gap-1 ${
                        isActive(item.path)
                          ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                          : "bg-black/30 border border-white/5 text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-xs font-semibold">{item.name}</span>
                    </Link>
                  ))}
                </div>

                <div className="space-y-1 pb-4 border-b border-white/10">
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-md">
                    📊 Dashboard
                  </Link>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-md">
                    👤 Profile Tools
                  </Link>
                  <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-md">
                    ⚙️ Settings
                  </Link>
                </div>

                {isAdmin && (
                  <div className="space-y-1 pb-4 border-b border-white/10">
                    <div className="px-2 text-[10px] font-mono text-red-400/70 uppercase tracking-widest mb-2">Admin</div>
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-md">
                      🔐 Admin Panel
                    </Link>
                  </div>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full py-3 text-sm font-bold text-red-400 bg-red-900/10 hover:bg-red-900/20 rounded-lg transition-colors border border-red-900/30"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col gap-3 py-4">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center text-sm font-bold text-zinc-300 border border-white/20 rounded-lg hover:bg-white/5">
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 text-center text-sm font-bold text-black bg-cyan-500 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400"
                >
                  JOIN PRISMARIUM
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
      <FeedbackModal isOpen={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} />
    </header>
  );
}

export default memo(Header);
