import { Suspense } from "react";
import Link from "next/link";
import { VerifyEmailContent } from "@/components/VerifyEmailContent";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black px-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-4xl font-bold text-transparent">
            Verify Your Email
          </h1>
          <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">
            Awaiting_Confirmation_Signal...
          </p>
        </div>

        {/* Verification Instructions - Wrapped in Suspense */}
        <Suspense
          fallback={
            <div className="glass-panel rounded-xl p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
              </div>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-xs font-mono text-zinc-500 hover:text-amber-500 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Return_To_Login
          </Link>
        </div>
      </div>
    </div>
  );
}

