import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Prismarium",
  description:
    "Join Prismarium to explore shared course paths, read across the Library, compare perspectives, follow connections, and keep a private Study Journal.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Create Account | Prismarium",
    description:
      "Join Prismarium to explore shared course paths and build your own understanding.",
    type: "website",
    url: "/register",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium Create Account",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Account | Prismarium",
    description:
      "Join Prismarium to explore shared course paths and build your own understanding.",
    images: ["/og-image.png"],
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

