import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore | Prismarium",
  description: "Explore the Prismarium knowledge network — traverse the correspondence graph, search concepts across traditions, and query the archive through multiple interpretive lenses.",
  robots: { index: false, follow: false },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
