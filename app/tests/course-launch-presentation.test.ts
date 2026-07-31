import assert from "node:assert/strict";
import test from "node:test";

import {
  getPublicLaunchPresentation,
  getPublicYouTubeConfiguration,
} from "../src/lib/courses/launch-presentation";

test("launch presentation keeps access, YouTube production, and voting separate", () => {
  const launch = getPublicLaunchPresentation("open", {
    channelUrl: null,
    prePlaylistUrl: null,
  });

  assert.equal(launch.voteStatus, "open");
  assert.equal(launch.startingCourse.code, "PRE");
  assert.equal(
    launch.startingCourse.courseAccess.fullCourse,
    "open-to-everyone",
  );
  assert.equal(launch.startingCourse.youtubeStatus, "first-series");

  assert.deepEqual(
    launch.candidateCourses.map((course) => ({
      code: course.code,
      preview: course.courseAccess.publicPreview,
      fullCourse: course.courseAccess.fullCourse,
      youtube: course.youtubeStatus,
    })),
    [
      {
        code: "C01",
        preview: "available",
        fullCourse: "existing-membership-policy",
        youtube: "vote-candidate",
      },
      {
        code: "FD01",
        preview: "available",
        fullCourse: "existing-membership-policy",
        youtube: "vote-candidate",
      },
    ],
  );
});

test("FD01 keeps its existing production slug", () => {
  const launch = getPublicLaunchPresentation("announced", {
    channelUrl: null,
    prePlaylistUrl: null,
  });

  assert.equal(
    launch.candidateCourses[1].slug,
    "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning",
  );
});

test("YouTube actions remain hidden until valid public YouTube URLs exist", () => {
  assert.deepEqual(
    getPublicYouTubeConfiguration({
      NEXT_PUBLIC_PRISMARIUM_YOUTUBE_CHANNEL_URL: "",
      NEXT_PUBLIC_PRISMARIUM_PRE_PLAYLIST_URL: "https://example.com/not-youtube",
    }),
    { channelUrl: null, prePlaylistUrl: null },
  );

  assert.deepEqual(
    getPublicYouTubeConfiguration({
      NEXT_PUBLIC_PRISMARIUM_YOUTUBE_CHANNEL_URL:
        "https://www.youtube.com/@Prismarium",
      NEXT_PUBLIC_PRISMARIUM_PRE_PLAYLIST_URL:
        "https://youtube.com/playlist?list=PRE",
    }),
    {
      channelUrl: "https://www.youtube.com/@Prismarium",
      prePlaylistUrl: "https://youtube.com/playlist?list=PRE",
    },
  );
});
