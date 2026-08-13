import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DashboardView from "@/components/DashboardView";
import { CoursePathPollPanel } from "@/components/course-polls/CoursePathPollPanel";
import PublicHomeView from "@/components/home/PublicHomeView";
import { getPublicLaunchPresentation } from "@/lib/courses/launch-presentation";
import { loadPublicCoursePathPoll } from "@/lib/course-polls/public.server";
import {
  getMemberHomeData,
  getSharedCoursePreviews,
} from "@/lib/home/member-home-data";
import { getPlatformTotals } from "@/lib/platform/totals.server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  const [
    {
      data: { user },
    },
    platformTotals,
    coursePreviews,
    pollLoad,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getPlatformTotals(serviceSupabase),
    getSharedCoursePreviews(serviceSupabase),
    loadPublicCoursePathPoll(),
  ]);

  let homeContent: React.ReactNode;

  if (user) {
    homeContent = (
      <>
        <DashboardView
          data={await getMemberHomeData(
            supabase,
            user,
            platformTotals,
            coursePreviews,
          )}
        />
        {pollLoad.poll ? (
          <div id="choose-the-next-show" className="scroll-mt-24">
            <CoursePathPollPanel initialPoll={pollLoad.poll} />
          </div>
        ) : null}
      </>
    );
  } else {
    const { poll, voteStatus } = pollLoad;

    homeContent = (
      <PublicHomeView
        platformTotals={platformTotals}
        launch={getPublicLaunchPresentation(voteStatus)}
        pollPanel={
          poll ? <CoursePathPollPanel initialPoll={poll} /> : undefined
        }
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex flex-1 flex-col">{homeContent}</main>
      <Footer />
    </div>
  );
}
