import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | Prismarium | Multi-Lens Library & Knowledge Network",
  description: "Welcome to Prismarium - A multi-lens library and knowledge network where hidden wisdom reveals our unity. Explore esoteric texts, sacred writings, and wisdom traditions through AI-powered analysis.",
  openGraph: {
    title: "Prismarium | Multi-Lens Library & Knowledge Network",
    description: "A multi-lens library and knowledge network where hidden wisdom reveals our unity. Explore esoteric texts, sacred writings, and wisdom traditions through AI-powered analysis.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium - Multi-Lens Library & Knowledge Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prismarium | Multi-Lens Library & Knowledge Network",
    description: "A multi-lens library and knowledge network where hidden wisdom reveals our unity.",
    images: ["/og-image.png"],
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

