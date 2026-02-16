import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courses | Project Parallax | Multi-lens library and knowledge network",
  description: "Explore Project Parallax courses - foundational courses and rotating themes designed to deepen your understanding through multi-lens exploration.",
  openGraph: {
    title: "Courses | Project Parallax",
    description: "Explore Project Parallax courses - foundational courses and rotating themes designed to deepen your understanding.",
    type: "website",
    url: "https://projectparallax.xyz/courses",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax Courses - Foundational Courses & Rotating Themes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Courses | Project Parallax",
    description: "Explore Project Parallax courses - foundational courses and rotating themes.",
    images: ["https://projectparallax.xyz/og-image.png"],
  },
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
