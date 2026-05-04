import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courses | Prismarium | Multi-lens library and knowledge network",
  description: "Explore Prismarium courses - foundational courses and rotating themes designed to deepen your understanding through multi-lens exploration.",
  openGraph: {
    title: "Courses | Prismarium",
    description: "Explore Prismarium courses - foundational courses and rotating themes designed to deepen your understanding.",
    type: "website",
    url: "/courses",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium Courses - Foundational Courses & Rotating Themes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Courses | Prismarium",
    description: "Explore Prismarium courses - foundational courses and rotating themes.",
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
