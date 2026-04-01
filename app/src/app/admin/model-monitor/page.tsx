"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Play,
  FileText,
  Cpu,
  DollarSign,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DeprecationNotice {
  provider: string;
  model: string;
  deprecationDate: string | null;
  replacement: string;
  note: string;
  severity: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
}

interface Recommendation {
  severity: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  useCase: string;
  recommendation: string;
  reasoning: string;
}

interface PlatformModel {
  useCase: string;
  provider: string;
  model: string;
  inputCost: number | null;
  outputCost: number | null;
}

interface ReportSummary {
  id: string;
  report_date: string;
  price_changes_detected: boolean;
  new_models_detected: boolean;
  deprecations_detected: boolean;
  urgent_alerts: { type: string; severity: string; message: string }[];
  created_at: string;
}

interface FullReport {
  id: string;
  report_date: string;
  report_markdown: string;
  urgent_alerts: { type: string; severity: string; message: string }[];
  created_at: string;
}

interface OverviewData {
  latestReport: FullReport | null;
  recentReports: ReportSummary[];
  currentConfig: PlatformModel[];
  pendingDeprecations: DeprecationNotice[];
  pendingRecommendations: Recommendation[];
}

interface RunResult {
  success: boolean;
  reportId?: string;
  reportDate?: string;
  urgentAlertCount?: number;
  priceChanges?: number;
  recommendations?: number;
  summary?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SEVERITY_CONFIG = {
  URGENT: { label: "URGENT", color: "text-red-400", bg: "bg-red-900/20", border: "border-red-800/50", dot: "bg-red-500" },
  HIGH:   { label: "HIGH",   color: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-800/50", dot: "bg-orange-500" },
  MEDIUM: { label: "MEDIUM", color: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/50", dot: "bg-yellow-500" },
  LOW:    { label: "LOW",    color: "text-blue-400", bg: "bg-blue-900/20", border: "border-blue-800/50", dot: "bg-blue-500" },
} as const;

function SeverityBadge({ severity }: { severity: keyof typeof SEVERITY_CONFIG }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    openai: "text-green-400 bg-green-900/20 border-green-800/50",
    anthropic: "text-orange-400 bg-orange-900/20 border-orange-800/50",
    google: "text-blue-400 bg-blue-900/20 border-blue-800/50",
    microsoft: "text-cyan-400 bg-cyan-900/20 border-cyan-800/50",
    tbd: "text-zinc-400 bg-zinc-800/40 border-zinc-700/50",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border capitalize ${colors[provider] ?? colors.tbd}`}>
      {provider}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ModelMonitorPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [selectedReport, setSelectedReport] = useState<FullReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "config" | "history">("overview");

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/model-monitor");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.latestReport) setSelectedReport(json.latestReport);
      }
    } catch (e) {
      console.error("Failed to load model monitor data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const runMonitor = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/admin/model-monitor", { method: "POST" });
      const json = await res.json();
      setRunResult(json);
      // Refresh data after run
      await fetchOverview();
    } catch (e) {
      setRunResult({ success: false, error: "Network error — check console." });
    } finally {
      setRunning(false);
    }
  };

  const loadReport = async (id: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/admin/model-monitor?action=report&id=${id}`);
      const json = await res.json();
      if (json.report) setSelectedReport(json.report);
    } finally {
      setLoadingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const urgentCount = (data?.pendingDeprecations?.filter(d => d.severity === "URGENT").length ?? 0)
    + (data?.pendingRecommendations?.filter(r => r.severity === "URGENT").length ?? 0);
  const highCount = (data?.pendingDeprecations?.filter(d => d.severity === "HIGH").length ?? 0)
    + (data?.pendingRecommendations?.filter(r => r.severity === "HIGH").length ?? 0);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-amber-50">
      <Header />
      <main className="flex-1 px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-3xl font-bold text-amber-100">AI Model Monitor</h1>
                {urgentCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-mono font-bold animate-pulse">
                    {urgentCount} URGENT
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-sm">
                Weekly automated check of model pricing, deprecations, and upgrade opportunities.
                <span className="ml-2 text-zinc-600 font-mono text-xs">Runs every Monday 09:00 UTC</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchOverview}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-700"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={runMonitor}
                disabled={running}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-semibold rounded-lg transition-all text-sm border border-amber-500 disabled:border-zinc-700"
              >
                {running ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Run result banner */}
          {runResult && (
            <div className={`p-4 rounded-xl border text-sm font-mono ${
              runResult.success
                ? "bg-green-900/20 border-green-800/50 text-green-300"
                : "bg-red-900/20 border-red-800/50 text-red-300"
            }`}>
              {runResult.success ? (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Report generated: {runResult.reportDate}</span>
                    <span className="mx-2">·</span>
                    <span>{runResult.summary}</span>
                    <div className="mt-1 text-green-500 text-xs">
                      {runResult.priceChanges} price change(s) · {runResult.recommendations} recommendation(s)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {runResult.error ?? "Run failed — check server logs."}
                </div>
              )}
            </div>
          )}

          {/* Alert summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Urgent Alerts"
              value={urgentCount}
              icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
              valueColor={urgentCount > 0 ? "text-red-400" : "text-zinc-400"}
            />
            <StatCard
              label="High Priority"
              value={highCount}
              icon={<TrendingDown className="w-5 h-5 text-orange-400" />}
              valueColor={highCount > 0 ? "text-orange-400" : "text-zinc-400"}
            />
            <StatCard
              label="Models Monitored"
              value={data?.currentConfig?.length ?? 0}
              icon={<Cpu className="w-5 h-5 text-amber-400" />}
              valueColor="text-amber-400"
            />
            <StatCard
              label="Reports Generated"
              value={data?.recentReports?.length ?? 0}
              icon={<FileText className="w-5 h-5 text-zinc-400" />}
              valueColor="text-zinc-300"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-800">
            {(["overview", "config", "history"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-amber-500 text-amber-300"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Left: Alerts + Recommendations */}
              <div className="lg:col-span-2 space-y-6">

                {/* Deprecation Warnings */}
                <section>
                  <h2 className="text-sm font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">
                    Deprecation Warnings
                  </h2>
                  {data?.pendingDeprecations && data.pendingDeprecations.length > 0 ? (
                    <div className="space-y-2">
                      {data.pendingDeprecations.map((dep, i) => {
                        const cfg = SEVERITY_CONFIG[dep.severity];
                        return (
                          <div key={i} className={`p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <code className="text-xs text-zinc-300 font-mono">{dep.provider}/{dep.model}</code>
                              <SeverityBadge severity={dep.severity} />
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">{dep.note}</p>
                            <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                              <span>→</span>
                              <code className="text-zinc-400">{dep.replacement}</code>
                              {dep.deprecationDate && (
                                <span className="ml-2 text-red-500 font-mono">Deprecated: {dep.deprecationDate}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={<CheckCircle className="w-5 h-5" />} message="No active deprecation warnings" />
                  )}
                </section>

                {/* Recommendations */}
                <section>
                  <h2 className="text-sm font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">
                    Recommendations
                  </h2>
                  {data?.pendingRecommendations && data.pendingRecommendations.length > 0 ? (
                    <div className="space-y-2">
                      {data.pendingRecommendations.map((rec, i) => {
                        const key = `${rec.useCase}-${i}`;
                        const isOpen = expandedRec === key;
                        const cfg = SEVERITY_CONFIG[rec.severity];
                        return (
                          <div key={key} className={`rounded-lg border ${cfg.bg} ${cfg.border} overflow-hidden`}>
                            <button
                              onClick={() => setExpandedRec(isOpen ? null : key)}
                              className="w-full p-3 text-left flex items-start justify-between gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <SeverityBadge severity={rec.severity} />
                                  <span className="text-xs text-zinc-400 font-mono truncate">{rec.useCase}</span>
                                </div>
                                <p className="text-xs text-zinc-300 leading-snug">{rec.recommendation}</p>
                              </div>
                              {isOpen
                                ? <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                                : <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                              }
                            </button>
                            {isOpen && (
                              <div className="px-3 pb-3 border-t border-zinc-800/50">
                                <p className="text-xs text-zinc-500 leading-relaxed mt-2">{rec.reasoning}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={<CheckCircle className="w-5 h-5" />} message="No recommendations at this time" />
                  )}
                </section>

                {/* Reminder: never auto-switch */}
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Models are <strong className="text-zinc-400">never auto-switched</strong>. All changes require manual code updates and testing before deployment.
                  </p>
                </div>
              </div>

              {/* Right: Latest report markdown */}
              <div className="lg:col-span-3">
                <h2 className="text-sm font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  Latest Report
                  {selectedReport && (
                    <span className="ml-2 normal-case font-normal text-zinc-600">{selectedReport.report_date}</span>
                  )}
                </h2>
                {selectedReport ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 overflow-auto max-h-[640px]">
                    <MarkdownReport markdown={selectedReport.report_markdown} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
                    <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No reports generated yet.</p>
                    <p className="text-zinc-600 text-xs mt-1">Click <strong>Run Now</strong> to generate the first report.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONFIG TAB */}
          {activeTab === "config" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  Current model assignments. To change a model, update the code in <code className="text-amber-400/80 text-xs">/api/admin/model-monitor/route.ts</code> and the relevant lens route, then re-deploy.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-zinc-400 font-mono text-xs uppercase tracking-wider">Use Case</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-mono text-xs uppercase tracking-wider">Provider</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-mono text-xs uppercase tracking-wider">Model</th>
                      <th className="text-right px-4 py-3 text-zinc-400 font-mono text-xs uppercase tracking-wider">Input / 1M</th>
                      <th className="text-right px-4 py-3 text-zinc-400 font-mono text-xs uppercase tracking-wider">Output / 1M</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {(data?.currentConfig ?? []).map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-900/60 transition-colors group">
                        <td className="px-4 py-3 text-zinc-200 font-medium text-xs">{row.useCase}</td>
                        <td className="px-4 py-3">
                          <ProviderBadge provider={row.provider} />
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs text-amber-300/80 font-mono">{row.model}</code>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
                          {row.inputCost != null ? `$${row.inputCost}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
                          {row.outputCost != null ? `$${row.outputCost}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h2 className="text-sm font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">Report History</h2>
                {(data?.recentReports ?? []).length === 0 ? (
                  <EmptyState icon={<Clock className="w-5 h-5" />} message="No reports yet" />
                ) : (
                  data?.recentReports.map(r => (
                    <button
                      key={r.id}
                      onClick={() => loadReport(r.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedReport?.id === r.id
                          ? "border-amber-700/50 bg-amber-900/10 text-amber-200"
                          : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold">{r.report_date}</span>
                        <div className="flex items-center gap-1">
                          {r.deprecations_detected && <span className="w-2 h-2 rounded-full bg-red-500" title="Deprecations" />}
                          {r.price_changes_detected && <span className="w-2 h-2 rounded-full bg-orange-500" title="Price changes" />}
                          {r.new_models_detected && <span className="w-2 h-2 rounded-full bg-blue-500" title="New models" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {r.urgent_alerts?.length > 0 && (
                          <span className="text-red-400 font-mono">{r.urgent_alerts.length} urgent</span>
                        )}
                        <span className="font-mono">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="lg:col-span-2">
                {loadingReport ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
                  </div>
                ) : selectedReport ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 overflow-auto max-h-[640px]">
                    <MarkdownReport markdown={selectedReport.report_markdown} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center h-full flex flex-col items-center justify-center">
                    <FileText className="w-8 h-8 text-zinc-700 mb-3" />
                    <p className="text-zinc-500 text-sm">Select a report from the list</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatCard({
  label, value, icon, valueColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueColor: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className={`text-2xl font-bold font-mono ${valueColor}`}>{value}</div>
        <div className="text-xs text-zinc-500 truncate">{label}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex items-center gap-2 p-4 rounded-lg border border-zinc-800/50 bg-zinc-900/20 text-zinc-600">
      <span className="text-zinc-700">{icon}</span>
      <span className="text-xs">{message}</span>
    </div>
  );
}

// Simple markdown renderer — no external deps, handles the report format.
function MarkdownReport({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableIsHeader = true;
  let key = 0;

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const [header, , ...body] = tableRows;
    elements.push(
      <div key={key++} className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-700">
              {header.map((cell, i) => (
                <th key={i} className="text-left px-2 py-1.5 text-zinc-400 font-mono font-semibold whitespace-nowrap">{cell.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1.5 text-zinc-300 align-top">{renderInline(cell.trim())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    tableIsHeader = true;
  };

  for (const line of lines) {
    const isTableRow = line.trim().startsWith("|");

    if (isTableRow) {
      inTable = true;
      const cells = line.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1);
      if (!line.includes("---")) {
        tableRows.push(cells);
      }
      continue;
    }

    if (inTable && !isTableRow) {
      flushTable();
      inTable = false;
    }

    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-xl font-bold text-amber-100 mb-1 mt-2">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-base font-bold text-amber-200/80 mt-5 mb-2 border-b border-zinc-800 pb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={key++} className="border-l-2 border-amber-600/50 pl-3 py-1 mb-3 bg-amber-900/10 rounded-r text-xs text-amber-200/70 leading-relaxed">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <div key={key++} className="flex gap-2 mb-1.5 text-xs text-zinc-300 leading-relaxed">
          <span className="text-zinc-600 shrink-0 mt-0.5">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={key++} className="border-zinc-800 my-4" />);
    } else if (line.startsWith("Generated: ")) {
      elements.push(<p key={key++} className="text-xs text-zinc-500 font-mono mb-3">{line}</p>);
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="mb-2" />);
    } else {
      elements.push(<p key={key++} className="text-xs text-zinc-400 leading-relaxed mb-1">{renderInline(line)}</p>);
    }
  }

  if (inTable) flushTable();

  return <div className="space-y-0">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold**, *italic*, and `code` inline
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-zinc-100 font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="text-zinc-300 italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="text-amber-300/80 font-mono bg-zinc-800/60 px-1 rounded text-xs">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
