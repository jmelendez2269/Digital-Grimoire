import { Suspense } from "react";
import Link from "next/link";
import { VerifyEmailContent } from "@/components/VerifyEmailContent";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-4xl font-bold text-transparent">
            Verify Your Email
          </h1>
          <p className="text-zinc-400">
            One more step to access your grimoire
          </p>
        </div>

        {/* Verification Instructions - Wrapped in Suspense */}
        <Suspense
          fallback={
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur">
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
              </div>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-zinc-500 hover:text-zinc-400"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

