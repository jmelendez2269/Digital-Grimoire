"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkVerification = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email_confirmed_at) {
        router.push("/dashboard");
      }
    };

    checkVerification();
  }, [router]);

  const handleResendEmail = async () => {
    setResending(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      if (!email) {
        setError("We couldn't find the email address for this verification request.");
        setResending(false);
        return;
      }

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setMessage("A fresh verification email is on its way.");
      }
    } catch {
      setError("We couldn't resend the verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl border-white/5 p-8 backdrop-blur-xl">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      <div className="mb-6 flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl" />
          <div className="relative rounded-full border border-amber-500/30 bg-zinc-900 p-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <svg
              className="h-10 w-10 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-center">
        <p className="text-sm leading-6 text-zinc-200">
          We sent a confirmation link to the email address below. Open it to finish joining Prismarium.
        </p>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="break-all text-sm text-amber-300">{email || "Email address unavailable"}</p>
        </div>
        <p className="text-xs text-zinc-500">
          Once confirmed, you&apos;ll be able to sign in and continue your work in Prismarium.
        </p>
      </div>

      {message && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs text-green-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          {message}
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          {error}
        </div>
      )}

      <div className="mt-8">
        <button
          className="relative w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 transition-all hover:border-amber-500/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={resending}
          onClick={handleResendEmail}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {resending ? "Resending email..." : "Resend verification email"}
          </span>
        </button>
      </div>

      <div className="mt-6 border-t border-white/5 pt-6 text-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
          Need help?
        </p>
        <ul className="space-y-1 text-xs text-zinc-500">
          <li>Check your spam or junk folder</li>
          <li>Make sure the email address is spelled correctly</li>
          <li>Give it a few minutes, then resend if needed</li>
        </ul>
      </div>
    </div>
  );
}
