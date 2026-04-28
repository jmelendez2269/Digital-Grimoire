import { Suspense } from "react";
import Link from "next/link";
import { VerifyEmailContent } from "@/components/VerifyEmailContent";

export default function VerifyEmailPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black px-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.32em] text-cyan-400/80">
            Prismarium
          </p>
          <h1 className="mb-2 bg-gradient-to-r from-amber-300 via-amber-500 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent">
            Confirm your email
          </h1>
          <p className="text-sm tracking-wide text-zinc-400">
            One more step before you enter your library.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="glass-panel rounded-xl p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              </div>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>

        <div className="mt-8 text-center">
          <Link
            className="group flex items-center justify-center gap-2 text-sm text-zinc-500 transition-colors hover:text-cyan-400"
            href="/login"
          >
            <span className="transition-transform group-hover:-translate-x-1">&larr;</span>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
