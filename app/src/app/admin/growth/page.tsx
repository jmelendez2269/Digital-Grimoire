"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  TrendingUp,
  Users,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  DollarSign,
  ArrowUpRight,
  BarChart3,
  Calendar,
  UserCheck,
} from "lucide-react";

interface GrowthOverview {
  totalUsers: number;
  recentUploads: number;
  currentCosts: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

function MetricCard({
  label,
  value,
  sub,
  target,
  pending,
}: {
  label: string;
  value: string;
  sub?: string;
  target?: string;
  pending?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-zinc-400 text-sm font-medium mb-2">{label}</p>
      <p className={`text-2xl font-bold font-mono ${pending ? "text-zinc-600" : "text-amber-100"}`}>
        {value}
      </p>
      {target && (
        <p className="text-xs text-zinc-500 mt-1">
          Target: <span className="text-amber-500">{target}</span>
        </p>
      )}
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

function SectionHeading({ icon, label, note }: { icon: React.ReactNode; label: string; note?: string }) {
  return (
    <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
      {icon}
      {label}
      {note && <span className="text-xs text-zinc-500 font-normal">{note}</span>}
    </h2>
  );
}

const BILLING_NOTE = "Awaiting billing integration";

export default function GrowthDashboard() {
  const [overview, setOverview] = useState<GrowthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usage?range=${timeRange}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setOverview(json.overview ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10">

          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <div>
              <Link href="/admin" className="text-sm text-amber-400 hover:text-amber-300 mb-3 inline-block">
                ← Back to Admin
              </Link>
              <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-3">
                <TrendingUp className="w-7 h-7 text-amber-400" />
                Growth & Revenue
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Conversion funnels, retention, and revenue health
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(Number(e.target.value))}
                  className="appearance-none bg-zinc-900 border border-zinc-700 text-amber-100 text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-900/10 text-red-400 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-zinc-900/30 border border-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">

              {/* User base */}
              <section>
                <SectionHeading icon={<Users className="w-5 h-5 text-amber-400" />} label="User Base" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    label="Total Users"
                    value={overview?.totalUsers?.toLocaleString() ?? "—"}
                  />
                  <MetricCard
                    label="New Uploads (7d)"
                    value={overview?.recentUploads?.toLocaleString() ?? "—"}
                    sub="Proxy for recent active engagement"
                  />
                  <MetricCard
                    label="Trial Activation Rate"
                    value="—"
                    target="N/A"
                    sub={BILLING_NOTE}
                    pending
                  />
                  <MetricCard
                    label="Days to Trial Activation"
                    value="—"
                    sub={BILLING_NOTE}
                    pending
                  />
                </div>
              </section>

              {/* Conversion funnel */}
              <section>
                <SectionHeading
                  icon={<ArrowUpRight className="w-5 h-5 text-amber-400" />}
                  label="Conversion Funnel"
                  note="(Requires billing tiers: Free → Trial → Scholar → Synthesist)"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    label="Trial → Scholar Conversion"
                    value="—"
                    target="18–25%"
                    sub={BILLING_NOTE}
                    pending
                  />
                  <MetricCard
                    label="Scholar → Synthesist Upgrade"
                    value="—"
                    target="10–15%"
                    sub={BILLING_NOTE}
                    pending
                  />
                  <MetricCard
                    label="Annual Plan Share"
                    value="—"
                    target="50%+"
                    sub={BILLING_NOTE}
                    pending
                  />
                </div>

                {/* Funnel visualization placeholder */}
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
                  <p className="text-zinc-500 text-sm mb-4">Conversion funnel</p>
                  {[
                    { label: "Free Users", color: "bg-zinc-600", width: "100%" },
                    { label: "Trial Activated", color: "bg-amber-700", width: "0%" },
                    { label: "Scholar", color: "bg-amber-500", width: "0%" },
                    { label: "Synthesist", color: "bg-amber-300", width: "0%" },
                  ].map(({ label, color, width }) => (
                    <div key={label} className="mb-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span>{label}</span>
                        <span className="font-mono text-zinc-600">
                          {width === "100%" ? (overview?.totalUsers?.toLocaleString() ?? "—") : "—"}
                        </span>
                      </div>
                      <div className="h-5 bg-zinc-800 rounded-md overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-md transition-all`}
                          style={{ width }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-zinc-600 mt-3">{BILLING_NOTE}</p>
                </div>
              </section>

              {/* Retention & churn */}
              <section>
                <SectionHeading icon={<UserCheck className="w-5 h-5 text-amber-400" />} label="Retention & Churn" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard
                    label="Monthly Churn — Scholar"
                    value="—"
                    sub={BILLING_NOTE}
                    pending
                  />
                  <MetricCard
                    label="Monthly Churn — Synthesist"
                    value="—"
                    sub={BILLING_NOTE}
                    pending
                  />
                </div>
              </section>

              {/* Revenue & cost health */}
              <section>
                <SectionHeading icon={<DollarSign className="w-5 h-5 text-amber-400" />} label="Revenue & Cost Health" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    label="MRR"
                    value="—"
                    sub={BILLING_NOTE}
                    pending
                  />
                  <MetricCard
                    label="AI + TTS Spend (Monthly)"
                    value={
                      overview?.currentCosts?.monthly != null
                        ? `$${overview.currentCosts.monthly.toFixed(2)}`
                        : "—"
                    }
                    sub="From API usage tracking"
                  />
                  <MetricCard
                    label="AI Spend % of MRR"
                    value="—"
                    target="< 30%"
                    sub={BILLING_NOTE}
                    pending
                  />
                </div>

                {/* Cost per tier placeholder */}
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
                  <p className="text-zinc-500 text-sm mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> AI cost per user per month, by feature
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Parallax Query", "Concept Search", "TTS", "Convergence"].map((feat) => (
                      <div key={feat} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center">
                        <p className="text-xs text-zinc-500 mb-1">{feat}</p>
                        <p className="text-lg font-bold font-mono text-zinc-600">—</p>
                        <p className="text-xs text-zinc-700">per user / mo</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 mt-3">
                    Requires per-user per-service cost aggregation — data exists in <code className="text-zinc-500">api_usage</code>, query not yet built
                  </p>
                </div>
              </section>

              {/* Plan mix placeholder */}
              <section>
                <SectionHeading
                  icon={<Calendar className="w-5 h-5 text-amber-400" />}
                  label="Plan Mix"
                  note="(Annual vs Monthly)"
                />
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
                  <p className="text-zinc-600 text-sm">{BILLING_NOTE}</p>
                  <p className="text-zinc-700 text-xs mt-1">
                    Target: 50%+ on annual plans
                  </p>
                </div>
              </section>

            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
