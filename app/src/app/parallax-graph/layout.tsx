import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Course Knowledge Graph | Prismarium",
  description: "Explore concepts, works, people, and typed connections extracted from completed Prismarium courses.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Course Knowledge Graph | Prismarium",
    description: "Explore concepts, works, people, and typed connections extracted from completed Prismarium courses.",
    type: "website",
    url: "/parallax-graph",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium Course Knowledge Graph",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Course Knowledge Graph | Prismarium",
    description: "Explore concepts, works, people, and typed connections extracted from completed courses.",
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
