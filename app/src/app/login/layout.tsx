import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Convergence",
  description: "Sign in to Convergence to access your personal library, digital grimoire, and explore esoteric texts and wisdom traditions through AI-powered analysis.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Sign In | Convergence",
    description: "Sign in to Convergence to access your personal library, digital grimoire, and explore esoteric texts and wisdom traditions through AI-powered analysis.",
    type: "website",
    url: "https://www.convergencelibrary.com/login",
    images: [
      {
        url: "https://www.convergencelibrary.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Sign In",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In | Convergence",
    description: "Sign in to Convergence to access your personal library and digital grimoire.",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

