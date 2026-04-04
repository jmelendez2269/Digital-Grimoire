import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge Graph | Prismarium",
  description: "Explore the interconnected knowledge graph of concepts, entities, and relationships discovered across esoteric texts and wisdom traditions.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Knowledge Graph | Prismarium",
    description: "Explore the interconnected knowledge graph of concepts, entities, and relationships discovered across esoteric texts and wisdom traditions.",
    type: "website",
    url: "https://projectparallax.xyz/graph",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium Knowledge Graph",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowledge Graph | Prismarium",
    description: "Explore the interconnected knowledge graph of concepts and relationships.",
    images: ["https://projectparallax.xyz/og-image.png"],
  },
};

export default function GraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

