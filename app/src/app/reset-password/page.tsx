"use client";

import { useState, useEffect } from "react";
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
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if this is a password recovery session
      if (session) {
        setValidToken(true);
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
      }
      
      setCheckingToken(false);
    };

    checkSession();
  }, []);

  // Password validation helpers
  const checkPasswordRequirements = (pwd: string) => {
    const hasLowercase = /[a-z]/.test(pwd);
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd);
    const hasMinLength = pwd.length >= 8;

    return {
      hasLowercase,
      hasUppercase,
      hasNumber,
      hasSpecial,
      hasMinLength,
      missing: [] as string[],
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

    console.log("🔄 Password reset form submitted");

    // Validation
    if (password !== confirmPassword) {
      console.warn("⚠️ Passwords do not match");
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      console.warn("⚠️ Password too short");
      setError("Password must be at least 8 characters");
      return;
    }

    // Check password complexity
    const missing = getMissingRequirements(password);
    if (missing.length > 0) {
      const missingList = missing.join(", ");
      setError(`Password is missing: ${missingList}`);
      return;
    }

    setLoading(true);
    console.log("🔐 Updating password...");

    try {
      const supabase = createClient();
      
      if (!supabase) {
        console.error("❌ Supabase client failed to initialize");
        setError("Configuration error. Please contact support.");
        setLoading(false);
        return;
      }
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("❌ Password update error:", updateError);
        setError(updateError.message);
        setLoading(false);
        return;
      }

      console.log("✅ Password updated successfully");
      setSuccess(true);
      setLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      console.error("❌ Unexpected error during password reset:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin">
            <svg
              viewBox="0 0 100 100"
              className="h-12 w-12 text-amber-500/30"
              fill="currentColor"
            >
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
              <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" fill="none" />
              <circle cx="50" cy="50" r="3" fill="currentColor" />
            </svg>
          </div>
          <p className="text-amber-100">Verifying reset link...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-amber-100">Create New Password</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Enter a strong password for your account
          </p>
        </div>

        {/* Reset Form */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur">
          {!validToken ? (
            <div className="space-y-6">
              <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-4 text-center">
                <svg
                  className="mx-auto mb-3 h-12 w-12 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-red-400 mb-2">
                  Invalid Reset Link
                </h3>
                <p className="text-sm text-red-300">
                  {error || "This password reset link is invalid or has expired."}
                </p>
              </div>

              <Link
                href="/forgot-password"
                className="block w-full rounded-md bg-amber-500 px-4 py-3 text-center font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                Request New Reset Link
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="rounded-md border border-green-500/20 bg-green-500/10 px-4 py-4 text-center">
                <div className="mb-3 flex justify-center">
                  <svg
                    className="h-12 w-12 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-100 mb-2">
                  Password Updated!
                </h3>
                <p className="text-sm text-green-200/80">
                  Your password has been successfully reset. Redirecting to login...
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full rounded-md bg-amber-500 px-4 py-3 text-center font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              {/* New Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-amber-100">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  At least 8 characters
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-amber-100">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="••••••••"
                />
              </div>

              {/* Password Strength Indicator */}
              <div className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3">
                <p className="mb-2 text-xs font-medium text-zinc-400">Password Requirements:</p>
                <ul className="space-y-1 text-xs">
                  {(() => {
                    const checks = checkPasswordRequirements(password);
                    return (
                      <>
                        <li className={checks.hasMinLength ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasMinLength ? "✓" : "○"} At least 8 characters
                        </li>
                        <li className={checks.hasLowercase ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasLowercase ? "✓" : "○"} Lowercase letter
                        </li>
                        <li className={checks.hasUppercase ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasUppercase ? "✓" : "○"} Uppercase letter
                        </li>
                        <li className={checks.hasNumber ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasNumber ? "✓" : "○"} Number
                        </li>
                        <li className={checks.hasSpecial ? "text-green-400" : "text-zinc-500"}>
                          {checks.hasSpecial ? "✓" : "○"} Special character
                        </li>
                        <li className={password === confirmPassword && password.length > 0 ? "text-green-400" : "text-zinc-500"}>
                          {password === confirmPassword && password.length > 0 ? "✓" : "○"} Passwords match
                        </li>
                      </>
                    );
                  })()}
                </ul>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                onClick={() => console.log("🖱️ Update password button clicked")}
                className="w-full rounded-md bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Updating password..." : "Update Password"}
              </button>
            </form>
          )}

          {/* Back to Login */}
          {!success && (
            <>
              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-zinc-700"></div>
                <span className="px-4 text-sm text-zinc-500">or</span>
                <div className="flex-1 border-t border-zinc-700"></div>
              </div>

              <div className="text-center">
                <p className="text-sm text-zinc-400">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-amber-400 hover:text-amber-300"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

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

