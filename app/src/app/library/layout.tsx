import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library | Prismarium",
  description:
    "Read across religion, mythology, mysticism, philosophy, science, symbolism, consciousness, and related fields in the Prismarium Library.",
  openGraph: {
    title: "Library | Prismarium",
    description:
      "Start with a book or follow a question across the Prismarium Library.",
    type: "website",
    url: "/library",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Prismarium Library",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Library | Prismarium",
    description:
      "Start with a book or follow a question across the Prismarium Library.",
    images: ["/og-image.png"],
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

