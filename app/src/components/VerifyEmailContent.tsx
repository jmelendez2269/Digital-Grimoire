"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
    // Check if user is already verified
    const checkVerification = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

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
        setError("DATA_NOT_FOUND: EMAIL_MISSING");
        setResending(false);
        return;
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setMessage("SIGNAL_SENT: CHECK_INBOX");
      }
    } catch (err) {
      setError("TRANSMISSION_FAILED");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="glass-panel p-8 backdrop-blur-xl relative overflow-hidden rounded-2xl border-white/5">
      {/* Top Border Gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      {/* Email Icon */}
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
          <div className="relative rounded-full bg-zinc-900 border border-amber-500/30 p-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <svg
              className="h-10 w-10 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-center">
        <p className="text-amber-100 font-sans text-sm">
          A verification link has been transmitted to:
        </p>
        <div className="rounded border border-amber-500/20 bg-amber-500/5 py-2 px-3">
          <p className="font-mono text-amber-400 text-sm break-all">
            {email || "UNKNOWN_TARGET"}
          </p>
        </div>
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-wide">
          ACTION_REQUIRED: VERIFY_IDENTITY
        </p>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className="mt-6 rounded border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs font-mono text-green-400 flex items-center justify-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {message}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-mono text-red-400 flex items-center justify-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          {error}
        </div>
      )}

      {/* Resend Button */}
      <div className="mt-8">
        <button
          onClick={handleResendEmail}
          disabled={resending}
          className="relative w-full overflow-hidden rounded bg-zinc-900 border border-zinc-800 px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider hover:text-white hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all group"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {resending ? "RE-TRANSMITTING..." : "RESEND_SIGNAL"}
          </span>
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-6 border-t border-white/5 pt-6 text-center">
        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-2">Troubleshooting_Protocols</p>
        <ul className="text-xs text-zinc-500 space-y-1">
          <li>Check Spam/Junk folders</li>
          <li>Verify email address spelling</li>
          <li>Allow 5 minutes for transmission</li>
        </ul>
      </div>
    </div>
  );
}

