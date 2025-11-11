"use client";

import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import Link from "next/link";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setShowBanner(false);
  };

  const rejectCookies = () => {
    localStorage.setItem("cookie-consent", "rejected");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setShowBanner(false);
    // Optionally disable analytics here
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-lg border border-amber-700/50 bg-zinc-900/95 p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <Cookie className="h-6 w-6 flex-shrink-0 text-amber-400 mt-1" />
          <div className="flex-1">
            <h3 className="mb-2 text-lg font-semibold text-amber-200">
              Cookie Consent
            </h3>
            <p className="mb-4 text-sm text-zinc-300">
              We use cookies and similar technologies to provide, protect, and improve our services. 
              Essential cookies are required for the service to function. Analytics cookies help us 
              understand how you use our platform.{" "}
              <Link
                href="/cookies"
                className="text-amber-400 underline hover:text-amber-300"
              >
                Learn more
              </Link>
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={acceptCookies}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
              >
                Accept All
              </button>
              <button
                onClick={rejectCookies}
                className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Essential Only
              </button>
              <Link
                href="/cookies"
                className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Cookie Settings
              </Link>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="flex-shrink-0 text-zinc-400 transition-colors hover:text-zinc-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

