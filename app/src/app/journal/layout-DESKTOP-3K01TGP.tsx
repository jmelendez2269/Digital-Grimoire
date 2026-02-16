import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journal | Project Parallax",
  description: "Your personal journal - Create, organize, and explore your notes, annotations, and insights from esoteric texts and wisdom traditions.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Journal | Project Parallax",
    description: "Your personal journal - Create, organize, and explore your notes, annotations, and insights from esoteric texts and wisdom traditions.",
    type: "website",
    url: "https://www.projectparallax.io/journal",
    images: [
      {
        url: "https://www.projectparallax.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax Journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Journal | Project Parallax",
    description: "Your personal journal - Create, organize, and explore your notes and insights.",
    images: ["https://www.projectparallax.io/og-image.png"],
  },
};

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

