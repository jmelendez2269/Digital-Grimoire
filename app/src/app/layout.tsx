import type { Metadata } from "next";
import { Inter, Cormorant_Garamond, Fira_Code, DM_Sans, Playfair_Display, JetBrains_Mono, Cinzel } from "next/font/google";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ReactQueryProvider } from "@/lib/react-query";
import { getAbsoluteUrl, getAppUrl } from "@/lib/utils";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-mono",
  display: "swap",
  preload: true,
});

// Prismarium brand fonts
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "600"],
  display: "swap",
});

const appUrl = getAppUrl();
const ogImageUrl = getAbsoluteUrl("/og-image.png");

export const metadata: Metadata = {
  title: "Prismarium — A place to keep learning",
  description:
    "Explore religion, mythology, mysticism, philosophy, science, symbolism, consciousness, and other big questions through shared course paths and tools for building your own understanding.",
  metadataBase: new URL(appUrl),
  keywords: [
    "religion",
    "mythology",
    "mysticism",
    "philosophy",
    "science",
    "symbolism",
    "consciousness",
    "courses",
    "digital library",
    "Prismarium",
  ],
  authors: [{ name: "Prismarium" }],
  creator: "Prismarium",
  publisher: "Prismarium",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "Prismarium",
    title: "Prismarium — A place to keep learning",
    description:
      "Explore big questions through shared course paths, a growing Library, Seven Lenses, Concept Search, a Knowledge Graph, and your own Study Journal.",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Prismarium — A place to keep learning",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prismarium — A place to keep learning",
    description:
      "A place for curious people to read, compare, question, and build their own understanding.",
    images: [ogImageUrl],
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Prismarium",
    url: appUrl,
    description:
      "A place to explore big questions through shared course paths, a growing Library, Seven Lenses, Concept Search, a Knowledge Graph, and a private Study Journal.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cormorant.variable} ${firaCode.variable} ${dmSans.variable} ${playfair.variable} ${jetbrainsMono.variable} ${cinzel.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
          <script
            defer
            src='https://static.cloudflareinsights.com/beacon.min.js'
            data-cf-beacon='{"token": "86053cf09b4a4aea94dfc87aa44ff19c"}'
          />
        )}
      </body>
    </html>
  );
}
