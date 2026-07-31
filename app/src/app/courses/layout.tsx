import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courses | Prismarium",
  description: "Follow shared Prismarium course paths built for reading, comparison, and open-ended inquiry.",
  openGraph: {
    title: "Courses | Prismarium",
    description: "Follow shared course paths built for reading, comparison, and open-ended inquiry.",
    type: "website",
    url: "/courses",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium courses — shared paths for open-ended inquiry",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Courses | Prismarium",
    description: "Follow shared course paths through questions, reading, and comparison.",
    images: ["/og-image.png"],
  },
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
