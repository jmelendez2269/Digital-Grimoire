"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DashboardSearchHub from "@/components/DashboardSearchHub";
import ConvergenceMachineInfo from "@/components/ConvergenceMachineInfo";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { BookOpen, Tablet } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();

  // Get custom journal name or default to "Digital Grimoire"
  const journalName = user?.user_metadata?.journal_name || "Digital Grimoire";
  const username = user?.user_metadata?.username || null;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex flex-1 flex-col px-8 py-12">
        <div className="mx-auto w-full max-w-7xl">
          {/* Welcome Section */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-amber-100">
              {loading ? (
                "Welcome!"
              ) : username ? (
                `Welcome, ${username}!`
              ) : (
                "Welcome to Convergence"
              )}
            </h1>
            <p className="mt-2 text-lg text-zinc-400">
              Your journey of discovery begins here
            </p>
          </div>

          {/* Integrated Search Hub - Primary Focus */}
          <div className="mb-16">
            <DashboardSearchHub />
          </div>

          {/* Explore Your Tools Section */}
          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-bold text-amber-100 text-center">
              Explore Your Tools
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Library Card */}
              <Link
                href="/library"
                className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                    <BookOpen className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-amber-100 group-hover:text-amber-400">
                    Library
                  </h3>
                </div>
                <p className="text-sm text-zinc-400">
                  Browse and explore the collection of esoteric texts, sacred writings, and wisdom traditions from across cultures and time periods.
                </p>
              </Link>

              {/* Digital Grimoire Card */}
              <Link
                href="/journal"
                className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-purple-500/50 hover:bg-zinc-900"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                    <Tablet className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-100 group-hover:text-purple-400">
                    {journalName}
                  </h3>
                </div>
                <p className="text-sm text-zinc-400">
                  Your personal collection of insights, truths, and discoveries. Create notes, organize thoughts, and build your understanding.
                </p>
              </Link>

              {/* Convergence Machine Card */}
              <div>
                <ConvergenceMachineInfo />
              </div>
            </div>
          </div>

          {/* Privacy Policy Link - Required for Google OAuth verification - Always rendered for SEO */}
          <div className="mb-8 text-center">
            <p className="text-sm text-zinc-500">
              By using this site, you agree to our{" "}
              <Link
                href="/privacy"
                className="text-amber-400 underline transition-colors hover:text-amber-300"
              >
                Privacy Policy
              </Link>
              {" "}and{" "}
              <Link
                href="/terms"
                className="text-amber-400 underline transition-colors hover:text-amber-300"
              >
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
