import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Extract project refs to check for mismatch
  const urlRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  let serviceKeyRef: string | null = null;
  if (supabaseServiceKey) {
    try {
      const keyParts = supabaseServiceKey.split('.');
      if (keyParts.length === 3) {
        const payload = JSON.parse(Buffer.from(keyParts[1], 'base64').toString());
        serviceKeyRef = payload.ref;
      }
    } catch (e) {
      // If we can't decode, that's okay
    }
  }
  
  const mismatch = urlRef && serviceKeyRef && urlRef !== serviceKeyRef;
  
  return NextResponse.json({
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!supabaseServiceKey,
    urlPrefix: supabaseUrl?.substring(0, 30),
    serviceKeyPrefix: supabaseServiceKey?.substring(0, 20),
    nodeEnv: process.env.NODE_ENV,
    // Add project refs to diagnose mismatch
    urlProjectRef: urlRef,
    serviceKeyProjectRef: serviceKeyRef,
    mismatch: mismatch,
    message: mismatch 
      ? `⚠️ MISMATCH: URL project (${urlRef}) != Service key project (${serviceKeyRef})`
      : urlRef && serviceKeyRef
        ? `✅ Match: Both are from project ${urlRef}`
        : 'Could not determine project refs'
  });
}

