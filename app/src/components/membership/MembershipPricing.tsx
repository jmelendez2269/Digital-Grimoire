import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleGauge,
  Library,
  NotebookPen,
  Search,
  Sparkles,
  Youtube,
} from "lucide-react";

import type { SafeMembershipCatalog } from "@/lib/membership/membership-catalog.server";
import {
  getPublicPricingEntries,
  type PricingPlan,
  type PublicPricingEntry,
} from "@/lib/membership/membership-pricing";

const PLAN_SUMMARIES: Record<PricingPlan["code"], string> = {
  reader:
    "A complete free account for reading, research, and a steady practice.",
  student:
    "A focused way into guided study, with room to keep exploring independently.",
  scholar:
    "The complete membership for courses, sustained research, and regular tool use.",
  adept:
    "A high-volume membership for practitioners who need significantly more tool capacity.",
};

const PLAN_LABELS: Partial<Record<PricingPlan["code"], string>> = {
  student: "Founding membership",
  scholar: "Complete membership",
  adept: "High-volume membership",
};

function formatPrice(entry: PublicPricingEntry) {
  if (!entry.offer) return { amount: "$0", suffix: "forever" };

  return {
    amount: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: entry.offer.currency,
      maximumFractionDigits: 0,
    }).format(entry.offer.amountCents / 100),
    suffix: `per ${entry.offer.interval}`,
  };
}

function courseAccessCopy(plan: PricingPlan, catalog: SafeMembershipCatalog) {
  if (plan.courseAccess === "free-path") return "Public and free course paths";
  if (plan.courseAccess === "all-member-released") {
    return "All currently released member courses";
  }

  return catalog.courses.studentLaunchCourseTitle
    ? `Launch course: ${catalog.courses.studentLaunchCourseTitle}`
    : "One explicitly selected launch course";
}

function journalCopy(plan: PricingPlan) {
  return plan.journalActivePageLimit === null
    ? "Unlimited active Journal pages"
    : `Up to ${plan.journalActivePageLimit} active Journal pages`;
}

