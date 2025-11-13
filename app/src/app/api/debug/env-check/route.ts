import { NextRequest, NextResponse } from "next/server";

/**
 * Diagnostic endpoint to check environment variables
 * Only use in development - remove or secure in production
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Extract project refs
  const urlRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  let anonKeyRef: string | null = null;
  let serviceKeyRef: string | null = null;
  let mismatch = false;

  // Decode anon key
  try {
    if (supabaseAnonKey) {
      const parts = supabaseAnonKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        anonKeyRef = payload.ref;
      }
    }
  } catch (e) {
    // Ignore
  }

  // Decode service key
  try {
    if (supabaseServiceKey) {
      const parts = supabaseServiceKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        serviceKeyRef = payload.ref;
      }
    }
  } catch (e) {
    // Ignore
  }

  // Check for mismatches
  if (urlRef && anonKeyRef && urlRef !== anonKeyRef) {
    mismatch = true;
  }
  if (urlRef && serviceKeyRef && urlRef !== serviceKeyRef) {
    mismatch = true;
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    variables: {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey,
      urlRef,
      anonKeyRef,
      serviceKeyRef,
      mismatch,
      urlPrefix: supabaseUrl?.substring(0, 30) + '...',
      anonKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
      serviceKeyPrefix: supabaseServiceKey?.substring(0, 20) + '...',
    },
    issues: [
      !supabaseUrl && 'Missing NEXT_PUBLIC_SUPABASE_URL',
      !supabaseAnonKey && 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY',
      !supabaseServiceKey && 'Missing SUPABASE_SERVICE_ROLE_KEY',
      urlRef && anonKeyRef && urlRef !== anonKeyRef && `Anon key mismatch: URL project (${urlRef}) != Anon key project (${anonKeyRef})`,
      urlRef && serviceKeyRef && urlRef !== serviceKeyRef && `Service key mismatch: URL project (${urlRef}) != Service key project (${serviceKeyRef})`,
    ].filter(Boolean),
  });
}

