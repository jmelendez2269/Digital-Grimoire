import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Prismarium",
  description:
    "Log in to Prismarium to return to your course paths, saved reading, Study Journal, and the questions you are following.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Sign In | Prismarium",
    description:
      "Log in to Prismarium to return to your course paths, saved reading, and Study Journal.",
    type: "website",
    url: "/login",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium Sign In",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In | Prismarium",
    description:
      "Log in to Prismarium to return to your course paths, saved reading, and Study Journal.",
    images: ["/og-image.png"],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

