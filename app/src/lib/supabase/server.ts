import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch (error) {
    // cookies() can fail in certain Next.js contexts (e.g., static generation, edge runtime)
    // Log the error but don't throw - we'll create a client without cookie access
    console.warn('[Supabase Server Client] cookies() failed, creating client without cookie access:', error instanceof Error ? error.message : String(error));
    
    // Create a client that can't access cookies - this will result in unauthenticated requests
    // but won't crash the application
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // No-op when cookies aren't available
          },
        },
      }
    );
  }

  try {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
  } catch (error) {
    console.error('[Supabase Server Client] Error creating client:', error);
    throw new Error(`Failed to create Supabase client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

