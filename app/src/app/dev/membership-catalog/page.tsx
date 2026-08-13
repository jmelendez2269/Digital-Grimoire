import { notFound } from "next/navigation";

import MembershipAvailability from "@/components/membership/MembershipAvailability";

export default function MembershipCatalogPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
          Local verification
        </p>
        <h1 className="font-serif text-3xl font-bold text-amber-100">
          Membership catalog projection
        </h1>
        <p className="text-sm text-zinc-400">
          Development-only rendering of the same safe availability component used
          in Profile → Subscription.
        </p>
      </div>

      <MembershipAvailability />
    </main>
  );
}
