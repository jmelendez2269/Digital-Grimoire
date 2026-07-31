import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prismarium — A place to keep learning",
  description:
    "A place to explore religion, mythology, mysticism, philosophy, science, symbolism, consciousness, and other big questions through shared course paths, a growing Library, Seven Lenses, Concept Search, a Knowledge Graph, and your own Study Journal.",
  openGraph: {
    title: "Prismarium — A place to keep learning",
    description:
      "Explore big questions through shared course paths, a growing Library, Seven Lenses, Concept Search, a Knowledge Graph, and your own Study Journal.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium — A place to keep learning",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prismarium — A place to keep learning",
    description:
      "Explore big questions through shared course paths and tools for building your own understanding.",
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

