import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Digital Grimoire | Convergence",
  description: "Your personal digital grimoire - Create, organize, and explore your notes, annotations, and insights from esoteric texts and wisdom traditions.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Digital Grimoire | Convergence",
    description: "Your personal digital grimoire - Create, organize, and explore your notes, annotations, and insights from esoteric texts and wisdom traditions.",
    type: "website",
    url: "https://www.convergencelibrary.com/journal",
    images: [
      {
        url: "https://www.convergencelibrary.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Digital Grimoire",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Digital Grimoire | Convergence",
    description: "Your personal digital grimoire - Create, organize, and explore your notes and insights.",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

