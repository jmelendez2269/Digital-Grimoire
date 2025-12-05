import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge Graph | Convergence",
  description: "Explore the interconnected knowledge graph of concepts, entities, and relationships discovered across esoteric texts and wisdom traditions.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Knowledge Graph | Convergence",
    description: "Explore the interconnected knowledge graph of concepts, entities, and relationships discovered across esoteric texts and wisdom traditions.",
    type: "website",
    url: "https://www.convergencelibrary.com/graph",
    images: [
      {
        url: "https://www.convergencelibrary.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Knowledge Graph",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowledge Graph | Convergence",
    description: "Explore the interconnected knowledge graph of concepts and relationships.",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function GraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

