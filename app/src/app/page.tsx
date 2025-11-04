import Header from "@/components/Header";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";

// Lazy load AISearchBar to reduce initial bundle size
const AISearchBar = dynamic(() => import("@/components/AISearchBar"), {
  ssr: true, // Keep SSR for SEO, but code-split
  loading: () => (
    <div className="mb-12 w-full max-w-3xl">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 h-12 bg-zinc-900/50 border border-amber-900/20 rounded-lg animate-pulse" />
        <div className="h-12 w-32 bg-zinc-900/50 border border-amber-900/20 rounded-lg animate-pulse" />
        <div className="h-12 w-20 bg-zinc-900/50 border border-amber-900/20 rounded-lg animate-pulse" />
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
        {/* Mystical Symbol */}
        <div className="mb-8 h-32 w-32 animate-pulse">
          <svg
            viewBox="0 0 100 100"
            className="text-amber-500/30"
            fill="currentColor"
          >
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="50" cy="50" r="3" fill="currentColor" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-6xl font-bold tracking-tight text-amber-100">
          Digital Grimoire
        </h1>
        
        {/* Subtitle */}
        <p className="mb-8 max-w-2xl text-xl text-amber-200/70">
          A Collaborative Esoteric Library
        </p>

        {/* AI Search Bar - Lazy loaded */}
        <div className="mb-12 w-full max-w-3xl">
          <AISearchBar />
        </div>

        {/* Description */}
        <div className="mb-12 max-w-3xl space-y-4 text-lg text-zinc-400">
          <p>
            Explore the hidden connections between mystical traditions through
            our AI-powered knowledge graph.
          </p>
          <p className="text-sm">
            🔮 Public Library • 📊 Correspondence Tables • 📖 Personal Grimoires • ⚗️ Ritual Inventory
          </p>
        </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-6 py-3 text-amber-300">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                <span className="text-sm font-medium">
                  Sprint 2: Complete ✓ — Ready for Sprint 3
                </span>
              </div>

        {/* Footer Note */}
        <p className="mt-16 text-sm text-zinc-600">
          Phase 1: MVP Foundation • Built with AI-assisted development
        </p>
      </main>
      <Footer />
    </div>
  );
}
