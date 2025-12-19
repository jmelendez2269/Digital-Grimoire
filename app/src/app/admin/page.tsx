'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface UsageMetrics {
  overview: {
    totalUsers: number;
    totalDocuments: number;
    recentUploads: number;
    currentCosts: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  serviceStats: Array<{
    service: string;
    totalUnits: number;
    totalCost: number;
    requests: number;
  }>;
  dailySummary: Array<{
    date: string;
    service: string;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    total_cost: number;
  }>;
  costAlerts: Array<{
    alert_type: string;
    threshold_amount: number;
    current_amount: number;
    threshold_exceeded: boolean;
  }>;
  topUsers: Array<{
    email: string;
    name: string;
    total_uploads: number;
    total_views: number;
    total_activity: number;
  }>;
  storageUsage: {
    total_files: number;
    total_size_bytes: number;
    pdf_count: number;
    pdf_size_bytes: number;
  } | null;
  recentErrors: Array<{
    service: string;
    operation: string;
    error_message: string;
    created_at: string;
  }>;
}

interface CoverSystemStatus {
  nanoBanana: {
    configured: boolean;
    available: boolean;
    credits?: number;
    error?: string;
  };
  stats: {
    totalJobs: number;
    completed: number;
    failed: number;
    pending: number;
    successRate: number;
    totalCreditsUsed: number;
    estimatedCost: number;
  };
  coverSources: Array<{
    cover_source: string;
    count: number;
  }>;
  recentJobs: Array<{
    id: string;
    text_id: string;
    status: string;
    source: string | null;
    result_url: string | null;
    error: string | null;
    credits_used: number;
    created_at: string;
  }>;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [coverStatus, setCoverStatus] = useState<CoverSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAndFetchMetrics();
  }, [timeRange]);

  const checkAdminAndFetchMetrics = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setIsAdmin(true);
    await fetchMetrics();
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch usage metrics
      const metricsResponse = await fetch(`/api/admin/usage?range=${timeRange}`);
      
      if (!metricsResponse.ok) {
        console.error('Failed to fetch metrics:', metricsResponse.status, metricsResponse.statusText);
        const errorData = await metricsResponse.json().catch(() => ({}));
        console.error('Error details:', errorData);
        return;
      }
      
      const metricsData = await metricsResponse.json();
      console.log('Metrics data received:', metricsData);

      if (metricsData.success) {
        setMetrics(metricsData);
      } else {
        console.error('Metrics API returned success: false', metricsData);
      }

      // Fetch cover system status
      const coverResponse = await fetch('/api/admin/covers/status');
      
      if (coverResponse.ok) {
        const coverData = await coverResponse.json();
        if (coverData.success) {
          setCoverStatus(coverData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getServiceName = (service: string) => {
    const names: Record<string, string> = {
      azure_ocr: 'Azure OCR',
      openai_metadata: 'OpenAI Metadata',
      r2_storage: 'R2 Storage',
      r2_bandwidth: 'R2 Bandwidth',
      other: 'Other',
    };
    return names[service] || service;
  };

  const getServiceIcon = (service: string) => {
    const icons: Record<string, string> = {
      azure_ocr: '📄',
      openai_metadata: '🤖',
      r2_storage: '💾',
      r2_bandwidth: '📡',
      other: '📊',
    };
    return icons[service] || '📊';
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-zinc-950 text-amber-50">
          <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-100 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-amber-100/60">
                API usage tracking and cost monitoring
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/upload"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                Upload Document
              </Link>
              <Link
                href="/admin/diagnostics"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg font-medium transition-colors"
              >
                Diagnostics
              </Link>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {['7', '30', '90'].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === days
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-800 text-amber-100 hover:bg-zinc-700'
                }`}
              >
                Last {days} days
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-amber-100/60">Loading metrics...</p>
            </div>
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="text-amber-100/60 text-sm mb-1">Total Users</div>
                <div className="text-3xl font-bold text-amber-100">
                  {metrics.overview.totalUsers}
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="text-amber-100/60 text-sm mb-1">Total Documents</div>
                <div className="text-3xl font-bold text-amber-100">
                  {metrics.overview.totalDocuments}
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="text-amber-100/60 text-sm mb-1">Recent Uploads (7d)</div>
                <div className="text-3xl font-bold text-amber-100">
                  {metrics.overview.recentUploads}
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="text-amber-100/60 text-sm mb-1">Monthly Cost</div>
                <div className="text-3xl font-bold text-green-400">
                  {formatCurrency(metrics.overview.currentCosts.monthly)}
                </div>
              </div>
            </div>

            {/* Cost Overview */}
            <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
              <h2 className="text-xl font-bold text-amber-100 mb-4">
                💰 Cost Breakdown
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-amber-100/60 text-sm mb-1">Daily Cost</div>
                  <div className="text-2xl font-bold text-amber-100">
                    {formatCurrency(metrics.overview.currentCosts.daily)}
                  </div>
                  {metrics.costAlerts.find(a => a.alert_type === 'daily') && (
                    <div className="text-xs text-amber-100/60 mt-1">
                      Threshold: {formatCurrency(metrics.costAlerts.find(a => a.alert_type === 'daily')!.threshold_amount)}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-amber-100/60 text-sm mb-1">Weekly Cost</div>
                  <div className="text-2xl font-bold text-amber-100">
                    {formatCurrency(metrics.overview.currentCosts.weekly)}
                  </div>
                  {metrics.costAlerts.find(a => a.alert_type === 'weekly') && (
                    <div className="text-xs text-amber-100/60 mt-1">
                      Threshold: {formatCurrency(metrics.costAlerts.find(a => a.alert_type === 'weekly')!.threshold_amount)}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-amber-100/60 text-sm mb-1">Monthly Cost</div>
                  <div className="text-2xl font-bold text-amber-100">
                    {formatCurrency(metrics.overview.currentCosts.monthly)}
                  </div>
                  {metrics.costAlerts.find(a => a.alert_type === 'monthly') && (
                    <div className="text-xs text-amber-100/60 mt-1">
                      Threshold: {formatCurrency(metrics.costAlerts.find(a => a.alert_type === 'monthly')!.threshold_amount)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Service Stats */}
            <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
              <h2 className="text-xl font-bold text-amber-100 mb-4">
                📊 API Usage by Service
              </h2>
              {metrics.serviceStats.length === 0 ? (
                <div className="text-center py-8 text-amber-100/40">
                  No API usage data found for the selected time range
                </div>
              ) : (
              <div className="space-y-4">
                {metrics.serviceStats.map((stat) => (
                  <div key={stat.service} className="border border-amber-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getServiceIcon(stat.service)}</span>
                        <span className="font-semibold text-amber-100">
                          {getServiceName(stat.service)}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-green-400">
                        {formatCurrency(stat.totalCost)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-amber-100/60">Requests</div>
                        <div className="font-semibold text-amber-100">{stat.requests.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-amber-100/60">Units Used</div>
                        <div className="font-semibold text-amber-100">
                          {Math.round(stat.totalUnits).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-amber-100/60">Avg Cost/Request</div>
                        <div className="font-semibold text-amber-100">
                          {formatCurrency(stat.totalCost / stat.requests)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Storage Usage */}
            {metrics.storageUsage && (
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-amber-100 mb-4">
                  💾 Storage Usage
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-amber-100/60 text-sm mb-1">Total Files</div>
                    <div className="text-2xl font-bold text-amber-100">
                      {metrics.storageUsage.total_files}
                    </div>
                  </div>
                  <div>
                    <div className="text-amber-100/60 text-sm mb-1">Total Size</div>
                    <div className="text-2xl font-bold text-amber-100">
                      {formatBytes(metrics.storageUsage.total_size_bytes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-amber-100/60 text-sm mb-1">PDF Files</div>
                    <div className="text-2xl font-bold text-amber-100">
                      {metrics.storageUsage.pdf_count}
                    </div>
                    <div className="text-xs text-amber-100/60 mt-1">
                      {formatBytes(metrics.storageUsage.pdf_size_bytes)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Book Cover System Status */}
            {coverStatus && (
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-amber-100 mb-4">
                  🎨 Book Cover System
                </h2>

                {/* API Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Nano Banana Status */}
                  <div className={`border rounded-lg p-4 ${
                    coverStatus.nanoBanana.available
                      ? 'bg-green-950/20 border-green-700/30'
                      : 'bg-amber-950/20 border-amber-700/30'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-amber-100">Nano Banana AI</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        coverStatus.nanoBanana.available
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-amber-600/20 text-amber-400'
                      }`}>
                        {coverStatus.nanoBanana.available ? '✓ Active' : '○ Not Configured'}
                      </span>
                    </div>
                    {coverStatus.nanoBanana.available && coverStatus.nanoBanana.credits !== undefined && (
                      <div>
                        <div className="text-2xl font-bold text-amber-100">{coverStatus.nanoBanana.credits}</div>
                        <div className="text-xs text-amber-100/60">credits available</div>
                        <div className="text-xs text-amber-100/60 mt-1">
                          ≈ {Math.floor(coverStatus.nanoBanana.credits / 2)} covers
                        </div>
                      </div>
                    )}
                    {!coverStatus.nanoBanana.available && (
                      <div className="text-xs text-amber-100/60 mt-1">
                        Add NANO_BANANA_API_KEY to enable AI cover generation
                      </div>
                    )}
                  </div>

                  {/* Generation Stats */}
                  <div className="border border-amber-900/20 rounded-lg p-4">
                    <div className="text-sm font-semibold text-amber-100 mb-2">Generation Stats</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-100/60">Success Rate:</span>
                        <span className="font-semibold text-green-400">
                          {coverStatus.stats.successRate}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-100/60">Total Jobs:</span>
                        <span className="font-semibold text-amber-100">
                          {coverStatus.stats.totalJobs}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-100/60">Credits Used:</span>
                        <span className="font-semibold text-amber-100">
                          {coverStatus.stats.totalCreditsUsed}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cost Tracking */}
                  <div className="border border-amber-900/20 rounded-lg p-4">
                    <div className="text-sm font-semibold text-amber-100 mb-2">AI Generation Cost</div>
                    <div className="text-3xl font-bold text-green-400 mb-1">
                      {formatCurrency(coverStatus.stats.estimatedCost)}
                    </div>
                    <div className="text-xs text-amber-100/60">
                      {coverStatus.stats.completed} covers generated
                    </div>
                    {coverStatus.stats.failed > 0 && (
                      <div className="text-xs text-red-400 mt-1">
                        {coverStatus.stats.failed} failed attempts
                      </div>
                    )}
                  </div>
                </div>

                {/* Cover Source Distribution */}
                {coverStatus.coverSources.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-amber-100 mb-3">Cover Sources</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {coverStatus.coverSources.map((source) => (
                        <div key={source.cover_source} className="bg-zinc-800/50 border border-amber-900/20 rounded-lg p-3">
                          <div className="text-xs text-amber-100/60 mb-1">
                            {source.cover_source === 'scraped' ? '🔍 Scraped' :
                             source.cover_source === 'ai-generated' ? '🤖 AI Generated' :
                             source.cover_source === 'manual' ? '📤 Manual' : source.cover_source}
                          </div>
                          <div className="text-xl font-bold text-amber-100">{source.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Cover Jobs */}
                {coverStatus.recentJobs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-amber-100 mb-3">Recent Cover Generation Jobs</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {coverStatus.recentJobs.slice(0, 10).map((job) => (
                        <div key={job.id} className="bg-zinc-800/50 border border-amber-900/20 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                job.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                                job.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                                job.status === 'processing' ? 'bg-blue-600/20 text-blue-400' :
                                'bg-amber-600/20 text-amber-400'
                              }`}>
                                {job.status}
                              </span>
                              <span className="text-xs text-amber-100/60">
                                {job.source || 'unknown source'}
                              </span>
                              {job.credits_used > 0 && (
                                <span className="text-xs text-amber-100/60">
                                  • {job.credits_used} credits
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-amber-100/40">
                              {new Date(job.created_at).toLocaleString()}
                            </span>
                          </div>
                          {job.error && (
                            <div className="text-xs text-red-400 mt-1">{job.error}</div>
                          )}
                          {job.result_url && (
                            <div className="text-xs text-amber-100/60 mt-1 truncate">
                              ✓ {job.result_url}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {coverStatus.recentJobs.length === 0 && (
                  <div className="text-center py-8 text-amber-100/40">
                    No cover generation jobs yet
                  </div>
                )}
              </div>
            )}

            {/* Top Users */}
            {metrics.topUsers && metrics.topUsers.length > 0 && (
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-amber-100 mb-4">
                  👥 Most Active Users
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-amber-900/20">
                        <th className="text-left py-2 px-3 text-amber-100/60 font-semibold">User</th>
                        <th className="text-right py-2 px-3 text-amber-100/60 font-semibold">Uploads</th>
                        <th className="text-right py-2 px-3 text-amber-100/60 font-semibold">Views</th>
                        <th className="text-right py-2 px-3 text-amber-100/60 font-semibold">Total Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.topUsers.map((user, idx) => (
                        <tr key={idx} className="border-b border-amber-900/10">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-amber-100">{user.name || 'Anonymous'}</div>
                            <div className="text-sm text-amber-100/60">{user.email}</div>
                          </td>
                          <td className="text-right py-3 px-3 text-amber-100">{user.total_uploads}</td>
                          <td className="text-right py-3 px-3 text-amber-100">{user.total_views}</td>
                          <td className="text-right py-3 px-3 font-semibold text-amber-100">{user.total_activity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Errors */}
            {metrics.recentErrors && metrics.recentErrors.length > 0 && (
              <div className="bg-zinc-900/50 border border-red-900/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-red-400 mb-4">
                  ⚠️ Recent Errors ({metrics.recentErrors.length})
                </h2>
                <div className="space-y-2">
                  {metrics.recentErrors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="bg-red-950/20 border border-red-900/20 rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-red-400">
                          {getServiceName(error.service)} - {error.operation}
                        </span>
                        <span className="text-xs text-red-400/60">
                          {new Date(error.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-red-300/80">{error.error_message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Recommendations */}
            <div className="bg-gradient-to-br from-amber-900/20 to-amber-800/10 border border-amber-700/30 rounded-lg p-6">
              <h2 className="text-xl font-bold text-amber-100 mb-4">
                💡 Pricing Insights
              </h2>
              <div className="space-y-3 text-amber-100/80">
                <p>
                  <strong>Current Monthly Cost:</strong> {formatCurrency(metrics.overview.currentCosts.monthly)}
                </p>
                <p>
                  <strong>Average Cost per Upload:</strong>{' '}
                  {metrics.overview.recentUploads > 0
                    ? formatCurrency(metrics.overview.currentCosts.weekly / metrics.overview.recentUploads)
                    : 'N/A'}
                </p>
                <p>
                  <strong>Projected Monthly Cost:</strong>{' '}
                  {formatCurrency((metrics.overview.currentCosts.daily * 30))}
                </p>
                
                <div className="mt-4 p-4 bg-amber-950/30 rounded border border-amber-700/20">
                  <h3 className="font-semibold text-amber-100 mb-2">Recommendations:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {metrics.overview.currentCosts.monthly < 100 && (
                      <li>Current usage is very low - consider a freemium model</li>
                    )}
                    {metrics.overview.currentCosts.monthly >= 100 && metrics.overview.currentCosts.monthly < 500 && (
                      <li>Moderate usage - consider tiered pricing starting at $9.99/month</li>
                    )}
                    {metrics.overview.currentCosts.monthly >= 500 && (
                      <li>High usage detected - implement usage-based pricing or higher tiers</li>
                    )}
                    <li>Azure OCR is {metrics.overview.currentCosts.monthly > 0 
                      ? ((metrics.serviceStats.find(s => s.service === 'azure_ocr')?.totalCost || 0) / metrics.overview.currentCosts.monthly * 100).toFixed(1)
                      : '0'}% of total cost</li>
                    <li>Consider bulk upload discounts if average documents/user is high</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-amber-100/60">
            No metrics available
          </div>
        )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

