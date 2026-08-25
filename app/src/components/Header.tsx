"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import {
  BookMarked,
  BookOpen,
  GraduationCap,
  MessageCircle,
  Network,
  NotebookPen,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

const FeedbackModal = dynamic(() => import("./FeedbackModal"), {
  ssr: false,
});

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

type DropdownItem = {
  name: string;
  path: string;
  description?: string;
  comingSoon?: boolean;
  external?: boolean;
};

type NavItem = {
  name: string;
  path: string;
  icon?: React.ReactNode;
  matchPaths?: string[];
  dropdownItems?: DropdownItem[];
};

const guestPrimaryNav: NavItem[] = [
  { name: "Courses", path: "/courses" },
  { name: "Library", path: "/library" },
  { name: "Explore", path: "/explore" },
  { name: "Membership", path: "/pricing" },
];

const memberPrimaryNav: NavItem[] = [
  { name: "Library", path: "/library" },
  { name: "Courses", path: "/courses" },
  {
    name: "Tools",
    path: "/explore",
    icon: <Network className="h-3.5 w-3.5" />,
    matchPaths: ["/explore", "/graph", "/search", "/seven-lenses"],
    dropdownItems: [
      {
        name: "Knowledge Graph",
        path: "/graph",
        description: "Traverse correspondence connections",
      },
      {
        name: "Concept Search",
        path: "/search",
        description: "Semantic search across the corpus",
      },
      {
        name: "Seven Lenses",
        path: "/seven-lenses",
        description: "Compare seven perspectives",
      },
    ],
  },
  {
    name: "Workbench",
    path: "/workbench",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    matchPaths: ["/workbench", "/journal"],
    dropdownItems: [
      {
        name: "Study Journal",
        path: "/journal",
        description: "Your private notes and connections",
      },
      {
        name: "The Working",
        path: "/workbench/the-working",
        description: "Intent-driven ritual generator",
      },
      {
        name: "Tarot",
        path: "/workbench/tarot",
        description: "Deck Forge",
        comingSoon: true,
      },
    ],
  },
  {
    name: "Community",
    path: "/community/forum",
    matchPaths: ["/community", "/blog"],
    dropdownItems: [
      {
        name: "Forum",
        path: "/community/forum",
        description: "Discuss, ask, share",
      },
      {
        name: "Videos",
        path: "/community/videos",
        description: "Watch and search",
      },
      { name: "Blog", path: "/blog", description: "Essays and updates" },
    ],
  },
  { name: "Wiki", path: "/wiki" },
];

const memberMobileNav: NavItem[] = [
  {
    name: "Library",
    path: "/library",
    icon: <BookOpen className="h-5 w-5" aria-hidden="true" />,
  },
  {
    name: "Courses",
    path: "/courses",
    icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
  },
  {
    name: "Tools",
    path: "/explore",
    icon: <Network className="h-5 w-5" aria-hidden="true" />,
    matchPaths: ["/explore", "/graph", "/search", "/seven-lenses"],
  },
  {
    name: "Study Journal",
    path: "/journal",
    icon: <NotebookPen className="h-5 w-5" aria-hidden="true" />,
  },
  {
    name: "Community",
    path: "/community/forum",
    icon: <MessageCircle className="h-5 w-5" aria-hidden="true" />,
    matchPaths: ["/community", "/blog"],
  },
  {
    name: "Wiki",
    path: "/wiki",
    icon: <BookMarked className="h-5 w-5" aria-hidden="true" />,
  },
];

