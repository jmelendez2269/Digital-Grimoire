import { redirect } from "next/navigation";

import DashboardView from "@/components/DashboardView";
import { getMemberHomeData } from "@/lib/home/member-home-data";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DashboardView data={await getMemberHomeData(supabase, user)} />;
}

