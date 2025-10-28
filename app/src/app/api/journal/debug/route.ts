import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to diagnose journal setup issues
 * Visit: /api/journal/debug
 */
export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: [],
  };

  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check 1: Authentication
    diagnostics.checks.push({ name: 'Authentication', status: 'checking...' });
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        diagnostics.checks[0] = {
          name: 'Authentication',
          status: 'error',
          error: authError.message,
        };
      } else if (!session) {
        diagnostics.checks[0] = {
          name: 'Authentication',
          status: 'warning',
          message: 'No active session - user not logged in',
        };
      } else {
        diagnostics.checks[0] = {
          name: 'Authentication',
          status: 'success',
          user: session.user.email,
          userId: session.user.id,
        };
      }
    } catch (err: any) {
      diagnostics.checks[0] = {
        name: 'Authentication',
        status: 'error',
        error: err.message,
      };
    }

    // Check 2: Table exists
    diagnostics.checks.push({ name: 'Table Exists', status: 'checking...' });
    try {
      const { data, error: tableError } = await supabase
        .from('journal_pages')
        .select('id')
        .limit(1);

      if (tableError) {
        diagnostics.checks[1] = {
          name: 'Table Exists',
          status: 'error',
          error: tableError.message,
          code: tableError.code,
          details: tableError.details,
          hint: tableError.hint,
        };
      } else {
        diagnostics.checks[1] = {
          name: 'Table Exists',
          status: 'success',
          message: 'journal_pages table is accessible',
        };
      }
    } catch (err: any) {
      diagnostics.checks[1] = {
        name: 'Table Exists',
        status: 'error',
        error: err.message,
      };
    }

    // Check 3: Can query table
    diagnostics.checks.push({ name: 'Query Permission', status: 'checking...' });
    try {
      const { data, error: queryError } = await supabase
        .from('journal_pages')
        .select('*')
        .limit(5);

      if (queryError) {
        diagnostics.checks[2] = {
          name: 'Query Permission',
          status: 'error',
          error: queryError.message,
          code: queryError.code,
        };
      } else {
        diagnostics.checks[2] = {
          name: 'Query Permission',
          status: 'success',
          message: `Successfully queried journal_pages`,
          recordsFound: data?.length || 0,
        };
      }
    } catch (err: any) {
      diagnostics.checks[2] = {
        name: 'Query Permission',
        status: 'error',
        error: err.message,
      };
    }

    // Check 4: Environment variables
    diagnostics.checks.push({
      name: 'Environment',
      status: 'info',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
    });

    // Summary
    const errors = diagnostics.checks.filter((c: any) => c.status === 'error');
    const warnings = diagnostics.checks.filter((c: any) => c.status === 'warning');
    
    diagnostics.summary = {
      totalChecks: diagnostics.checks.length,
      errors: errors.length,
      warnings: warnings.length,
      status: errors.length > 0 ? 'failed' : warnings.length > 0 ? 'warning' : 'healthy',
    };

    return NextResponse.json(diagnostics, { 
      status: errors.length > 0 ? 500 : 200 
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

