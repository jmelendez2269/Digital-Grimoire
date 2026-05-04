import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Prismarium",
  description: "Sign in to Prismarium to access your personal library, digital grimoire, and explore esoteric texts and wisdom traditions through AI-powered analysis.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Sign In | Prismarium",
    description: "Sign in to Prismarium to access your personal library, digital grimoire, and explore esoteric texts and wisdom traditions through AI-powered analysis.",
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
    description: "Sign in to Prismarium to access your personal library and digital grimoire.",
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

