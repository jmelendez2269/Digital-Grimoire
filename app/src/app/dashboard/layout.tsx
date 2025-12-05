import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Dashboard | Convergence",
  description: "Your Convergence dashboard - Access your personal library, digital grimoire, and explore esoteric texts through AI-powered analysis.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Dashboard | Convergence",
    description: "Your Convergence dashboard - Access your personal library and digital grimoire.",
    type: "website",
    url: "https://www.convergencelibrary.com/dashboard",
    images: [
      {
        url: "https://www.convergencelibrary.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashboard | Convergence",
    description: "Your Convergence dashboard - Access your personal library and digital grimoire.",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

