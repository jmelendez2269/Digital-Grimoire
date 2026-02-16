import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Project Parallax",
  description: "Join Project Parallax - a multi-lens library and knowledge network where hidden wisdom reveals our unity. Create your account to start exploring esoteric texts, sacred writings, and wisdom traditions.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Create Account | Project Parallax",
    description: "Join Project Parallax - a multi-lens library and knowledge network where hidden wisdom reveals our unity. Create your account to start exploring esoteric texts, sacred writings, and wisdom traditions.",
    type: "website",
    url: "https://projectparallax.xyz/register",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax Create Account",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Account | Project Parallax",
    description: "Join Project Parallax - a multi-lens library and knowledge network where hidden wisdom reveals our unity.",
    images: ["https://projectparallax.xyz/og-image.png"],
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

