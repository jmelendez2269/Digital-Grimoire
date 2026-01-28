"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DashboardView from "@/components/DashboardView";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex flex-1 flex-col">
        <DashboardView />
      </main>
      <Footer />
    </div>
  );
}