function PlanCard({
  entry,
  catalog,
}: {
  entry: PublicPricingEntry;
  catalog: SafeMembershipCatalog;
}) {
  const { plan } = entry;
  const price = formatPrice(entry);
  const featured = plan.code === "scholar";

  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border p-6 sm:p-7 ${
        featured
          ? "border-amber-300/45 bg-amber-300/[0.07] shadow-[0_24px_80px_-44px_rgba(252,211,77,0.7)]"
          : "border-white/10 bg-white/[0.035]"
      }`}
    >
      {PLAN_LABELS[plan.code] ? (
        <p
          className={`mb-5 w-fit rounded-full border px-3 py-1 font-mono text-[0.68rem] font-semibold tracking-[0.16em] uppercase ${
            featured
              ? "border-amber-300/35 bg-amber-300/10 text-amber-200"
              : "border-white/10 bg-white/[0.04] text-zinc-400"
          }`}
        >
          {PLAN_LABELS[plan.code]}
        </p>
      ) : null}

      <div>
        <h2 className="font-serif text-3xl text-zinc-50">{plan.name}</h2>
        <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">
          {PLAN_SUMMARIES[plan.code]}
        </p>
      </div>

      <div className="mt-7 flex items-end gap-2 border-b border-white/10 pb-7">
        <span className="font-serif text-5xl text-zinc-50 tabular-nums">
          {price.amount}
        </span>
        <span className="pb-1 text-sm text-zinc-500">{price.suffix}</span>
      </div>

      <ul className="mt-7 flex-1 space-y-4 text-sm leading-6 text-zinc-300">
        <li className="flex gap-3">
          <Check
            className="mt-1 h-4 w-4 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <span>
            <strong className="font-semibold text-zinc-100">
              {plan.monthlyCredits} Prism Credits
            </strong>{" "}
            each month
          </span>
        </li>
        <li className="flex gap-3">
          <Check
            className="mt-1 h-4 w-4 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <span>{courseAccessCopy(plan, catalog)}</span>
        </li>
        <li className="flex gap-3">
          <Check
            className="mt-1 h-4 w-4 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <span>{journalCopy(plan)}</span>
        </li>
        <li className="flex gap-3">
          <Check
            className="mt-1 h-4 w-4 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <span>Library, Search, Graph, and non-generative research tools</span>
        </li>
        <li className="flex gap-3">
          <Check
            className="mt-1 h-4 w-4 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <span>Credit-metered generative tools when available</span>
        </li>
      </ul>

      <Link
        href="/register"
        className={`mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none ${
          featured
            ? "bg-amber-300 text-zinc-950 hover:bg-amber-200 focus-visible:ring-amber-200"
            : "border border-white/15 text-zinc-100 hover:bg-white/[0.07] focus-visible:ring-zinc-200"
        }`}
      >
        {plan.code === "reader"
          ? "Start with Reader"
          : `Create an account for ${plan.name}`}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      {entry.offer ? (
        <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
          Checkout is offered only after you sign in and eligibility is
          verified.
        </p>
      ) : null}
    </article>
  );
}

export default function MembershipPricing({
  catalog,
}: {
  catalog: SafeMembershipCatalog;
}) {
  const entries = getPublicPricingEntries(catalog);
  const paidEntries = entries.filter((entry) => entry.offer);
  const enabledActions = catalog.actions.filter(
    (action) => action.launchEnabled && action.creditCost !== null
  );

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        {!catalog.launch.paidSalesEnabled ? (
          <div
            className="mx-auto mb-8 max-w-3xl rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-5 py-4 text-center text-sm leading-6 text-amber-100"
            role="status"
          >
            Paid memberships are not open yet. Reader remains available as a
            real free account, and no paid offer or checkout action is shown
            until the launch gates pass.
          </div>
        ) : null}

        <div
          className={`grid gap-5 ${
            entries.length === 1
              ? "mx-auto max-w-md"
              : entries.length === 2
                ? "mx-auto max-w-4xl md:grid-cols-2"
                : entries.length === 3
                  ? "lg:grid-cols-3"
                  : "md:grid-cols-2 xl:grid-cols-4"
          }`}
        >
          {entries.map((entry) => (
            <PlanCard key={entry.plan.code} entry={entry} catalog={catalog} />
          ))}
        </div>

        {catalog.launch.paidSalesEnabled && paidEntries.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6 text-zinc-400">
            Paid availability could not be verified, so no paid plans are shown.
          </p>
        ) : null}
      </section>

      <section className="border-y border-white/[0.07] bg-white/[0.025]">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2 lg:px-8 lg:py-20">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/45 p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-6 font-serif text-3xl text-zinc-50">
              Courses are optional.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-300">
              Follow a course when structure helps, or build your own path
              through the Library, Concept Search, Knowledge Graph, Journal, and
              research tools. Both are complete ways to use Prismarium.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-zinc-300">
              {[
                [Library, "Library"],
                [Search, "Search"],
                [NotebookPen, "Journal"],
                [Sparkles, "Generative tools"],
              ].map(([Icon, label]) => (
                <span
                  key={label as string}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3"
                >
                  <Icon
                    className="h-3.5 w-3.5 text-cyan-200"
                    aria-hidden="true"
                  />
                  {label as string}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/45 p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-300/25 bg-rose-300/10 text-rose-200">
              <Youtube className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-6 font-serif text-3xl text-zinc-50">
              Public learning stays public.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-300">
              Public course previews and available YouTube resources do not
              require a paid membership. Membership supports the durable study
              environment; it does not promise a new-video schedule.
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-amber-200 underline decoration-amber-300/30 underline-offset-4 transition-colors hover:text-amber-100 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:outline-none"
            >
              Explore course paths
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-start">
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
              Prism Credits
            </p>
            <h2 className="mt-4 font-serif text-3xl text-zinc-50 sm:text-4xl">
              Capacity you can understand.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-400">
              Credits are used only for enabled generative actions. Reading,
              ordinary search, the Graph, Journal, and reopening saved results
              do not spend credits.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            {enabledActions.length ? (
              <ul className="divide-y divide-white/10">
                {enabledActions.map((action) => (
                  <li
                    key={action.code}
                    className="flex min-h-14 items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span className="text-zinc-300">
                      {action.customerLabel}
                    </span>
                    <span className="font-mono font-semibold text-amber-200 tabular-nums">
                      {action.creditCost}{" "}
                      {action.creditCost === 1 ? "credit" : "credits"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex gap-4">
                <CircleGauge
                  className="mt-0.5 h-6 w-6 shrink-0 text-amber-300"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-zinc-100">
                    Generative actions are safely closed.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Action costs will appear here only when the same server
                    catalog confirms they are enabled.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.07]">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-20">
          <BookOpen
            className="mx-auto h-7 w-7 text-amber-200"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="mt-6 font-serif text-3xl text-zinc-50 sm:text-4xl">
            Begin free. Choose more structure when it serves your work.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-400">
            Reader includes the core research environment, 10 monthly credits,
            public learning paths, and space for 50 active Journal pages.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-200 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
          >
            Create a Reader account
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
