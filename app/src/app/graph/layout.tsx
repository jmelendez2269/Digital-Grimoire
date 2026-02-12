import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge Graph | Project Parallax",
  description: "Explore the interconnected knowledge graph of concepts, entities, and relationships discovered across esoteric texts and wisdom traditions.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Knowledge Graph | Project Parallax",
    description: "Explore the interconnected knowledge graph of concepts, entities, and relationships discovered across esoteric texts and wisdom traditions.",
    type: "website",
    url: "https://www.projectparallax.io/graph",
    images: [
      {
        url: "https://www.projectparallax.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax Knowledge Graph",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowledge Graph | Project Parallax",
    description: "Explore the interconnected knowledge graph of concepts and relationships.",
    images: ["https://www.projectparallax.io/og-image.png"],
  },
};

export default function GraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

