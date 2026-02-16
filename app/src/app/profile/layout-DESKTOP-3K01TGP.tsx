import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Project Parallax",
  description: "Manage your Project Parallax profile, subscription, and preferences",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Profile | Project Parallax",
    description: "Manage your Project Parallax profile, subscription, and preferences",
    type: "website",
    url: "https://www.projectparallax.io/profile",
    images: [
      {
        url: "https://www.projectparallax.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax - Multi-lens library and knowledge network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Profile | Project Parallax",
    description: "Manage your Project Parallax profile, subscription, and preferences",
    images: ["https://www.projectparallax.io/og-image.png"],
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

