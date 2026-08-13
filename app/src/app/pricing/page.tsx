import type { Metadata } from "next";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MembershipPricing from "@/components/membership/MembershipPricing";
import { getSafeMembershipCatalog } from "@/lib/membership/membership-catalog.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Membership | Prismarium",
  description:
    "Compare Prismarium Reader, Student, Scholar, and available high-volume membership options.",
};

export default function PricingPage() {
  const catalog = getSafeMembershipCatalog();

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-zinc-100">
      <Header />
      <main className="flex-1 pt-24">
        <section className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-20 lg:px-8 lg:py-24">
          <p className="font-mono text-xs font-semibold tracking-[0.24em] text-amber-300 uppercase">
            Prismarium membership
          </p>
          <h1 className="mt-6 font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl lg:text-6xl">
            Learn with a course. Research on your own. Keep both paths open.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            Every plan includes the core research environment. Paid membership
            adds a clear monthly credit allowance and, where offered, access to
            guided courses and saved progress.
          </p>
        </section>

        <MembershipPricing catalog={catalog} />
      </main>
      <Footer />
    </div>
  );
}
