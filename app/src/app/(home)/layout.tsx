import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | Convergence | Multi-Lens Library & Knowledge Network",
  description: "Welcome to Convergence - A multi-lens library and knowledge network where hidden wisdom reveals our unity. Explore esoteric texts, sacred writings, and wisdom traditions through AI-powered analysis.",
  openGraph: {
    title: "Convergence | Multi-Lens Library & Knowledge Network",
    description: "A multi-lens library and knowledge network where hidden wisdom reveals our unity. Explore esoteric texts, sacred writings, and wisdom traditions through AI-powered analysis.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Convergence | Multi-Lens Library & Knowledge Network",
    description: "A multi-lens library and knowledge network where hidden wisdom reveals our unity.",
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

