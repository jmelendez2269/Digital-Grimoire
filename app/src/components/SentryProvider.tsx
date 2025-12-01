"use client";

// This component initializes Sentry on the client side
// It's imported in the root layout to ensure Sentry is loaded before any errors occur

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  // Dynamically import Sentry client config only on client side
  import("../instrumentation-client").catch((err) => {
    // Silently fail if Sentry can't be loaded
    console.warn("Failed to load Sentry:", err);
  });
}

export default function SentryProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

