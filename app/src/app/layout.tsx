import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ReactQueryProvider } from "@/lib/react-query";
import CookieConsent from "@/components/CookieConsent";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Prevents FOIT (Flash of Invisible Text)
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: "Project Parallax | The Plurality of Knowing",
  description: "A synthesis-driven learning platform for understanding the universe through the integration of hidden wisdom. Explore truth through multiple analytical lenses in Project Parallax.",
  keywords: ["Project Parallax", "Parallax Engine", "plurality of knowing", "synthesis", "multi-lens analysis", "wisdom traditions", "knowledge network", "AI reasoning"],
  authors: [{ name: "Project Parallax Team" }],
  creator: "Project Parallax",
  publisher: "Project Parallax",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.projectparallax.io",
    siteName: "Project Parallax",
    title: "Project Parallax | The Plurality of Knowing",
    description: "A synthesis-driven learning platform for understanding the universe through the integration of hidden wisdom.",
    images: [
      {
        url: "https://www.projectparallax.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax - The Plurality of Knowing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Parallax | The Plurality of Knowing",
    description: "A synthesis-driven learning platform for understanding the universe through the integration of hidden wisdom.",
    images: ["https://www.projectparallax.io/og-image.png"],
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
        {/* Cloudflare Web Analytics */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            defer
            src='https://static.cloudflareinsights.com/beacon.min.js'
            data-cf-beacon='{"token": "86053cf09b4a4aea94dfc87aa44ff19c"}'
          />
        )}
      </body>
    </html>
  );
}
