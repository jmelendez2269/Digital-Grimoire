import Link from "next/link";
import { Github, Twitter, MessageSquare, BookOpen } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-black py-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

          {/* Column 1: Parallax */}
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
                Project Parallax
              </span>
            </Link>
            <p className="text-xs text-zinc-500 leading-relaxed font-mono uppercase tracking-tight">
              A multi-lens library and knowledge network where hidden wisdom reveals our unity. Explore sacred writings and wisdom traditions.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a href="https://github.com/jmelendez2269/Digital-Grimoire" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors" title="GitHub">
                <Github size={18} />
              </a>
              <a href="https://twitter.com/digital-grimoire" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-cyan-400 transition-colors" title="Twitter">
                <Twitter size={18} />
              </a>
              <a href="https://discord.gg/digital-grimoire" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-indigo-400 transition-colors" title="Discord">
                <MessageSquare size={18} />
              </a>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-mono font-bold text-amber-500/50 uppercase tracking-widest">Explore</h3>
            <div className="flex flex-col gap-2">
              <Link href="/library" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Library</Link>
              <Link href="/search" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Global Search</Link>
              <Link href="/courses" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Wisdom Courses</Link>
              <Link href="/graph" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Parallax Graph</Link>
            </div>
          </div>

          {/* Column 3: Tools */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-mono font-bold text-amber-500/50 uppercase tracking-widest">Tools</h3>
            <div className="flex flex-col gap-2">
              <Link href="/journal" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Digital Grimoire</Link>
              <Link href="/ritual-machine" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Ritual Machine</Link>
              <Link href="/parallax-engine" className="text-xs text-zinc-400 hover:text-amber-400 font-mono uppercase transition-colors">Parallax Engine</Link>
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

        {/* Bottom Bar: Copyright & Disclosures */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
            © {currentYear} PROJECT PARALLAX // ALL RIGHTS RESERVED
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

