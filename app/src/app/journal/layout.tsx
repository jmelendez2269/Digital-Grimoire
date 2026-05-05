import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Journal | Prismarium",
  description: "Your personal study journal in Prismarium - Create, organize, and explore your notes, annotations, and insights from esoteric texts and wisdom traditions.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Study Journal | Prismarium",
    description: "Your personal study journal in Prismarium - Create, organize, and explore your notes, annotations, and insights from esoteric texts and wisdom traditions.",
    type: "website",
    url: "/journal",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium Study Journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Study Journal | Prismarium",
    description: "Your personal study journal in Prismarium - Create, organize, and explore your notes and insights.",
    images: ["/og-image.png"],
  },
};

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
