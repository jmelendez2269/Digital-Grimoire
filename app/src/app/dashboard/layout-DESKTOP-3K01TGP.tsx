import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Dashboard | Project Parallax",
  description: "Your Project Parallax dashboard - Access your personal library, journal, and explore esoteric texts through AI-powered analysis.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Dashboard | Project Parallax",
    description: "Your Project Parallax dashboard - Access your personal library and journal.",
    type: "website",
    url: "https://www.projectparallax.io/dashboard",
    images: [
      {
        url: "https://www.projectparallax.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashboard | Project Parallax",
    description: "Your Project Parallax dashboard - Access your personal library and journal.",
    images: ["https://www.projectparallax.io/og-image.png"],
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

