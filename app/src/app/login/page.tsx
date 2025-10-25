import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-block">
            <svg
              viewBox="0 0 100 100"
              className="h-16 w-16 text-amber-500/30"
              fill="currentColor"
            >
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
              <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" fill="none" />
              <circle cx="50" cy="50" r="3" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-amber-100">Welcome Back</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in to your Digital Grimoire
          </p>
        </div>

        {/* Login Form - Wrapped in Suspense for useSearchParams */}
        <Suspense
          fallback={
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur">
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-400"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

