import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Convergence Graph | Convergence",
  description: "Explore how all wisdom paths converge. Visualize cross-tradition conceptual unity showing how Buddhist emptiness connects to quantum zero-point fields, Taoist Wu, and Christian apophatic theology.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Convergence Graph | Convergence",
    description: "See how all wisdom paths converge through visual connections across traditions.",
    type: "website",
    url: "https://www.convergencelibrary.com/convergence-graph",
    images: [
      {
        url: "https://www.convergencelibrary.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Graph - Cross-Tradition Unity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Convergence Graph | Convergence",
    description: "Visual connections revealing hidden patterns across all wisdom traditions.",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function ConvergenceGraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
