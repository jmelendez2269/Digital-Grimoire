'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import {
    BarChart3,
    MousePointer2,
    TrendingUp,
    ShoppingCart,
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    Monitor,
    ExternalLink
} from 'lucide-react';

interface AffiliateStats {
    totalClicks: number;
    recentClicks: number;
    topItems: { item_title: string; click_count: number }[];
    sourceStats: { source_page: string; click_count: number }[];
}

export default function MonitoringPage() {
    const [stats, setStats] = useState<AffiliateStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/affiliate/stats');
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-zinc-950">
            <Header />
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link
                            href="/admin"
                            className="flex items-center gap-2 text-amber-500 hover:text-amber-400 text-sm mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Admin
                        </Link>
                        <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-3">
                            <Monitor className="w-8 h-8 text-amber-500" />
                            System Monitoring
                        </h1>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-amber-900/20 rounded-lg text-amber-100/70 hover:bg-zinc-800 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Affiliate Performance Section */}
                <section className="mb-12">
                    <h2 className="text-xl font-semibold text-amber-100 mb-6 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-amber-500" />
                        Amazon Affiliate Performance
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Total Clicks Card */}
                        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-amber-100/50 uppercase tracking-wider">Total Clicks</span>
                                <MousePointer2 className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="text-4xl font-bold text-amber-100">
                                {loading ? '...' : stats?.totalClicks.toLocaleString()}
                            </div>
                            <p className="text-xs text-amber-100/40 mt-2">All-time lifetime clicks</p>
                        </div>

                        {/* Recent Clicks Card */}
                        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-amber-100/50 uppercase tracking-wider">Last 30 Days</span>
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="text-4xl font-bold text-amber-100">
                                {loading ? '...' : stats?.recentClicks.toLocaleString()}
                            </div>
                            <p className="text-xs text-amber-100/40 mt-2">Clicks in the last month</p>
                        </div>

                        {/* Estimated Earnings (Placeholder) */}
                        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-2xl p-6 opacity-60">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-amber-100/50 uppercase tracking-wider">Est. Earnings</span>
                                <BarChart3 className="w-5 h-5 text-amber-500/50" />
                            </div>
                            <div className="text-4xl font-bold text-amber-100">
                                $0.00
                            </div>
                            <p className="text-xs text-amber-100/40 mt-2">API integration pending</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Top Items List */}
                        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-amber-900/10 bg-zinc-900/30">
                                <h3 className="font-semibold text-amber-100">Top Clicked Items</h3>
                            </div>
                            <div className="p-6">
                                {loading ? (
                                    <div className="animate-pulse space-y-4">
                                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded" />)}
                                    </div>
                                ) : stats?.topItems.length ? (
                                    <div className="space-y-4">
                                        {stats.topItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-amber-900/5 hover:border-amber-900/20 transition-colors">
                                                <span className="text-sm text-amber-100/80 truncate pr-4">{item.item_title}</span>
                                                <span className="text-sm font-bold text-amber-400">{item.click_count} clicks</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-amber-100/40 text-center py-8">No click data available yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Traffic Sources */}
                        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-amber-900/10 bg-zinc-900/30">
                                <h3 className="font-semibold text-amber-100">Traffic Source Efficiency</h3>
                            </div>
                            <div className="p-6">
                                {loading ? (
                                    <div className="animate-pulse space-y-4">
                                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded" />)}
                                    </div>
                                ) : stats?.sourceStats.length ? (
                                    <div className="space-y-4">
                                        {stats.sourceStats.map((source, idx) => (
                                            <div key={idx} className="flex flex-col gap-2">
                                                <div className="flex justify-between text-xs text-amber-100/50">
                                                    <span>{source.source_page}</span>
                                                    <span>{source.click_count} clicks</span>
                                                </div>
                                                <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-600 rounded-full transition-all duration-1000"
                                                        style={{ '--width': `${(source.click_count / stats.totalClicks) * 100}%` } as React.CSSProperties}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-amber-100/40 text-center py-8">No traffic source data available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* System Links/Resources */}
                <section>
                    <h2 className="text-xl font-semibold text-amber-100 mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        External Monitoring Resources
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <a
                            href="https://affiliate-program.amazon.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 bg-zinc-900/30 border border-amber-900/10 rounded-xl hover:border-amber-500/30 transition-all flex items-center justify-between group"
                        >
                            <span className="text-sm text-amber-100/70 group-hover:text-amber-100">Amazon Associates Portal</span>
                            <ExternalLink className="w-4 h-4 text-amber-500/50 group-hover:text-amber-500" />
                        </a>
                        <a
                            href="https://ukguqtghfglirszsqqdj.supabase.co/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 bg-zinc-900/30 border border-amber-900/10 rounded-xl hover:border-amber-500/30 transition-all flex items-center justify-between group"
                        >
                            <span className="text-sm text-amber-100/70 group-hover:text-amber-100">Supabase Dashboard</span>
                            <ExternalLink className="w-4 h-4 text-amber-500/50 group-hover:text-amber-500" />
                        </a>
                        <Link
                            href="/admin/diagnostics"
                            className="p-4 bg-zinc-900/30 border border-amber-900/10 rounded-xl hover:border-amber-500/30 transition-all flex items-center justify-between group"
                        >
                            <span className="text-sm text-amber-100/70 group-hover:text-amber-100">Internal Diagnostics</span>
                            <BarChart3 className="w-4 h-4 text-amber-500/50 group-hover:text-amber-500" />
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
