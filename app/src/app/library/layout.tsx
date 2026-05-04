import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library | Prismarium | Multi-lens library and knowledge network",
  description: "Browse and explore the Prismarium - a curated collection of esoteric texts, sacred writings, and wisdom traditions from across cultures and time periods. Discover hidden wisdom through AI-powered analysis.",
  openGraph: {
    title: "Library | Prismarium",
    description: "Browse and explore the Prismarium - a curated collection of esoteric texts, sacred writings, and wisdom traditions.",
    type: "website",
    url: "/library",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium - Esoteric Texts & Wisdom Traditions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Library | Prismarium",
    description: "Browse and explore the Prismarium - a curated collection of esoteric texts and wisdom traditions.",
    images: ["/og-image.png"],
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

