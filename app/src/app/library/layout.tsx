import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library | Project Parallax | Multi-Lens Library & Knowledge Network",
  description: "Browse and explore Project Parallax Library - a curated collection of esoteric texts, sacred writings, and wisdom traditions from across cultures and time periods. Discover hidden wisdom through AI-powered analysis.",
  openGraph: {
    title: "Library | Project Parallax",
    description: "Browse and explore Project Parallax Library - a curated collection of esoteric texts, sacred writings, and wisdom traditions.",
    type: "website",
    url: "https://www.projectparallax.io/library",
    images: [
      {
        url: "https://www.projectparallax.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax Library - Esoteric Texts & Wisdom Traditions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Library | Project Parallax",
    description: "Browse and explore Project Parallax Library - a curated collection of esoteric texts and wisdom traditions.",
    images: ["https://www.projectparallax.io/og-image.png"],
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

