'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export default function DiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      const supabase = createClient();

      // Test 1: Check authentication
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          diagnosticResults.push({
            test: 'Authentication',
            status: 'fail',
            message: 'Authentication error',
            details: authError.message,
          });
        } else if (!session) {
          diagnosticResults.push({
            test: 'Authentication',
            status: 'fail',
            message: 'Not authenticated',
            details: 'No active session found',
          });
        } else {
          diagnosticResults.push({
            test: 'Authentication',
            status: 'pass',
            message: 'User is authenticated',
            details: {
              userId: session.user.id,
              email: session.user.email,
            },
          });
        }
      } catch (error) {
        diagnosticResults.push({
          test: 'Authentication',
          status: 'fail',
          message: 'Failed to check authentication',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test 2: Check user profile
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .single();

        if (profileError) {
          diagnosticResults.push({
            test: 'User Profile',
            status: 'warning',
            message: 'Could not fetch user profile',
            details: profileError.message,
          });
        } else {
          diagnosticResults.push({
            test: 'User Profile',
            status: 'pass',
            message: 'User profile found',
            details: {
              role: profile.role,
              createdAt: profile.created_at,
            },
          });
        }
      } catch (error) {
        diagnosticResults.push({
          test: 'User Profile',
          status: 'fail',
          message: 'Failed to check user profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test 3: Check texts table access
      try {
        const { data: texts, error: textsError, count } = await supabase
          .from('texts')
          .select('*', { count: 'exact', head: true });

        if (textsError) {
          diagnosticResults.push({
            test: 'Texts Table Access',
            status: 'fail',
            message: 'Cannot access texts table',
            details: textsError.message,
          });
        } else {
          diagnosticResults.push({
            test: 'Texts Table Access',
            status: 'pass',
            message: `Texts table accessible (${count || 0} records)`,
            details: {
              count: count || 0,
            },
          });
        }
      } catch (error) {
        diagnosticResults.push({
          test: 'Texts Table Access',
          status: 'fail',
          message: 'Failed to query texts table',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test 4: Fetch sample texts
      try {
        const { data: sampleTexts, error: sampleError } = await supabase
          .from('texts')
          .select('id, title, status, created_at')
          .limit(5);

        if (sampleError) {
          diagnosticResults.push({
            test: 'Sample Texts Query',
            status: 'fail',
            message: 'Cannot fetch sample texts',
            details: sampleError.message,
          });
        } else {
          diagnosticResults.push({
            test: 'Sample Texts Query',
            status: sampleTexts && sampleTexts.length > 0 ? 'pass' : 'warning',
            message: sampleTexts && sampleTexts.length > 0 
              ? `Found ${sampleTexts.length} texts` 
              : 'No texts in database',
            details: sampleTexts,
          });
        }
      } catch (error) {
        diagnosticResults.push({
          test: 'Sample Texts Query',
          status: 'fail',
          message: 'Failed to fetch sample texts',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test 5: Check API endpoint
      try {
        const response = await fetch('/api/texts?limit=1');
        const data = await response.json();

        if (!response.ok) {
          diagnosticResults.push({
            test: 'API Endpoint',
            status: 'fail',
            message: 'API endpoint returned error',
            details: data,
          });
        } else {
          diagnosticResults.push({
            test: 'API Endpoint',
            status: 'pass',
            message: 'API endpoint working',
            details: {
              total: data.total,
              textsReturned: data.texts?.length || 0,
            },
          });
        }
      } catch (error) {
        diagnosticResults.push({
          test: 'API Endpoint',
          status: 'fail',
          message: 'Failed to call API endpoint',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      setResults(diagnosticResults);
    } catch (error) {
      console.error('Diagnostic error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'fail':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-amber-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-amber-400 hover:text-amber-300 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-amber-100 mb-2">
            System Diagnostics
          </h1>
          <p className="text-amber-100/60">
            Checking database connectivity and permissions
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-zinc-900/30 border border-amber-900/20 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-amber-100">
                    {result.test}
                  </h3>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded border ${getStatusColor(
                      result.status
                    )}`}
                  >
                    {result.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-amber-100/80 mb-3">{result.message}</p>
                {result.details && (
                  <div className="bg-zinc-950/50 border border-amber-900/10 rounded p-3 mt-3">
                    <pre className="text-xs text-amber-100/60 overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => {
              setLoading(true);
              setResults([]);
              runDiagnostics();
            }}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
          >
            Run Again
          </button>
          <Link
            href="/library"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg font-medium transition-colors"
          >
            Go to Library
          </Link>
        </div>
      </div>
    </div>
  );
}

