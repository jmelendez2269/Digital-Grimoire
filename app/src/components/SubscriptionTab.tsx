"use client";

import MembershipAvailability from "@/components/membership/MembershipAvailability";
import {
  billingTimelineFromSummary,
  parseSafeBillingSummary,
  type SafeBillingSummary,
} from "@/lib/membership/membership-billing-presentation";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STATUS_LABELS: Record<SafeBillingSummary["stripeStatus"], string> = {
  none: "Reader access",
  active: "Active",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  past_due: "Past due",
  paused: "Paused",
  trialing: "Trialing",
  unpaid: "Unpaid",
  unknown: "Unavailable",
};

const COHORT_LABELS: Record<SafeBillingSummary["pricingCohort"], string> = {
  none: "Not applicable",
  founding: "Founding rate",
  standard: "Standard rate",
  legacy: "Legacy rate",
  unknown: "Unavailable",
};

const TIMELINE_LABELS = {
  renewal: "Renews on",
  scheduled_end: "Scheduled to end on",
  access_end: "Access through",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatMonthlyPrice(billing: SafeBillingSummary): string {
  if (
    billing.amountCents === null ||
    billing.currency !== "usd" ||
    billing.billingInterval !== "month"
  ) {
    return "Included with Reader";
  }

  return `${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(billing.amountCents / 100)}/month`;
}

export default function SubscriptionTab() {
  const [billing, setBilling] = useState<SafeBillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const loadBilling = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);

    try {
      const response = await fetch("/api/membership/billing-summary", {
        cache: "no-store",
        signal,
      });
      const body: unknown = await response.json();
      const safeBilling =
        isRecord(body) && "billing" in body
          ? parseSafeBillingSummary(body.billing)
          : null;

      if (!response.ok || !safeBilling) {
        throw new Error("BILLING_SUMMARY_UNAVAILABLE");
      }

      setBilling(safeBilling);
    } catch {
      if (signal?.aborted) return;
      setBilling(null);
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadBilling(controller.signal);
    return () => controller.abort();
  }, [loadBilling]);

  const openBillingPortal = async () => {
    if (!billing?.portalAvailable || portalLoading) return;

    setPortalLoading(true);
    setPortalError(null);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const body: unknown = await response.json();
      const portalUrl = isRecord(body) ? body.url : null;
      if (!response.ok || typeof portalUrl !== "string") {
        throw new Error("BILLING_PORTAL_UNAVAILABLE");
      }

      const parsedUrl = new URL(portalUrl);
      if (parsedUrl.protocol !== "https:") {
        throw new Error("BILLING_PORTAL_UNAVAILABLE");
      }
      window.location.assign(parsedUrl.toString());
    } catch {
      setPortalError(
        "Billing management is temporarily unavailable. Your plan has not changed. Please try again later."
      );
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex min-h-40 items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-300"
        role="status"
      >
        <Loader2
          className="h-5 w-5 animate-spin text-amber-400 motion-reduce:animate-none"
          aria-hidden="true"
        />
        Loading your billing details…
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div
        className="rounded-xl border border-red-900/70 bg-red-950/30 p-6"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-300"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-semibold text-red-100">
              Billing details are temporarily unavailable
            </h2>
            <p className="mt-1 text-sm leading-6 text-red-200/80">
              No billing action was taken. Try loading your server-verified
              account details again.
            </p>
            <button
              type="button"
              onClick={() => void loadBilling()}
              className="mt-4 min-h-11 rounded-lg border border-red-700 px-4 py-2 text-sm font-semibold text-red-100 transition-colors hover:bg-red-900/40 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timeline = billingTimelineFromSummary(billing);
  const isReader = billing.planCode === "reader";

  return (
    <div className="space-y-8">
      <section
        className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50"
        aria-labelledby="current-plan-heading"
      >
        <div className="border-b border-zinc-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-amber-400">Current plan</p>
              <h2
                id="current-plan-heading"
                className="mt-1 text-2xl font-bold text-amber-100"
              >
                {billing.planName}
              </h2>
            </div>
            <div className="flex items-center gap-2 self-start rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-zinc-200">
              {billing.paidEntitlementsActive ? (
                <CheckCircle2
                  className="h-4 w-4 text-emerald-400"
                  aria-hidden="true"
                />
              ) : (
                <BookOpen
                  className="h-4 w-4 text-amber-400"
                  aria-hidden="true"
                />
              )}
              {STATUS_LABELS[billing.stripeStatus]}
            </div>
          </div>
        </div>

        <dl className="grid gap-px bg-zinc-800 sm:grid-cols-2">
          <div className="bg-zinc-950/50 px-5 py-4 sm:px-6">
            <dt className="text-sm text-zinc-400">Price</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-100 tabular-nums">
              {formatMonthlyPrice(billing)}
            </dd>
          </div>
          <div className="bg-zinc-950/50 px-5 py-4 sm:px-6">
            <dt className="text-sm text-zinc-400">Rate</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-100">
              {COHORT_LABELS[billing.pricingCohort]}
            </dd>
          </div>
          <div className="bg-zinc-950/50 px-5 py-4 sm:px-6">
            <dt className="text-sm text-zinc-400">Billing status</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-100">
              {STATUS_LABELS[billing.stripeStatus]}
            </dd>
          </div>
          <div className="bg-zinc-950/50 px-5 py-4 sm:px-6">
            <dt className="text-sm text-zinc-400">
              {timeline ? TIMELINE_LABELS[timeline.kind] : "Billing schedule"}
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-100 tabular-nums">
              {timeline ? formatDate(timeline.date) : "No renewal date"}
            </dd>
          </div>
        </dl>

        {billing.pricingCohort === "founding" && (
          <div className="border-t border-amber-900/50 bg-amber-950/20 px-5 py-4 text-sm leading-6 text-amber-100/80 sm:px-6">
            <strong className="font-semibold text-amber-100">
              Founding rate:
            </strong>{" "}
            your current rate continues while this subscription remains
            uninterrupted. A terminal lapse does not preserve founding
            eligibility after the offer closes.
          </div>
        )}

        {billing.cancelAtPeriodEnd && (
          <div className="border-t border-orange-900/60 bg-orange-950/30 px-5 py-4 text-sm leading-6 text-orange-100 sm:px-6">
            Cancellation is scheduled. Your saved work remains yours, and the
            access date above comes from the billing server.
          </div>
        )}

        {billing.billingHold && (
          <div
            className="border-t border-red-900/70 bg-red-950/30 px-5 py-4 text-sm leading-6 text-red-100 sm:px-6"
            role="alert"
          >
            This membership is on a billing hold. Paid access stays closed until
            the server confirms a safe billing state.
          </div>
        )}
      </section>

      {!isReader && (
        <section
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6"
          aria-labelledby="billing-management-heading"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <h2
                id="billing-management-heading"
                className="text-lg font-bold text-amber-100"
              >
                Billing management
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Use the secure billing portal for your payment method, invoices,
                or cancellation. Plan switching is not available in the lean
                portal.
              </p>

              {billing.portalAvailable ? (
                <button
                  type="button"
                  onClick={() => void openBillingPortal()}
                  disabled={portalLoading}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-700/70 bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {portalLoading ? (
                    <Loader2
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                  )}
                  {portalLoading ? "Opening secure portal…" : "Manage billing"}
                </button>
              ) : (
                <div className="mt-5 flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm leading-6 text-zinc-400">
                  <CalendarDays
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
                    aria-hidden="true"
                  />
                  Billing operations are safely closed. Your current server-
                  verified plan remains unchanged.
                </div>
              )}

              {portalError && (
                <p className="mt-3 text-sm leading-6 text-red-300" role="alert">
                  {portalError}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {isReader && <MembershipAvailability />}
    </div>
  );
}
