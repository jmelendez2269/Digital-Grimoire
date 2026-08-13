"use client";

import { ArrowRight, Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface MembershipCatalogPlan {
  code: "reader" | "student" | "scholar" | "adept";
  name: string;
  monthlyCredits: number;
  journalActivePageLimit: number | null;
  publiclyAvailable: boolean;
}

interface MembershipCatalogOffer {
  code: string;
  planCode: Exclude<MembershipCatalogPlan["code"], "reader">;
  amountCents: number;
  currency: "usd";
  interval: "month";
  acceptsNewCheckout: boolean;
  publiclyAvailable: boolean;
}

interface SafeMembershipCatalog {
  plans: MembershipCatalogPlan[];
  offers: MembershipCatalogOffer[];
  courses: {
    studentLaunchCourseSlug: string | null;
  };
  launch: {
    paidSalesEnabled: boolean;
  };
}

const membershipPlanCodes = ["reader", "student", "scholar", "adept"] as const;
const paidMembershipPlanCodes = ["student", "scholar", "adept"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isSafeMembershipCatalog(
  value: unknown
): value is SafeMembershipCatalog {
  if (!isRecord(value)) return false;

  const { plans, offers, courses, launch } = value;
  return (
    Array.isArray(plans) &&
    plans.every(
      (plan) =>
        isRecord(plan) &&
        membershipPlanCodes.includes(
          plan.code as (typeof membershipPlanCodes)[number]
        ) &&
        typeof plan.name === "string" &&
        typeof plan.monthlyCredits === "number" &&
        Number.isInteger(plan.monthlyCredits) &&
        (plan.journalActivePageLimit === null ||
          (typeof plan.journalActivePageLimit === "number" &&
            Number.isInteger(plan.journalActivePageLimit))) &&
        typeof plan.publiclyAvailable === "boolean"
    ) &&
    Array.isArray(offers) &&
    offers.every(
      (offer) =>
        isRecord(offer) &&
        typeof offer.code === "string" &&
        paidMembershipPlanCodes.includes(
          offer.planCode as (typeof paidMembershipPlanCodes)[number]
        ) &&
        typeof offer.amountCents === "number" &&
        Number.isInteger(offer.amountCents) &&
        offer.currency === "usd" &&
        offer.interval === "month" &&
        typeof offer.acceptsNewCheckout === "boolean" &&
        typeof offer.publiclyAvailable === "boolean"
    ) &&
    isRecord(courses) &&
    (courses.studentLaunchCourseSlug === null ||
      typeof courses.studentLaunchCourseSlug === "string") &&
    isRecord(launch) &&
    typeof launch.paidSalesEnabled === "boolean"
  );
}

export default function MembershipAvailability() {
  const [catalog, setCatalog] = useState<SafeMembershipCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [checkoutOffer, setCheckoutOffer] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchMembershipCatalog = async () => {
      try {
        const response = await fetch("/api/membership/catalog", {
          cache: "no-store",
          signal: controller.signal,
        });
        const body: unknown = await response.json();
        const safeCatalog =
          isRecord(body) && "catalog" in body ? body.catalog : null;

        if (!response.ok || !isSafeMembershipCatalog(safeCatalog)) {
          throw new Error("Membership catalog is unavailable");
        }

        setCatalog(safeCatalog);
        setUnavailable(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setCatalog(null);
        setUnavailable(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchMembershipCatalog();
    return () => controller.abort();
  }, []);

  const startCheckout = async (offerCode: string) => {
    if (checkoutOffer) return;
    setCheckoutOffer(offerCode);
    setCheckoutError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerCode,
          requestId: crypto.randomUUID(),
        }),
      });
      const body: unknown = await response.json();
      const url = isRecord(body) ? body.url : null;
      if (!response.ok || typeof url !== "string") {
        throw new Error("CHECKOUT_UNAVAILABLE");
      }

      const checkoutUrl = new URL(url);
      const host = checkoutUrl.hostname.toLowerCase();
      if (
        checkoutUrl.protocol !== "https:" ||
        (host !== "checkout.stripe.com" && !host.endsWith(".stripe.com"))
      ) {
        throw new Error("CHECKOUT_UNAVAILABLE");
      }
      window.location.assign(checkoutUrl.toString());
    } catch {
      setCheckoutOffer(null);
      setCheckoutError(
        "Secure Checkout is temporarily unavailable. No charge was created. Please try again."
      );
    }
  };

  const readerPlan = catalog?.plans.find(
    (plan) => plan.code === "reader" && plan.publiclyAvailable
  );
  const availableOffers = catalog?.launch.paidSalesEnabled
    ? catalog.offers.filter((offer) => {
        const plan = catalog.plans.find(
          (candidate) => candidate.code === offer.planCode
        );
        return (
          offer.publiclyAvailable &&
          offer.acceptsNewCheckout &&
          plan?.publiclyAvailable === true
        );
      })
    : [];

  return (
    <section
      className="space-y-4"
      aria-labelledby="membership-availability-heading"
    >
      <h3
        id="membership-availability-heading"
        className="text-xl font-bold text-amber-100"
      >
        Membership availability
      </h3>

      {loading ? (
        <div
          className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 text-sm text-zinc-300"
          role="status"
        >
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          Checking membership availability…
        </div>
      ) : availableOffers.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            <div className="space-y-2">
              <p className="font-semibold text-amber-100">
                Paid memberships are not open yet
              </p>
              <p className="text-sm text-zinc-400">
                {unavailable
                  ? "Paid availability could not be verified, so no paid offers are shown."
                  : "The membership catalog is safely closed. No paid course, offer, or checkout action is available."}
              </p>
              {readerPlan && (
                <p className="text-sm text-zinc-300">
                  Reader remains available for free reading and research, with
                  up to {readerPlan.journalActivePageLimit} active Journal
                  pages. Generative credits require a paid membership.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {availableOffers.map((offer) => {
            const plan = catalog?.plans.find(
              (candidate) => candidate.code === offer.planCode
            );
            if (!plan) return null;

            return (
              <article
                key={offer.code}
                className="rounded-lg border border-amber-800/30 bg-amber-900/10 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-amber-100">{plan.name}</h4>
                    <p className="mt-1 text-sm text-zinc-400">
                      {plan.monthlyCredits} monthly credits ·{" "}
                      {plan.journalActivePageLimit === null
                        ? "Unlimited active Journal pages"
                        : `Up to ${plan.journalActivePageLimit} active Journal pages`}
                    </p>
                  </div>
                  <p className="text-lg font-bold whitespace-nowrap text-amber-100">
                    ${(offer.amountCents / 100).toFixed(0)}/month
                  </p>
                </div>
                {offer.planCode === "student" ? (
                  <p className="mt-3 text-sm text-zinc-300">
                    Access one member course at a time.
                  </p>
                ) : null}
                {offer.planCode === "scholar" ? (
                  <p className="mt-3 text-sm text-zinc-300">
                    Early access to newly released member courses.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void startCheckout(offer.code)}
                  disabled={checkoutOffer !== null}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {checkoutOffer === offer.code ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {checkoutOffer === offer.code
                    ? "Opening secure Checkout…"
                    : `Choose ${plan.name}`}
                </button>
              </article>
            );
          })}
          {checkoutError ? (
            <p
              className="text-sm leading-6 text-red-300 md:col-span-2"
              role="alert"
            >
              {checkoutError}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
