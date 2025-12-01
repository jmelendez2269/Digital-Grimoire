import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ReactQueryProvider } from "@/lib/react-query";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Prevents FOIT (Flash of Invisible Text)
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "Convergence | Multi-Lens Library & Knowledge Network",
  description: "A multi-lens library and knowledge network where hidden wisdom reveals our unity. Explore esoteric texts, sacred writings, and wisdom traditions through AI-powered analysis.",
  keywords: ["esoteric texts", "sacred writings", "wisdom traditions", "knowledge network", "digital library", "hermeticism", "spiritual texts", "AI analysis"],
  authors: [{ name: "Convergence Library" }],
  creator: "Convergence Library",
  publisher: "Convergence Library",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.convergencelibrary.com",
    siteName: "Convergence",
    title: "Convergence | Multi-Lens Library & Knowledge Network",
    description: "A multi-lens library and knowledge network where hidden wisdom reveals our unity. Explore esoteric texts, sacred writings, and wisdom traditions through AI-powered analysis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Convergence | Multi-Lens Library & Knowledge Network",
    description: "A multi-lens library and knowledge network where hidden wisdom reveals our unity.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add Google Search Console verification when available
    // google: "your-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ReactQueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReactQueryProvider>
        <Toaster theme="dark" position="bottom-right" richColors />
        <SpeedInsights />
        <Analytics />
        <CookieConsent />
      </body>
    </html>
  );
}
