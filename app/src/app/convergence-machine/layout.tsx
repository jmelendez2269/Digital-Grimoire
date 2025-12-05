import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Convergence Machine | Convergence",
  description: "Explore esoteric texts and wisdom traditions through multi-lens AI analysis. Discover hidden connections and insights across different perspectives.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Convergence Machine | Convergence",
    description: "Explore esoteric texts and wisdom traditions through multi-lens AI analysis. Discover hidden connections and insights across different perspectives.",
    type: "website",
    url: "https://www.convergencelibrary.com/convergence-machine",
    images: [
      {
        url: "https://www.convergencelibrary.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Machine - Multi-Lens AI Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Convergence Machine | Convergence",
    description: "Explore esoteric texts and wisdom traditions through multi-lens AI analysis.",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function ConvergenceMachineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

