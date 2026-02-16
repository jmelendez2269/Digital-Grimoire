import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parallax Engine | Project Parallax",
  description: "Explore esoteric texts and wisdom traditions through multi-lens AI analysis. Discover hidden connections and insights across different perspectives.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Parallax Engine | Project Parallax",
    description: "Explore esoteric texts and wisdom traditions through multi-lens AI analysis. Discover hidden connections and insights across different perspectives.",
    type: "website",
    url: "https://projectparallax.xyz/parallax-engine",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Parallax Engine - Multi-Lens AI Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parallax Engine | Project Parallax",
    description: "Explore esoteric texts and wisdom traditions through multi-lens AI analysis.",
    images: ["https://projectparallax.xyz/og-image.png"],
  },
};

export default function ConvergenceMachineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

