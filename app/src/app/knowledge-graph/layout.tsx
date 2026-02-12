import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge Graph | Project Parallax",
  description: "Explore the interconnected knowledge graph of concepts, entities, and relationships discovered across esoteric texts and wisdom traditions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function KnowledgeGraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
