import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | Convergence",
  description: "Cookie Policy for Convergence - Learn about how we use cookies",
  openGraph: {
    title: "Cookie Policy | Convergence",
    description: "Cookie Policy for Convergence - Learn about how we use cookies",
    type: "website",
    url: "https://projectparallax.xyz/cookies",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence Cookie Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Policy | Convergence",
    description: "Cookie Policy for Convergence - Learn about how we use cookies",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function CookiePolicyPage() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-4xl font-bold text-amber-100">Cookie Policy</h1>

        <div className="prose prose-invert prose-amber max-w-none">
          <p className="text-zinc-400">
            <strong>Last Updated:</strong> {currentDate}
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">1. What Are Cookies?</h2>
            <p className="text-zinc-300">
              Cookies are small text files that are placed on your device when you visit a website.
              They are widely used to make websites work more efficiently and provide information to
              the website owners.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">2. How We Use Cookies</h2>
            <p className="text-zinc-300">
              Convergence uses cookies to enhance your experience, analyze site usage, and assist in
              our marketing efforts. We use both session cookies (which expire when you close your browser)
              and persistent cookies (which stay on your device until they expire or are deleted).
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">3. Types of Cookies We Use</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">3.1 Essential Cookies</h3>
            <p className="text-zinc-300 mb-2">
              These cookies are necessary for the website to function and cannot be switched off.
              They are usually set in response to actions made by you, such as setting your privacy
              preferences, logging in, or filling in forms.
            </p>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 my-4">
              <p className="text-zinc-300 mb-2"><strong>Authentication Cookies (Supabase):</strong></p>
              <ul className="list-disc pl-6 text-zinc-300 space-y-1">
                <li><strong>Purpose:</strong> Maintain your login session</li>
                <li><strong>Duration:</strong> Session-based (expires when you log out)</li>
                <li><strong>Required:</strong> Yes - cannot disable</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">3.2 Analytics Cookies</h3>
            <p className="text-zinc-300 mb-2">
              These cookies help us understand how visitors interact with our website by collecting
              and reporting information anonymously.
            </p>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 my-4">
              <p className="text-zinc-300 mb-2"><strong>Vercel Analytics:</strong></p>
              <ul className="list-disc pl-6 text-zinc-300 space-y-1">
                <li><strong>Purpose:</strong> Understand how users interact with the service</li>
                <li><strong>Data Collected:</strong> Page views, navigation patterns (anonymized)</li>
                <li><strong>Duration:</strong> Varies</li>
                <li><strong>Required:</strong> No - can be disabled via browser settings</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">3.3 Local Storage</h3>
            <p className="text-zinc-300 mb-2">
              We also use browser local storage (similar to cookies) to store preferences:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li><strong>Text-to-Speech Preferences:</strong> Your TTS settings for each document</li>
              <li><strong>Wiki Link History:</strong> Recently activated wiki links for navigation</li>
              <li><strong>Reading Position:</strong> Temporary bookmarks for audio playback</li>
            </ul>
            <p className="text-zinc-300 mt-2">
              Local storage is stored on your device and can be cleared via browser settings.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">4. Managing Cookies</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.1 Browser Settings</h3>
            <p className="text-zinc-300 mb-2">
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Block all cookies</li>
              <li>Block third-party cookies</li>
              <li>Delete cookies when you close your browser</li>
              <li>Delete existing cookies</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong>Note:</strong> Blocking essential cookies may prevent the website from functioning properly.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.2 Cookie Consent Banner</h3>
            <p className="text-zinc-300">
              When you first visit our website, you'll see a cookie consent banner. You can choose to:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1 mt-2">
              <li><strong>Accept All:</strong> Accept all cookies (essential + analytics)</li>
              <li><strong>Essential Only:</strong> Only accept essential cookies</li>
              <li><strong>Cookie Settings:</strong> View detailed cookie information</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              Your preference is saved in your browser's local storage. You can change your preference
              at any time by clearing your browser data or contacting us.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">5. Third-Party Cookies</h2>
            <p className="text-zinc-300 mb-4">
              Some cookies are placed by third-party services that appear on our pages:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li><strong>Vercel:</strong> Analytics and performance monitoring</li>
              <li><strong>Supabase:</strong> Authentication and database services</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              These third parties may use cookies to collect information about your online activities
              across different websites. We do not control these cookies. Please refer to their privacy
              policies for more information.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">6. Changes to This Cookie Policy</h2>
            <p className="text-zinc-300">
              We may update this Cookie Policy from time to time. We will notify you of any changes
              by updating the "Last Updated" date at the top of this page. Your continued use of our
              website after any changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">7. Contact Us</h2>
            <p className="text-zinc-300 mb-4">
              If you have questions about our use of cookies, please contact us:
            </p>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-zinc-300">
                <strong>Service:</strong> Convergence<br />
                <strong>Contact:</strong>{" "}
                <a href="mailto:privacy@projectparallax.xyz" className="text-amber-400 hover:text-amber-300">
                  privacy@projectparallax.xyz
                </a>
              </p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm">
              This Cookie Policy is effective as of {currentDate} and applies to all users of the Convergence platform.
            </p>
            <div className="mt-4">
              <Link
                href="/privacy"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                ← Back to Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

