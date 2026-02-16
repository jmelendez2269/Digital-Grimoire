import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parallax Graph | Project Parallax",
  description: "Explore how all wisdom paths converge. Visualize cross-tradition conceptual unity showing how Buddhist emptiness connects to quantum zero-point fields, Taoist Wu, and Christian apophatic theology.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Parallax Graph | Project Parallax",
    description: "See how all wisdom paths converge through visual connections across traditions.",
    type: "website",
    url: "https://projectparallax.xyz/parallax-graph",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Parallax Graph - Cross-Tradition Unity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parallax Graph | Project Parallax",
    description: "Visual connections revealing hidden patterns across all wisdom traditions.",
    images: ["https://projectparallax.xyz/og-image.png"],
  },
};

export default function ConvergenceGraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