function Header({ librarySearch }: HeaderProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [mounted, setMounted] = useState(typeof window !== "undefined");
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

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

  const isActive = (item: NavItem) => {
    const paths = item.matchPaths ?? [item.path];
    return paths.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
  };

  const adminLinks = [
    { label: "Admin Panel", icon: "🔐", href: "/admin" },
    { label: "Admin Upload", icon: "📤", href: "/admin/upload" },
    {
      label: "Import Sacred Text",
      icon: "🌐",
      href: "/admin/import-sacred-text",
    },
    { label: "Courses", icon: "📚", href: "/admin/courses" },
    { label: "Knowledge Graph", icon: "🕸️", href: "/admin/knowledge-graph" },
    { label: "Embeddings", icon: "🔮", href: "/admin/embeddings" },
    { label: "Feedback", icon: "💬", href: "/admin/feedback" },
    { label: "Technical Wiki", icon: "📖", href: "/admin/wiki" },
    { label: "Blog", icon: "📝", href: "/admin/blog" },
    { label: "Videos", icon: "🎬", href: "/admin/videos" },
  ];

  return (
    <header className="pointer-events-none sticky top-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-4 pt-4 pb-2">
      <nav className="glass-panel pointer-events-auto relative mx-auto flex max-w-7xl items-center justify-between rounded-full px-6 py-4">
        <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-50"></div>

        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="Prismarium home"
        >
          <Image
            src="/icon.svg"
            alt=""
            width={32}
            height={32}
            aria-hidden="true"
            className="h-8 w-8 shrink-0 transition-transform duration-300 group-hover:scale-105"
          />

          <div className="flex flex-col font-sans leading-none">
            <span className="text-xl font-bold tracking-widest text-zinc-100 uppercase transition-colors group-hover:text-cyan-400">
              Prismarium
            </span>
            <span className="mt-1 text-[8px] font-medium tracking-[0.28em] whitespace-nowrap text-zinc-500 uppercase transition-colors group-hover:text-zinc-400 sm:text-[9px]">
              By Project Parallax
            </span>
          </div>
        </Link>

        <div className="ml-8 hidden items-center gap-1 md:flex">
          {(user ? memberPrimaryNav : guestPrimaryNav).map((item) => (
            <div
              key={item.path}
              className="relative"
              onMouseEnter={() => {
                setHoveredNav(item.name);
                router.prefetch(item.path);
              }}
              onMouseLeave={() => setHoveredNav(null)}
            >
              <Link
                href={item.path}
                prefetch={false}
                className={`relative flex items-center gap-2 rounded-md border border-transparent px-5 py-2 text-lg font-medium transition-all duration-300 ${
                  isActive(item)
                    ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-cyan-200"
                }`}
              >
                {item.icon}
                {item.name}
                {isActive(item) && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]" />
                )}
              </Link>

              {item.dropdownItems && hoveredNav === item.name && (
                <div className="absolute top-full left-0 z-[9999] w-64 pt-3">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.9)]">
                    {item.dropdownItems.map((sub) =>
                      sub.comingSoon ? (
                        <div
                          key={sub.path}
                          className="flex cursor-default items-center justify-between px-4 py-3.5 opacity-40 select-none"
                        >
                          <div>
                            <div className="text-base font-medium text-zinc-300">
                              {sub.name}
                            </div>
                            {sub.description && (
                              <div className="mt-0.5 text-xs text-zinc-500">
                                {sub.description}
                              </div>
                            )}
                          </div>
                          <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                            Soon
                          </span>
                        </div>
                      ) : sub.external ? (
                        <a
                          key={sub.path}
                          href={sub.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setHoveredNav(null)}
                          className="flex flex-col border-b border-white/5 px-4 py-3.5 transition-colors last:border-0 hover:bg-white/5"
                        >
                          <span className="text-base font-medium text-zinc-100">
                            {sub.name}
                          </span>
                          {sub.description && (
                            <span className="mt-0.5 text-xs text-zinc-500">
                              {sub.description}
                            </span>
                          )}
                        </a>
                      ) : (
                        <Link
                          key={sub.path}
                          href={sub.path}
                          onClick={() => setHoveredNav(null)}
                          className="flex flex-col border-b border-white/5 px-4 py-3.5 transition-colors last:border-0 hover:bg-white/5"
                        >
                          <span className="text-base font-medium text-zinc-100">
                            {sub.name}
                          </span>
                          {sub.description && (
                            <span className="mt-0.5 text-xs text-zinc-500">
                              {sub.description}
                            </span>
                          )}
                        </Link>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/30 text-zinc-400 transition-colors hover:text-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="flex min-w-[32px] items-center justify-end sm:min-w-[140px]">
            {!mounted || loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
            ) : user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="group flex items-center gap-2 rounded-full border border-white/10 bg-black/30 py-1 pr-1 pl-2 transition-all hover:border-cyan-500/30"
                >
                  <span className="hidden px-2 text-right font-mono text-sm font-bold text-zinc-400 group-hover:text-cyan-200 sm:block">
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
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-900/40 text-[10px] font-bold text-cyan-500 ring-1 ring-cyan-500/30">
                      {(user.user_metadata?.username ||
                        user.email ||
                        "U")[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-[9999] mt-3 w-64 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]">
                      <div className="border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-transparent px-4 py-3">
                        <div className="mb-1 font-mono text-[10px] tracking-widest text-cyan-500 uppercase">
                          Identity
                        </div>
                        <div className="truncate text-sm font-bold text-zinc-100">
                          {user.email}
                        </div>
                        {isAdmin && (
                          <div className="mt-1 font-mono text-[10px] text-cyan-400">
                            [ ADMIN ACCESS GRANTED ]
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 p-2">
                        {[
                          { href: "/profile", icon: "👤", label: "Profile" },
                          {
                            href: "/dashboard",
                            icon: "📊",
                            label: "Dashboard",
                          },
                          {
                            href: "/library/my-library",
                            icon: "📖",
                            label: "My Library",
                          },
                          {
                            href: "/journal",
                            icon: "📝",
                            label: "Study Journal",
                          },
                          { href: "/settings", icon: "⚙️", label: "Settings" },
                        ].map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-cyan-300"
                          >
                            <span className="opacity-70">{item.icon}</span>{" "}
                            {item.label}
                          </Link>
                        ))}

                        {isAdmin && (
                          <>
                            <div className="my-2 h-[1px] bg-white/5"></div>
                            <div className="px-3 py-1 font-mono text-[10px] text-cyan-500/70 uppercase">
                              Admin Utilities
                            </div>
                            {adminLinks.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 rounded-md px-3 py-2 font-mono text-xs text-cyan-400 transition-all hover:bg-cyan-900/10 hover:text-cyan-200"
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
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-red-400 transition-all hover:bg-red-900/10 hover:text-red-300"
                        >
                          🚪 Disconnect
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/login"
                  prefetch={false}
                  onMouseEnter={() => router.prefetch("/login")}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  prefetch={false}
                  onMouseEnter={() => router.prefetch("/register")}
                  className="rounded bg-cyan-500 px-4 py-1.5 text-sm font-bold text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400"
                >
                  Join Prismarium
                </Link>
              </div>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="absolute top-full right-0 left-0 z-50 mx-4 mt-2 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl md:hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5"></div>

            {user ? (
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="User"
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-900/40 font-bold text-cyan-500">
                      {(user.user_metadata?.username ||
                        user.email ||
                        "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-zinc-100">
                      {user.user_metadata?.username ||
                        user.email?.split("@")[0]}
                    </div>
                    <div className="text-xs text-zinc-500">{user.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-white/10 pb-4">
                  {memberMobileNav.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive(item) ? "page" : undefined}
                      className={`flex min-h-16 flex-col items-center justify-center gap-2 rounded-lg p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        isActive(item)
                          ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                          : "border border-white/5 bg-black/30 text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="flex h-5 items-center justify-center">{item.icon}</span>
                      <span className="text-xs font-semibold">{item.name}</span>
                    </Link>
                  ))}
                </div>

                <div className="space-y-1 border-b border-white/10 pb-4">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center rounded-md px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center rounded-md px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                  >
                    👤 Profile Tools
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center rounded-md px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                  >
                    ⚙️ Settings
                  </Link>
                </div>

                {isAdmin && (
                  <div className="space-y-1 border-b border-white/10 pb-4">
                    <div className="mb-2 px-2 font-mono text-[10px] tracking-widest text-red-400/70 uppercase">
                      Admin
                    </div>
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center rounded-md px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      🔐 Admin Panel
                    </Link>
                  </div>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full rounded-lg border border-red-900/30 bg-red-900/10 py-3 text-sm font-bold text-red-400 transition-colors hover:bg-red-900/20"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col gap-3 py-4">
                <div className="grid grid-cols-2 gap-2 border-b border-white/10 pb-4">
                  {guestPrimaryNav.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`rounded-lg p-3 text-center text-sm font-semibold ${
                        isActive(item)
                          ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                          : "border border-white/5 bg-black/30 text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/login"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-lg border border-white/20 py-3 text-center text-sm font-bold text-zinc-300 hover:bg-white/5"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-lg bg-cyan-500 py-3 text-center text-sm font-bold text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400"
                >
                  Join Prismarium
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />
    </header>
  );
}

export default memo(Header);
