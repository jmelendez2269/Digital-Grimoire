'use client';

import { useEffect, useState } from 'react';

/**
 * Journal Diagnostic Page
 * Visit /journal/test to run diagnostics
 */
export default function JournalTestPage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  async function runDiagnostics() {
    const logs: string[] = [];
    
    logs.push('🔍 Starting Journal Diagnostics...\n');

    // Run the debug endpoint
    logs.push('🔧 Running detailed diagnostics...\n');
    try {
      const response = await fetch('/api/journal/debug');
      const data = await response.json();
      
      logs.push('═'.repeat(60));
      logs.push('DETAILED DIAGNOSTIC RESULTS');
      logs.push('═'.repeat(60) + '\n');
      
      if (data.checks) {
        data.checks.forEach((check: any, index: number) => {
          const statusIcon = 
            check.status === 'success' ? '✅' :
            check.status === 'error' ? '❌' :
            check.status === 'warning' ? '⚠️' : 'ℹ️';
          
          logs.push(`${index + 1}. ${statusIcon} ${check.name}: ${check.status.toUpperCase()}`);
          
          if (check.error) {
            logs.push(`   ERROR: ${check.error}`);
            if (check.code) logs.push(`   Code: ${check.code}`);
            if (check.details) logs.push(`   Details: ${check.details}`);
            if (check.hint) logs.push(`   Hint: ${check.hint}`);
          }
          
          if (check.message) logs.push(`   ${check.message}`);
          if (check.user) logs.push(`   User: ${check.user}`);
          if (check.recordsFound !== undefined) logs.push(`   Records found: ${check.recordsFound}`);
          
          logs.push('');
        });
      }
      
      if (data.summary) {
        logs.push('═'.repeat(60));
        logs.push('SUMMARY');
        logs.push('═'.repeat(60));
        logs.push(`Status: ${data.summary.status.toUpperCase()}`);
        logs.push(`Errors: ${data.summary.errors}`);
        logs.push(`Warnings: ${data.summary.warnings}`);
        logs.push('');
      }
      
      // Provide specific recommendations
      logs.push('═'.repeat(60));
      logs.push('RECOMMENDATIONS');
      logs.push('═'.repeat(60));
      
      const hasTableError = data.checks?.some((c: any) => 
        c.name === 'Table Exists' && c.status === 'error'
      );
      
      const notAuthenticated = data.checks?.some((c: any) => 
        c.name === 'Authentication' && (c.status === 'warning' || c.status === 'error')
      );
      
      if (hasTableError) {
        logs.push('❌ CRITICAL: journal_pages table does not exist!');
        logs.push('');
        logs.push('FIX:');
        logs.push('1. Go to Supabase Dashboard → SQL Editor');
        logs.push('2. Run the migration file:');
        logs.push('   migrations/015_add_journal_pages_SAFE.sql');
        logs.push('3. Come back here and click "Run Again"');
      } else if (notAuthenticated) {
        logs.push('⚠️  You are not logged in');
        logs.push('');
        logs.push('FIX:');
        logs.push('1. Go to /login or /auth/signup');
        logs.push('2. Log in with your account');
        logs.push('3. Come back here and click "Run Again"');
      } else {
        logs.push('✅ Everything looks good!');
        logs.push('');
        logs.push('You should be able to create journal pages now.');
        logs.push('Go to /journal and try again.');
      }
      
    } catch (error: any) {
      logs.push(`❌ Failed to run diagnostics: ${error.message}`);
      logs.push('');
      logs.push('This usually means:');
      logs.push('1. The API route is not accessible');
      logs.push('2. There is a server error');
      logs.push('');
      logs.push('Check the browser console (F12) for more details.');
    }
    
    setResults(logs);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-900/20 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6">
          <h1 className="text-2xl font-bold text-amber-400 mb-4">
            🔧 Journal Diagnostics
          </h1>
          
          {loading ? (
            <div className="text-zinc-400">Running tests...</div>
          ) : (
            <pre className="bg-zinc-900 p-4 rounded border border-zinc-700 text-sm text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono">
              {results.join('\n')}
            </pre>
          )}

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => {
                setLoading(true);
                setResults([]);
                runDiagnostics();
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-900 rounded-lg font-medium transition-colors"
            >
              Run Again
            </button>
            <a
              href="/journal"
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg font-medium transition-colors"
            >
              Back to Journal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

