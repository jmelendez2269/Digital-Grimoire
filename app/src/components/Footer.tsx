import Link from "next/link";
import { Github, MessageSquare, BookOpen, ExternalLink } from "lucide-react";

const ParallaxMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="parallax-mark-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4EE7FD" />
        <stop offset="50%" stopColor="#9966FF" />
        <stop offset="100%" stopColor="#FF9B2B" />
      </linearGradient>
    </defs>
    <path d="M12 3 L21 19 L3 19 Z" stroke="url(#parallax-mark-grad)" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M12 21 L3 5 L21 5 Z" stroke="url(#parallax-mark-grad)" strokeWidth="1.4" strokeLinejoin="round" opacity="0.85" />
    <circle cx="12" cy="12" r="1.6" fill="url(#parallax-mark-grad)" />
  </svg>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-black py-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

          {/* Column 1: Prismarium */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative flex items-center justify-center w-6 h-6 rounded-full border border-amber-500/30 bg-black/50 group-hover:border-amber-500/70 transition-colors">
                <div className="w-3 h-3 rounded-full bg-amber-500/10 group-hover:bg-amber-500/30 blur-[1px]"></div>
                <svg
                  viewBox="0 0 100 100"
                  className="absolute h-4 w-4 text-amber-500 group-hover:text-amber-400 transition-colors"
                  fill="currentColor"
                >
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" className="opacity-50" />
                  <circle cx="50" cy="50" r="4" fill="currentColor" />
                </svg>
              </div>
              <span className="text-sm font-bold tracking-tight text-zinc-100 group-hover:text-white uppercase">
                Prismarium
              </span>
            </Link>
            <p className="text-xs text-zinc-500 leading-relaxed font-mono uppercase tracking-tight">
              Explore esoteric texts, sacred writings, and wisdom traditions through multiple perspectives in Prismarium.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a href="https://github.com/jmelendez2269" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors" title="GitHub">
                <Github size={18} />
              </a>
              <a href="https://projectparallax.xyz" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-cyan-300 transition-colors" title="Project Parallax — the parent brand">
                <ParallaxMark className="w-[18px] h-[18px]" />
              </a>
              <a href="https://prismarium.xyz" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-indigo-400 transition-colors" title="Prismarium">
                <MessageSquare size={18} />
              </a>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-mono font-bold text-amber-500/50 uppercase tracking-widest">Explore</h3>
            <div className="flex flex-col gap-2">
              <Link href="/library" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Library</Link>
              <Link href="/search" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Concept Search</Link>
              <Link href="/courses" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Wisdom Courses</Link>
              <Link href="/graph" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Concept Map</Link>
            </div>
          </div>

          {/* Column 3: Tools */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-mono font-bold text-amber-500/50 uppercase tracking-widest">Tools</h3>
            <div className="flex flex-col gap-2">
              <Link href="/journal" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Study Journal</Link>
              <Link href="/seven-lenses" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Seven Lenses</Link>
              <Link href="/wiki" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">
                <BookOpen size={12} />
                Documentation
              </Link>
            </div>
          </div>

          {/* Column 4: Governance */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-mono font-bold text-amber-500/50 uppercase tracking-widest">Governance</h3>
            <div className="flex flex-col gap-2">
              <Link href="/ai-disclaimer" className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 font-mono uppercase transition-colors group">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse group-hover:bg-amber-400"></div>
                AI Disclaimer
              </Link>
              <Link href="/license" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">License Agreement</Link>
              <Link href="/privacy" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Terms of Service</Link>
              <Link href="/cookies" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Cookie Policy</Link>
            </div>
          </div>

        </div>

        {/* Parent Brand: Project Parallax */}
        <a
          href="https://projectparallax.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="group mb-8 flex items-center justify-between gap-4 rounded-lg border border-white/[0.06] bg-gradient-to-r from-cyan-500/[0.03] via-violet-500/[0.04] to-amber-500/[0.03] px-5 py-4 transition-all hover:border-white/[0.12] hover:from-cyan-500/[0.06] hover:via-violet-500/[0.08] hover:to-amber-500/[0.06]"
        >
          <div className="flex items-center gap-3">
            <ParallaxMark className="w-7 h-7 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500">
                Part of the Project Parallax family
              </span>
              <span className="text-sm font-semibold tracking-wide text-zinc-200 group-hover:text-white">
                Seeing things from different perspectives
              </span>
            </div>
          </div>
          <span className="hidden md:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500 group-hover:text-cyan-300">
            projectparallax.xyz
            <ExternalLink size={11} />
          </span>
        </a>

        {/* Bottom Bar: Copyright & Disclosures */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
            © {currentYear} PRISMARIUM //{" "}
            <a
              href="https://projectparallax.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-cyan-300 transition-colors underline-offset-2 hover:underline"
            >
              A PROJECT PARALLAX PRODUCT
            </a>{" "}
            // ALL RIGHTS RESERVED
          </p>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
              <span className="text-[10px] font-mono text-zinc-600 uppercase">System Active</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono text-center md:text-right leading-relaxed max-w-xs">
              As an Amazon Associate I earn from qualifying purchases.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

