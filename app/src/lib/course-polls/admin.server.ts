import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface CoursePollAdminActor {
  userId: string | null;
  isAdmin: boolean;
}

export async function getCoursePollAdminActor(): Promise<CoursePollAdminActor> {
  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) return { userId: null, isAdmin: false };

  const serviceClient = createServiceClient();
  const { data: profile, error: profileError } = await serviceClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("Unable to verify course poll administrator");
  }

  return {
    userId: user.id,
    isAdmin: profile?.role === "admin",
  };
}
