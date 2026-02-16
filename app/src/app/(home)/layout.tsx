import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | Project Parallax | Multi-Lens Library & Knowledge Network",
  description: "Welcome to Project Parallax - A multi-lens library and knowledge network where hidden wisdom reveals our unity. Explore esoteric texts, sacred writings, and wisdom traditions through AI-powered analysis.",
  openGraph: {
    title: "Project Parallax | Multi-Lens Library & Knowledge Network",
    description: "A multi-lens library and knowledge network where hidden wisdom reveals our unity. Explore esoteric texts, sacred writings, and wisdom traditions through AI-powered analysis.",
    type: "website",
    url: "https://projectparallax.xyz",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax - Multi-Lens Library & Knowledge Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Parallax | Multi-Lens Library & Knowledge Network",
    description: "A multi-lens library and knowledge network where hidden wisdom reveals our unity.",
    images: ["https://projectparallax.xyz/og-image.png"],
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

