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
        setError("Email address not found. Please try registering again.");
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
        setMessage("Verification email sent! Check your inbox.");
      }
    } catch (err) {
      setError("Failed to resend email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur">
      {/* Email Icon */}
      <div className="mb-6 flex justify-center">
        <div className="rounded-full bg-amber-500/10 p-4">
          <svg
            className="h-12 w-12 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4 text-center">
        <p className="text-amber-100">
          We've sent a verification email to:
        </p>
        <p className="font-semibold text-amber-400">
          {email || "your email address"}
        </p>
        <p className="text-sm text-zinc-400">
          Please check your inbox and click the verification link to activate your account.
        </p>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className="mt-6 rounded-md bg-green-500/10 border border-green-500/50 p-3 text-center">
          <p className="text-sm text-green-400">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-md bg-red-500/10 border border-red-500/50 p-3 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Resend Button */}
      <div className="mt-6">
        <button
          onClick={handleResendEmail}
          disabled={resending}
          className="w-full rounded-md bg-amber-500/20 px-4 py-3 font-semibold text-amber-400 transition-colors hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend Verification Email"}
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-6 space-y-2 rounded-md bg-zinc-800/50 p-4 text-sm text-zinc-400">
        <p className="font-semibold text-zinc-300">Didn't receive the email?</p>
        <ul className="list-inside list-disc space-y-1 text-xs">
          <li>Check your spam or junk folder</li>
          <li>Make sure the email address is correct</li>
          <li>Wait a few minutes and try resending</li>
          <li>Add noreply@mail.app.supabase.io to your contacts</li>
        </ul>
      </div>
    </div>
  );
}

