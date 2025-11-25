import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Convergence",
  description: "Join Convergence - a multi-lens library and knowledge network where hidden wisdom reveals our unity. Create your account to start exploring esoteric texts, sacred writings, and wisdom traditions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

