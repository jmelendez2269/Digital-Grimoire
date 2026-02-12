import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parallax Graph | Project Parallax",
  description: "Explore the Parallax Graph - visualize cross-tradition connections and discover unity across wisdom traditions",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Parallax Graph | Project Parallax",
    description: "Explore the Parallax Graph - visualize cross-tradition connections and discover unity across wisdom traditions",
    type: "website",
    url: "https://www.projectparallax.io/parallax-graph",
    images: [
      {
        url: "https://www.projectparallax.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "Parallax Graph - Cross-Tradition Unity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parallax Graph | Project Parallax",
    description: "Explore the Parallax Graph - visualize cross-tradition connections",
    images: ["https://www.projectparallax.io/og-image.png"],
  },
};

export default function ParallaxGraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
