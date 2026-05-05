import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parallax Graph | Prismarium",
  description: "Explore the Parallax Graph - visualize cross-tradition connections and discover unity across wisdom traditions",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Parallax Graph | Prismarium",
    description: "Explore the Parallax Graph - visualize cross-tradition connections and discover unity across wisdom traditions",
    type: "website",
    url: "/parallax-graph",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Parallax Graph - Cross-Tradition Unity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parallax Graph | Prismarium",
    description: "Explore the Parallax Graph - visualize cross-tradition connections",
    images: ["/og-image.png"],
  },
};

export default function ParallaxGraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
