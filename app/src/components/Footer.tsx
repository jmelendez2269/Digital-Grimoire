import Link from "next/link";

// Server component - no client-side JavaScript needed
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-black py-4 mt-auto">
      <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">

        {/* System ID / Copyright */}
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            SYS.VER.2.0 // CONVERGENCE
          </div>
          <div className="hidden md:block w-px h-3 bg-zinc-800"></div>
          <p className="text-xs text-zinc-500 font-mono">
            © {currentYear} ALL RIGHTS RESERVED
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-900 rounded-full border border-emerald-500/50"></div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Neural Link: STABLE</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[10px] font-mono text-zinc-400 hover:text-cyan-400 uppercase transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-[10px] font-mono text-zinc-400 hover:text-cyan-400 uppercase transition-colors">Terms of Service</Link>
          </div>
        </div>

        {/* Amazon disclosure */}
        <div className="w-full mt-4 pt-4 border-t border-white/5">
          <p className="text-[10px] text-zinc-600 font-mono text-center md:text-left leading-relaxed">
            As an Amazon Associate I earn from qualifying purchases.
          </p>
        </div>

      </div>
    </footer>
  );
}

