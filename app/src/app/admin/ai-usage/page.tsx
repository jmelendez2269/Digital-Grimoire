"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  BarChart3,
  DollarSign,
  Zap,
  AlertTriangle,
  RefreshCw,
  Clock,
  Users,
  FileText,
  TrendingUp,
  XCircle,
  ChevronDown,
} from "lucide-react";

interface ServiceStat {
  service: string;
  totalUnits: number;
  totalCost: number;
  requests: number;
}

interface DailySummary {
  date: string;
  total_cost: number;
  total_requests: number;
  services_used?: string[];
}

interface CostAlert {
  alert_type: "daily" | "weekly" | "monthly";
  threshold_amount: number;
}

interface RecentError {
  id: string;
  service: string;
  operation: string;
  error_message: string;
  created_at: string;
}

interface UsageData {
  success: boolean;
  timeRange: number;
  overview: {
    totalUsers: number;
    totalDocuments: number;
    recentUploads: number;
    coursesClicks: number;
    currentCosts: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  dailySummary: DailySummary[];
  serviceStats: ServiceStat[];
  topUsers: any[];
  storageUsage: any;
  costAlerts: CostAlert[];
  recentErrors: RecentError[];
}

const SERVICE_LABELS: Record<string, string> = {
  azure_ocr: "Azure OCR",
  openai_metadata: "OpenAI Metadata",
  parallax_query: "Parallax Query",
  r2_storage: "R2 Storage",
  r2_bandwidth: "R2 Bandwidth",
  notion: "Notion API",
  other: "Other",
  convergence_query: "Convergence Query",
};

const SERVICE_COLORS: Record<string, string> = {
  azure_ocr: "text-blue-400",
  openai_metadata: "text-green-400",
  parallax_query: "text-amber-400",
  r2_storage: "text-purple-400",
  r2_bandwidth: "text-cyan-400",
  notion: "text-pink-400",
  other: "text-zinc-400",
  convergence_query: "text-orange-400",
};

const SERVICE_BAR_COLORS: Record<string, string> = {
  azure_ocr: "bg-blue-500",
  openai_metadata: "bg-green-500",
  parallax_query: "bg-amber-500",
  r2_storage: "bg-purple-500",
  r2_bandwidth: "bg-cyan-500",
  notion: "bg-pink-500",
  other: "bg-zinc-500",
  convergence_query: "bg-orange-500",
};

function CostCard({
  label,
  value,
  threshold,
  icon,
}: {
  label: string;
  value: number;
  threshold?: number;
  icon: React.ReactNode;
}) {
  const exceeded = threshold !== undefined && value > threshold;
  return (
    <div
      className={`rounded-xl border p-5 ${
        exceeded
          ? "border-red-500/40 bg-red-900/10"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-400 text-sm font-medium">{label}</span>
        <div
          className={`p-2 rounded-lg ${exceeded ? "bg-red-900/30" : "bg-zinc-950"}`}
        >
          {icon}
        </div>
      </div>
      <p
        className={`text-2xl font-bold font-mono ${exceeded ? "text-red-400" : "text-amber-100"}`}
      >
        ${value.toFixed(4)}
      </p>
      {threshold !== undefined && (
        <p className="text-xs text-zinc-500 mt-1">
          Threshold: ${threshold.toFixed(2)}
          {exceeded && (
            <span className="ml-2 text-red-400 font-semibold">EXCEEDED</span>
          )}
        </p>
      )}
    </div>
  );
}

export default function AiUsageDashboard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);
  const [expandedErrors, setExpandedErrors] = useState(false);

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
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxDailyCost =
    data?.dailySummary.length
      ? Math.max(...data.dailySummary.map((d) => d.total_cost || 0), 0.0001)
      : 0.0001;

  const maxServiceCost =
    data?.serviceStats.length
      ? Math.max(...data.serviceStats.map((s) => s.totalCost), 0.0001)
      : 0.0001;

  const thresholds = {
    daily:
      data?.costAlerts.find((a) => a.alert_type === "daily")
        ?.threshold_amount ?? 50,
    weekly:
      data?.costAlerts.find((a) => a.alert_type === "weekly")
        ?.threshold_amount ?? 300,
    monthly:
      data?.costAlerts.find((a) => a.alert_type === "monthly")
        ?.threshold_amount ?? 1000,
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <div>
              <Link
                href="/admin"
                className="text-sm text-amber-400 hover:text-amber-300 mb-3 inline-block"
              >
                ← Back to Admin
              </Link>
              <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-amber-400" />
                AI Usage Dashboard
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                API costs, token usage, and service activity
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Time range selector */}
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
                <div
                  key={i}
                  className="h-32 rounded-xl bg-zinc-900/30 border border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : data ? (
            <div className="space-y-8">

              {/* Overview stats */}
              <section>
                <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm">
                      <Users className="w-4 h-4" /> Total Users
                    </div>
                    <p className="text-2xl font-bold text-amber-100">
                      {data.overview.totalUsers}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm">
                      <FileText className="w-4 h-4" /> Documents
                    </div>
                    <p className="text-2xl font-bold text-amber-100">
                      {data.overview.totalDocuments}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm">
                      <Zap className="w-4 h-4" /> Uploads (7d)
                    </div>
                    <p className="text-2xl font-bold text-amber-100">
                      {data.overview.recentUploads}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm">
                      <BarChart3 className="w-4 h-4" /> Course Clicks
                    </div>
                    <p className="text-2xl font-bold text-amber-100">
                      {data.overview.coursesClicks}
                    </p>
                  </div>
                </div>
              </section>

              {/* Cost breakdown */}
              <section>
                <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  Cost Breakdown
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CostCard
                    label="Last 24 Hours"
                    value={data.overview.currentCosts.daily}
                    threshold={thresholds.daily}
                    icon={<Clock className="w-4 h-4 text-amber-400" />}
                  />
                  <CostCard
                    label="Last 7 Days"
                    value={data.overview.currentCosts.weekly}
                    threshold={thresholds.weekly}
                    icon={<Clock className="w-4 h-4 text-amber-400" />}
                  />
                  <CostCard
                    label="This Month"
                    value={data.overview.currentCosts.monthly}
                    threshold={thresholds.monthly}
                    icon={<DollarSign className="w-4 h-4 text-amber-400" />}
                  />
                </div>
              </section>

              {/* Service breakdown */}
              <section>
                <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Usage by Service
                  <span className="text-xs text-zinc-500 font-normal">
                    (last {timeRange} days)
                  </span>
                </h2>
                {data.serviceStats.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
                    No API usage recorded in this time range.
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                          <th className="px-5 py-3 text-left">Service</th>
                          <th className="px-5 py-3 text-right">Requests</th>
                          <th className="px-5 py-3 text-right">Units Used</th>
                          <th className="px-5 py-3 text-right">Est. Cost</th>
                          <th className="px-5 py-3 text-left w-48">Cost Bar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.serviceStats
                          .sort((a, b) => b.totalCost - a.totalCost)
                          .map((stat) => {
                            const barWidth = Math.max(
                              2,
                              (stat.totalCost / maxServiceCost) * 100
                            );
                            const colorClass =
                              SERVICE_BAR_COLORS[stat.service] ?? "bg-zinc-500";
                            const textClass =
                              SERVICE_COLORS[stat.service] ?? "text-zinc-300";
                            return (
                              <tr
                                key={stat.service}
                                className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                              >
                                <td className="px-5 py-3">
                                  <span className={`font-medium ${textClass}`}>
                                    {SERVICE_LABELS[stat.service] ??
                                      stat.service}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-right text-zinc-300 font-mono">
                                  {stat.requests.toLocaleString()}
                                </td>
                                <td className="px-5 py-3 text-right text-zinc-300 font-mono">
                                  {stat.totalUnits.toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                  })}
                                </td>
                                <td className="px-5 py-3 text-right text-amber-300 font-mono font-semibold">
                                  ${stat.totalCost.toFixed(4)}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${colorClass} transition-all`}
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        {/* Total row */}
                        <tr className="bg-zinc-900/60">
                          <td className="px-5 py-3 font-semibold text-zinc-300">
                            Total
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-zinc-300">
                            {data.serviceStats
                              .reduce((s, r) => s + r.requests, 0)
                              .toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-zinc-300">
                            {data.serviceStats
                              .reduce((s, r) => s + r.totalUnits, 0)
                              .toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-amber-400">
                            $
                            {data.serviceStats
                              .reduce((s, r) => s + r.totalCost, 0)
                              .toFixed(4)}
                          </td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Daily usage chart */}
              {data.dailySummary.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-amber-400" />
                    Daily Cost Trend
                  </h2>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                    <div className="flex items-end gap-1 h-32">
                      {data.dailySummary.slice(-30).map((day) => {
                        const height = Math.max(
                          4,
                          ((day.total_cost || 0) / maxDailyCost) * 100
                        );
                        return (
                          <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center gap-1 group relative"
                          >
                            <div
                              className="w-full bg-amber-500/70 rounded-t hover:bg-amber-400 transition-colors cursor-pointer"
                              style={{ height: `${height}%` }}
                              title={`${day.date}: $${(day.total_cost || 0).toFixed(4)}`}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                              <div className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-amber-100 whitespace-nowrap">
                                <div className="font-semibold">{day.date}</div>
                                <div>${(day.total_cost || 0).toFixed(4)}</div>
                                <div className="text-zinc-400">
                                  {day.total_requests} req
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-zinc-600 mt-2">
                      <span>
                        {data.dailySummary[0]?.date ?? ""}
                      </span>
                      <span>
                        {data.dailySummary[data.dailySummary.length - 1]?.date ?? ""}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* Recent errors */}
              {data.recentErrors.length > 0 && (
                <section>
                  <button
                    onClick={() => setExpandedErrors((v) => !v)}
                    className="w-full text-left"
                  >
                    <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-400" />
                      Recent Errors
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 text-xs font-mono">
                        {data.recentErrors.length}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-500 ml-auto transition-transform ${
                          expandedErrors ? "rotate-180" : ""
                        }`}
                      />
                    </h2>
                  </button>
                  {expandedErrors && (
                    <div className="rounded-xl border border-red-900/30 bg-zinc-900/40 divide-y divide-zinc-800">
                      {data.recentErrors.slice(0, 10).map((err) => (
                        <div key={err.id} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-red-400 text-sm font-medium">
                              {SERVICE_LABELS[err.service] ?? err.service} —{" "}
                              {err.operation}
                            </span>
                            <span className="text-zinc-500 text-xs font-mono">
                              {new Date(err.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-zinc-400 text-xs">
                            {err.error_message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Cost alert thresholds */}
              {data.costAlerts.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    Cost Alert Thresholds
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.costAlerts.map((alert) => (
                      <div
                        key={alert.alert_type}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                      >
                        <p className="text-zinc-400 text-sm capitalize mb-1">
                          {alert.alert_type}
                        </p>
                        <p className="text-xl font-bold font-mono text-amber-100">
                          ${alert.threshold_amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
