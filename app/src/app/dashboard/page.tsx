import { Suspense } from "react";
import { redirect } from "next/navigation";

import DashboardView from "@/components/DashboardView";
import { getMemberHomeData } from "@/lib/home/member-home-data";
import { getCachedPublicHomeData } from "@/lib/home/public-home-data.server";
import { measureServerOperation } from "@/lib/performance/server";
import { getRequestVerifiedUserIdentity } from "@/lib/supabase/identity.server";
import { createClient } from "@/lib/supabase/server";

async function DashboardContent() {
  const supabase = await createClient();
  const [user, publicHomeData] = await Promise.all([
    measureServerOperation("dashboard.verify-identity", () =>
      getRequestVerifiedUserIdentity(supabase)
    ),
    measureServerOperation("dashboard.public-data", getCachedPublicHomeData),
  ]);

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardView
      data={await measureServerOperation("dashboard.member-data", () =>
        getMemberHomeData(
          supabase,
          user,
          publicHomeData.platformTotals,
          publicHomeData.coursePreviews
        )
      )}
    />
  );
}

function DashboardLoading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl animate-pulse space-y-6 px-6 py-10"
      role="status"
    >
      <div className="h-10 w-72 rounded-lg bg-white/8" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="h-52 rounded-2xl border border-white/8 bg-white/[0.025]"
          />
        ))}
      </div>
      <span className="sr-only">Loading member home</span>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
