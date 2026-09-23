"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppLoader from "@/components/ui/AppLoader";
import DiscoveryExplorer from "@/components/discovery/DiscoveryExplorer";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

function ResearchPageContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const query = searchParams.get("q") ?? searchParams.get("query") ?? "";
  
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <Header />
      <main className="container mx-auto max-w-4xl flex-1 px-4 py-8">
        <div className="space-y-8 py-10">
          <div className="space-y-4 text-center">
            <h1 className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-amber-200 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              Research
            </h1>
            <p className="mx-auto max-w-xl text-lg text-zinc-400">
              {user
                ? "Frame a question, gather sources across the library, and keep a trail."
                : "Join Prismarium to start a research inquiry."}
            </p>
          </div>
          {authLoading ? (
            <div
              className="h-44 animate-pulse rounded-xl border border-white/5 bg-zinc-900/30"
              aria-label="Loading Research"
              aria-busy="true"
            />
          ) : user ? (
            <DiscoveryExplorer key={`research-${query}`} initialQuery={query} />
          ) : (
            <div className="space-y-6 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(120deg,rgba(8,47,73,0.35),rgba(24,24,27,0.72))] p-6 text-left sm:p-7">
              <div>
                <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-cyan-200 uppercase">
                  Start an inquiry
                </p>
                <h2 className="mt-3 font-serif text-2xl text-zinc-50">
                  Frame a question, gather sources, and keep a trail.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                  Research is question-led discovery. Ask in your own words, follow the evidence across library passages and web sources, and save the connections you want to keep. This is separate from Concept Search.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
                >
                  New inquiry
                </Link>
                <Link
                  href="/search"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-zinc-200 focus-visible:outline-none"
                >
                  Or try Concept Search
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<AppLoader fullScreen />}>
      <ResearchPageContent />
    </Suspense>
  );
}
