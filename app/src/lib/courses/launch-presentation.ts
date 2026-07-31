export type PublicPreviewStatus = "available" | "pending";
export type FullCourseAccessStatus =
  | "open-to-everyone"
  | "existing-membership-policy";
export type CourseYouTubeStatus = "first-series" | "vote-candidate";
export type CourseVoteStatus =
  | "announced"
  | "open"
  | "closed"
  | "unavailable";

export interface CourseAccessPresentation {
  publicPreview: PublicPreviewStatus;
  fullCourse: FullCourseAccessStatus;
}

export interface CourseLaunchPresentation {
  code: "PRE" | "C01" | "FD01";
  slug: string;
  title: string;
  coreQuestion: string;
  durationWeeks: number;
  pathLabel: string;
  href: string;
  courseAccess: CourseAccessPresentation;
  youtubeStatus: CourseYouTubeStatus;
}

export interface PublicYouTubeConfiguration {
  channelUrl: string | null;
  prePlaylistUrl: string | null;
}

export interface PublicLaunchPresentation {
  startingCourse: CourseLaunchPresentation;
  candidateCourses: [
    CourseLaunchPresentation,
    CourseLaunchPresentation,
  ];
  voteStatus: CourseVoteStatus;
  youtube: PublicYouTubeConfiguration;
}

const PRE_SLUG = "pre-how-to-hold-two-things-at-once";
const C01_SLUG = "c01-how-humans-know-what-they-know";
const FD01_SLUG =
  "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning";

function publicCourseHref(slug: string): string {
  return `/courses/${slug}`;
}

function safeYouTubeUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const isYouTube =
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtu.be";

    return url.protocol === "https:" && isYouTube ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getPublicYouTubeConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PublicYouTubeConfiguration {
  return {
    channelUrl: safeYouTubeUrl(
      environment.NEXT_PUBLIC_PRISMARIUM_YOUTUBE_CHANNEL_URL,
    ),
    prePlaylistUrl: safeYouTubeUrl(
      environment.NEXT_PUBLIC_PRISMARIUM_PRE_PLAYLIST_URL,
    ),
  };
}

export function getPublicLaunchPresentation(
  voteStatus: CourseVoteStatus = "announced",
  youtube: PublicYouTubeConfiguration = getPublicYouTubeConfiguration(),
): PublicLaunchPresentation {
  return {
    startingCourse: {
      code: "PRE",
      slug: PRE_SLUG,
      title: "How to Hold Two Things at Once",
      coreQuestion:
        "When serious ways of understanding pull us in different directions, what should we resolve, test, or hold open?",
      durationWeeks: 2,
      pathLabel: "Shared orientation",
      href: publicCourseHref(PRE_SLUG),
      courseAccess: {
        publicPreview: "available",
        fullCourse: "open-to-everyone",
      },
      youtubeStatus: "first-series",
    },
    candidateCourses: [
      {
        code: "C01",
        slug: C01_SLUG,
        title: "How Humans Know What They Know",
        coreQuestion: "What counts as truth — and who decides?",
        durationWeeks: 8,
        pathLabel: "Core path",
        href: publicCourseHref(C01_SLUG),
        courseAccess: {
          publicPreview: "available",
          fullCourse: "existing-membership-policy",
        },
        youtubeStatus: "vote-candidate",
      },
      {
        code: "FD01",
        slug: FD01_SLUG,
        title: "Mythic Imagination: When Old Stories Find You",
        coreQuestion:
          "What happens between a story, a culture, and a reader when a myth becomes personally meaningful?",
        durationWeeks: 6,
        pathLabel: "Foundation Door",
        href: publicCourseHref(FD01_SLUG),
        courseAccess: {
          publicPreview: "available",
          fullCourse: "existing-membership-policy",
        },
        youtubeStatus: "vote-candidate",
      },
    ],
    voteStatus,
    youtube,
  };
}
