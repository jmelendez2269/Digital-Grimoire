import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library | Convergence | Multi-Lens Library & Knowledge Network",
  description: "Browse and explore the Convergence Library - a curated collection of esoteric texts, sacred writings, and wisdom traditions from across cultures and time periods. Discover hidden wisdom through AI-powered analysis.",
  openGraph: {
    title: "Library | Convergence",
    description: "Browse and explore the Convergence Library - a curated collection of esoteric texts, sacred writings, and wisdom traditions.",
    type: "website",
    url: "https://www.convergencelibrary.com/library",
    images: [
      {
        url: "https://www.convergencelibrary.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Library - Esoteric Texts & Wisdom Traditions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Library | Convergence",
    description: "Browse and explore the Convergence Library - a curated collection of esoteric texts and wisdom traditions.",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

