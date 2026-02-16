import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Project Parallax",
  description: "Sign in to Project Parallax to access your personal library, digital grimoire, and explore esoteric texts and wisdom traditions through AI-powered analysis.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Sign In | Project Parallax",
    description: "Sign in to Project Parallax to access your personal library, digital grimoire, and explore esoteric texts and wisdom traditions through AI-powered analysis.",
    type: "website",
    url: "https://projectparallax.xyz/login",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax Sign In",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In | Project Parallax",
    description: "Sign in to Project Parallax to access your personal library and digital grimoire.",
    images: ["https://projectparallax.xyz/og-image.png"],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

