"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppLoader from "@/components/ui/AppLoader";
import DeepSearchPanel from "@/components/DeepSearch/DeepSearchPanel";
import { useAuth } from "@/contexts/AuthContext";

function SearchPageContent() {
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
              Concept Search
            </h1>
            <p className="mx-auto max-w-xl text-lg text-zinc-400">
              {user
                ? "Follow a question through library passages, web sources, and unexpected connections."
                : "Replay a real Concept Search and see how one idea changes across different texts."}
            </p>
          </div>
          {authLoading ? (
            <div
              className="h-44 animate-pulse rounded-xl border border-white/5 bg-zinc-900/30"
              aria-label="Loading Concept Search"
              aria-busy="true"
            />
          ) : (
            <DeepSearchPanel
              key={user ? `live-search-${query}` : "recorded-demo"}
              initialQuery={user ? query : undefined}
              demoMode={!user}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<AppLoader fullScreen />}>
      <SearchPageContent />
    </Suspense>
  );
}
