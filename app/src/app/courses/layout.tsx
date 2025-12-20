import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courses | Convergence | Multi-Lens Library & Knowledge Network",
  description: "Explore Convergence courses - foundational courses and rotating themes designed to deepen your understanding through multi-lens exploration.",
  openGraph: {
    title: "Courses | Convergence",
    description: "Explore Convergence courses - foundational courses and rotating themes designed to deepen your understanding.",
    type: "website",
    url: "https://www.convergencelibrary.com/courses",
    images: [
      {
        url: "https://www.convergencelibrary.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Courses - Foundational Courses & Rotating Themes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Courses | Convergence",
    description: "Explore Convergence courses - foundational courses and rotating themes.",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
