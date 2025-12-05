import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Convergence",
  description: "Manage your Convergence profile, subscription, and preferences",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Profile | Convergence",
    description: "Manage your Convergence profile, subscription, and preferences",
    type: "website",
    url: "https://www.convergencelibrary.com/profile",
    images: [
      {
        url: "https://www.convergencelibrary.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Profile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Profile | Convergence",
    description: "Manage your Convergence profile, subscription, and preferences",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

