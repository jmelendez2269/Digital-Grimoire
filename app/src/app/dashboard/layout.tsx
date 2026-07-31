import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Member home | Prismarium",
  description:
    "Return to your shared course path, saved reading, Study Journal, and the questions you are following in Prismarium.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Member home | Prismarium",
    description:
      "Return to your shared course path, saved reading, and Study Journal.",
    type: "website",
    url: "/dashboard",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium member home",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Member home | Prismarium",
    description:
      "Return to your shared course path, saved reading, and Study Journal.",
    images: ["/og-image.png"],
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
