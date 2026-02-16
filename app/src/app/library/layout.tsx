import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library | Project Parallax | Multi-lens library and knowledge network",
  description: "Browse and explore the Project Parallax - a curated collection of esoteric texts, sacred writings, and wisdom traditions from across cultures and time periods. Discover hidden wisdom through AI-powered analysis.",
  openGraph: {
    title: "Library | Project Parallax",
    description: "Browse and explore the Project Parallax - a curated collection of esoteric texts, sacred writings, and wisdom traditions.",
    type: "website",
    url: "https://projectparallax.xyz/library",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax - Esoteric Texts & Wisdom Traditions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Library | Project Parallax",
    description: "Browse and explore the Project Parallax - a curated collection of esoteric texts and wisdom traditions.",
    images: ["https://projectparallax.xyz/og-image.png"],
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

