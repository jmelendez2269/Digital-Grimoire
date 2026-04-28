"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setValidToken(true);

        try {
          const preserveResponse = await fetch("/api/auth/preserve-account-data", {
            method: "POST",
            credentials: "include",
          });

          if (preserveResponse.ok) {
            const preserveData = await preserveResponse.json();
            console.log("Account data preserved on page load:", preserveData);
          }
        } catch (preserveErr) {
          console.warn("Error preserving account data on page load:", preserveErr);
        }
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
      }

      setCheckingToken(false);
    };

    checkSession();
  }, []);

  const checkPasswordRequirements = (pwd: string) => {
    const hasLowercase = /[a-z]/.test(pwd);
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(pwd);
    const hasMinLength = pwd.length >= 8;

    return {
      hasLowercase,
      hasUppercase,
      hasNumber,
      hasSpecial,
      hasMinLength,
    };
  };

  const getMissingRequirements = (pwd: string) => {
    const checks = checkPasswordRequirements(pwd);
    const missing: string[] = [];

    if (!checks.hasLowercase) missing.push("lowercase letter");
    if (!checks.hasUppercase) missing.push("uppercase letter");
    if (!checks.hasNumber) missing.push("number");
    if (!checks.hasSpecial) missing.push("special character");
    if (!checks.hasMinLength) missing.push("at least 8 characters");

    return missing;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const missing = getMissingRequirements(password);
    if (missing.length > 0) {
      setError(`Password is missing: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        setError("Configuration error. Please contact support.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      try {
        const preserveResponse = await fetch("/api/auth/preserve-account-data", {
          method: "POST",
          credentials: "include",
        });

        if (preserveResponse.ok) {
          const preserveData = await preserveResponse.json();
          console.log("Account data preserved:", preserveData);
        } else {
          console.warn("Account data preservation had issues, but password reset succeeded");
        }
      } catch (preserveErr) {
        console.warn("Error preserving account data:", preserveErr);
      }

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black select-none pointer-events-none">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin">
            <svg
              className="h-12 w-12 text-cyan-500/40"
              fill="currentColor"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="50" r="3" fill="currentColor" />
            </svg>
          </div>
          <p className="text-zinc-200">Checking your reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black px-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.32em] text-cyan-400/80">
            Prismarium
          </p>
          <div className="mb-4 inline-block">
            <svg
              className="h-16 w-16 text-cyan-500/50"
              fill="currentColor"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="50" r="3" fill="currentColor" />
            </svg>
          </div>
          <h1 className="bg-gradient-to-r from-amber-300 via-amber-500 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Update your Prismarium password and return to your library.
          </p>
        </div>

        <div className="glass-panel rounded-2xl border-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {!validToken ? (
            <div className="space-y-6">
              <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-4 text-center">
                <svg
                  className="mx-auto mb-3 h-12 w-12 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                <h3 className="mb-2 text-lg font-semibold text-red-400">Reset link expired</h3>
                <p className="text-sm text-red-300">
                  {error || "This password reset link is invalid or has expired."}
                </p>
              </div>

              <Link
                className="block w-full rounded-md bg-amber-500 px-4 py-3 text-center font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                href="/forgot-password"
              >
                Send a new reset email
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="rounded-md border border-green-500/20 bg-green-500/10 px-4 py-4 text-center">
                <div className="mb-3 flex justify-center">
                  <svg
                    className="h-12 w-12 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-green-100">Password updated</h3>
                <p className="text-sm text-green-200/80">
                  Your new password is saved. Redirecting you back to sign in...
                </p>
              </div>

              <Link
                className="block w-full rounded-md bg-amber-500 px-4 py-3 text-center font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                href="/login"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handlePasswordReset}>
              <div>
                <label className="block text-sm font-medium text-amber-100" htmlFor="password">
                  New password
                </label>
                <input
                  className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  id="password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  type="password"
                  value={password}
                />
                <p className="mt-1 text-xs text-zinc-500">Use at least 8 characters.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-100" htmlFor="confirmPassword">
                  Confirm new password
                </label>
                <input
                  className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  id="confirmPassword"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  required
                  type="password"
                  value={confirmPassword}
                />
              </div>

              <div className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3">
                <p className="mb-2 text-xs font-medium text-zinc-400">Password requirements</p>
                <ul className="space-y-1 text-xs">
                  {(() => {
                    const checks = checkPasswordRequirements(password);
                    return (
                      <>
                        <li className={checks.hasMinLength ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasMinLength ? "[x]" : "[ ]"} At least 8 characters
                        </li>
                        <li className={checks.hasLowercase ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasLowercase ? "[x]" : "[ ]"} Lowercase letter
                        </li>
                        <li className={checks.hasUppercase ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasUppercase ? "[x]" : "[ ]"} Uppercase letter
                        </li>
                        <li className={checks.hasNumber ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasNumber ? "[x]" : "[ ]"} Number
                        </li>
                        <li className={checks.hasSpecial ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasSpecial ? "[x]" : "[ ]"} Special character
                        </li>
                        <li
                          className={
                            password === confirmPassword && password.length > 0
                              ? "text-green-400"
                              : "text-zinc-500"
                          }
                        >
                          {password === confirmPassword && password.length > 0 ? "[x]" : "[ ]"} Passwords match
                        </li>
                      </>
                    );
                  })()}
                </ul>
              </div>

              {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                className="w-full rounded-md bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? "Updating password..." : "Update password"}
              </button>
            </form>
          )}

          {!success && (
            <>
              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-zinc-700" />
                <span className="px-4 text-sm text-zinc-500">or</span>
                <div className="flex-1 border-t border-zinc-700" />
              </div>

              <div className="text-center">
                <p className="text-sm text-zinc-400">
                  Remember your password?{" "}
                  <Link className="font-semibold text-amber-400 hover:text-amber-300" href="/login">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link className="text-sm text-zinc-500 hover:text-zinc-400" href="/">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
