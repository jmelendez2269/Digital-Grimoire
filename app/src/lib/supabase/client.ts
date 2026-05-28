import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseCookieOptions } from "./auth-config";

let browserClient: SupabaseClient | null = null;
const authLockQueues = new Map<string, Promise<unknown>>();

async function browserAuthLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const previous = authLockQueues.get(name) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  const queued = previous
    .catch(() => null)
    .then(() => current);

  authLockQueues.set(name, queued);

  await previous.catch(() => null);

  try {
    return await fn();
  } finally {
    release();
    if (authLockQueues.get(name) === queued) {
      authLockQueues.delete(name);
    }
  }
}

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(),
      isSingleton: true,
      auth: {
        lock: browserAuthLock,
      },
    }
  );

  return browserClient;
}

