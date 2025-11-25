import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Convergence",
  description: "Sign in to Convergence to access your personal library, digital grimoire, and explore esoteric texts and wisdom traditions through AI-powered analysis.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

