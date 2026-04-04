import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Prismarium",
  description: "Manage your Prismarium profile, subscription, and preferences",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Profile | Prismarium",
    description: "Manage your Prismarium profile, subscription, and preferences",
    type: "website",
    url: "https://projectparallax.xyz/profile",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium Profile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Profile | Prismarium",
    description: "Manage your Prismarium profile, subscription, and preferences",
    images: ["https://projectparallax.xyz/og-image.png"],
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

