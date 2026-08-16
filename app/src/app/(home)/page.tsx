import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DashboardView from "@/components/DashboardView";
import { CoursePathPollPanel } from "@/components/course-polls/CoursePathPollPanel";
import PublicHomeView from "@/components/home/PublicHomeView";
import { getPublicLaunchPresentation } from "@/lib/courses/launch-presentation";
import { loadPublicCoursePathPoll } from "@/lib/course-polls/public.server";
import { getMemberHomeData } from "@/lib/home/member-home-data";
import { getCachedPublicHomeData } from "@/lib/home/public-home-data.server";
import { measureServerOperation } from "@/lib/performance/server";
import { getRequestVerifiedUserIdentity } from "@/lib/supabase/identity.server";
import { createClient } from "@/lib/supabase/server";

async function HomeContent() {
  const supabase = await createClient();
  const [user, publicHomeData, pollLoad] = await Promise.all([
    measureServerOperation("home.verify-identity", () =>
      getRequestVerifiedUserIdentity(supabase)
    ),
    measureServerOperation("home.public-data", getCachedPublicHomeData),
    measureServerOperation("home.course-poll", loadPublicCoursePathPoll),
  ]);
  const { platformTotals, coursePreviews } = publicHomeData;

  let homeContent: React.ReactNode;

  if (user) {
    homeContent = (
      <>
        <DashboardView
          data={await measureServerOperation("home.member-data", () =>
            getMemberHomeData(supabase, user, platformTotals, coursePreviews)
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

  return homeContent;
}

function HomeLoading() {
  return (
    <div
      className="flex flex-1 items-center justify-center px-6 py-24"
      role="status"
    >
      <div className="w-full max-w-5xl animate-pulse space-y-6">
        <div className="h-4 w-40 rounded bg-amber-300/15" />
        <div className="h-16 max-w-3xl rounded-xl bg-white/8" />
        <div className="h-6 max-w-2xl rounded bg-white/5" />
        <div className="h-80 rounded-3xl border border-white/8 bg-white/[0.025]" />
      </div>
      <span className="sr-only">Loading Prismarium</span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex flex-1 flex-col">
        <Suspense fallback={<HomeLoading />}>
          <HomeContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
