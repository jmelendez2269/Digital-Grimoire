import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Project Parallax",
  description: "Privacy Policy for Project Parallax - How we collect, use, and protect your data",
  openGraph: {
    title: "Privacy Policy | Project Parallax",
    description: "Privacy Policy for Project Parallax - How we collect, use, and protect your data",
    type: "website",
    url: "https://www.projectparallax.io/privacy",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project Parallax - Multi-lens library and knowledge network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Project Parallax",
    description: "Privacy Policy for Project Parallax - How we collect, use, and protect your data",
    images: ["https://www.projectparallax.io/og-image.png"],
  },
};

export default function PrivacyPolicyPage() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-4xl font-bold text-amber-100">Privacy Policy</h1>

        <div className="prose prose-invert prose-amber max-w-none">
          <p className="text-zinc-400">
            <strong>Last Updated:</strong> {currentDate}<br />
            <strong>Effective Date:</strong> {currentDate}
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">1. Introduction</h2>
            <p className="text-zinc-300">
              Welcome to Project Parallax ("we," "our," or "us"). This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our digital library platform (the "Service").
            </p>
            <p className="text-zinc-300">
              By using our Service, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">2.1 Information You Provide Directly</h3>
            <p className="text-zinc-300 mb-2"><strong>Account Information:</strong></p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Email address (required for account creation)</li>
              <li>Username (optional)</li>
              <li>Display name (optional)</li>
              <li>Profile image/avatar (optional)</li>
              <li>Password (stored securely, hashed - we cannot see your password)</li>
            </ul>

            <p className="text-zinc-300 mb-2 mt-4"><strong>User-Generated Content:</strong></p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Documents you upload (PDFs, images, text files)</li>
              <li>Annotations and highlights you create</li>
              <li>Notes and journal entries</li>
              <li>Collections and bookmarks</li>
              <li>Reading progress and bookmarks</li>
              <li>Feedback submissions (bug reports, feature requests)</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">2.2 Information Collected Automatically</h3>
            <p className="text-zinc-300 mb-2"><strong>Usage Data:</strong></p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Document uploads, views, and interactions</li>
              <li>Search queries (to improve search functionality)</li>
              <li>Annotations and bookmarks created</li>
              <li>Reading progress and time spent</li>
              <li>API usage (for cost tracking and service optimization)</li>
            </ul>

            <p className="text-zinc-300 mb-2 mt-4"><strong>Technical Data:</strong></p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>IP address (collected by hosting provider for security)</li>
              <li>Browser type and version</li>
              <li>Device information (for responsive design)</li>
              <li>Session cookies (required for authentication)</li>
            </ul>

            <p className="text-zinc-300 mb-2 mt-4"><strong>Analytics:</strong></p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Page views and navigation patterns (via Vercel Analytics)</li>
              <li>Performance metrics (via Vercel Speed Insights)</li>
              <li>Error logs (for debugging and improvement)</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-zinc-300 mb-2">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li><strong>Provide and Improve the Service:</strong> Authenticate your account, store documents, process OCR, generate AI metadata, enable search, track reading progress</li>
              <li><strong>Service Operations:</strong> Monitor API usage and costs, track errors, analyze usage patterns, ensure security</li>
              <li><strong>Communication:</strong> Send verification emails, respond to feedback, send service updates (if you opt in)</li>
              <li><strong>Legal Compliance:</strong> Comply with applicable laws, respond to legal requests, protect our rights</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">4. Third-Party Services and Data Sharing</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.1 Service Providers</h3>
            <p className="text-zinc-300 mb-4">
              We use the following third-party services to operate the platform:
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-zinc-700">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-amber-200">Service</th>
                    <th className="px-4 py-2 text-left text-amber-200">Purpose</th>
                    <th className="px-4 py-2 text-left text-amber-200">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">Supabase</td>
                    <td className="px-4 py-2">Database & Authentication</td>
                    <td className="px-4 py-2">Account data, user content</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">Cloudflare R2</td>
                    <td className="px-4 py-2">File Storage</td>
                    <td className="px-4 py-2">Uploaded documents</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">Azure Computer Vision</td>
                    <td className="px-4 py-2">OCR Processing</td>
                    <td className="px-4 py-2">Document images/pages</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">Anthropic (Claude)</td>
                    <td className="px-4 py-2">AI Metadata Extraction</td>
                    <td className="px-4 py-2">Document content snippets</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">OpenAI (GPT)</td>
                    <td className="px-4 py-2">AI Chat & Analysis</td>
                    <td className="px-4 py-2">Chat messages, document content</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">Google (Gemini)</td>
                    <td className="px-4 py-2">AI Chat & Analysis</td>
                    <td className="px-4 py-2">Chat messages, document content</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">Replicate</td>
                    <td className="px-4 py-2">Cover Image Generation</td>
                    <td className="px-4 py-2">Document metadata</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">Vercel</td>
                    <td className="px-4 py-2">Hosting & Analytics</td>
                    <td className="px-4 py-2">Usage analytics, performance data</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">SendGrid</td>
                    <td className="px-4 py-2">Email Delivery</td>
                    <td className="px-4 py-2">Email addresses, email content</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.2 AI Service Data Processing</h3>
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-semibold mb-2">⚠️ Important:</p>
              <p className="text-zinc-300">
                When you use AI features (chat, metadata extraction), your content is sent to third-party AI providers
                (Anthropic, OpenAI, Google). These services process your content to generate responses and may temporarily
                store it for processing. They do NOT use your content to train their models (based on their current policies).
              </p>
              <p className="text-zinc-300 mt-2">
                <strong>We recommend:</strong> Avoid uploading highly sensitive personal information in documents that will be processed by AI.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.3 Data Sharing Policy</h3>
            <p className="text-zinc-300 mb-2"><strong>We do NOT:</strong></p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Sell your personal information to third parties</li>
              <li>Share your data with advertisers</li>
              <li>Use your content for marketing purposes without consent</li>
            </ul>
            <p className="text-zinc-300 mb-2 mt-4"><strong>We may share data:</strong></p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>With service providers necessary to operate the platform (listed above)</li>
              <li>If required by law or legal process</li>
              <li>To protect our rights or prevent harm</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">5. Cookies and Tracking Technologies</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">5.1 Essential Cookies</h3>
            <p className="text-zinc-300 mb-2"><strong>Authentication Cookies:</strong></p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Purpose: Maintain your login session</li>
              <li>Duration: Session-based (expires when you log out)</li>
              <li>Provider: Supabase</li>
              <li>Required: Yes (cannot disable - required for service)</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">5.2 Analytics Cookies</h3>
            <p className="text-zinc-300 mb-2"><strong>Vercel Analytics:</strong></p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Purpose: Understand how users interact with the service</li>
              <li>Data: Page views, navigation patterns (anonymized)</li>
              <li>Duration: Varies</li>
              <li>Required: No (can be disabled via browser settings)</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">5.3 Local Storage</h3>
            <p className="text-zinc-300">
              We use browser local storage for text-to-speech preferences, wiki link activation history,
              and reading position bookmarks. Local storage is stored on your device and can be cleared via browser settings.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">6. Data Storage and Security</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">6.1 Where Your Data is Stored</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li><strong>Account Data & User Content:</strong> Supabase (PostgreSQL database)</li>
              <li><strong>Uploaded Documents:</strong> Cloudflare R2 (object storage)</li>
              <li><strong>Analytics Data:</strong> Vercel (hosting provider)</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">6.2 Security Measures</h3>
            <p className="text-zinc-300 mb-2">We implement security measures to protect your data:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li><strong>Encryption:</strong> Data in transit (HTTPS/TLS)</li>
              <li><strong>Authentication:</strong> Secure password hashing (bcrypt)</li>
              <li><strong>Access Controls:</strong> Row-level security policies in database</li>
              <li><strong>Regular Updates:</strong> Security patches and updates</li>
              <li><strong>Monitoring:</strong> Error tracking and security monitoring</li>
            </ul>
            <p className="text-zinc-300 mt-4 italic">
              However: No method of electronic transfer over the internet is 100% secure. While we strive to protect your data,
              we cannot guarantee absolute security.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">6.3 Data Retention</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li><strong>Account Data:</strong> Retained until you delete your account</li>
              <li><strong>User Content:</strong> Retained until you delete it or your account</li>
              <li><strong>Usage Analytics:</strong> Aggregated data retained for up to 2 years</li>
              <li><strong>Error Logs:</strong> Retained for up to 90 days</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong>Account Deletion:</strong> When you delete your account, we will delete your personal information
              and user-generated content within 30 days, except where we are required to retain it by law.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">7. Your Rights and Choices</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">7.1 Access and Control</h3>
            <p className="text-zinc-300 mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct your account information</li>
              <li><strong>Deletion:</strong> Delete your account and associated data</li>
              <li><strong>Export:</strong> Export your data (annotations, collections, etc.)</li>
              <li><strong>Opt-Out:</strong> Disable analytics cookies via browser settings</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">7.2 How to Exercise Your Rights</h3>
            <p className="text-zinc-300 mb-2"><strong>To access, update, or delete your data:</strong></p>
            <ol className="list-decimal pl-6 text-zinc-300 space-y-1">
              <li>Log into your account</li>
              <li>Go to your profile settings</li>
              <li>Navigate to Privacy Settings, or</li>
              <li>Contact us at: <a href="mailto:privacy@digitalgrimoire.io" className="text-amber-400 hover:text-amber-300">privacy@digitalgrimoire.io</a></li>
            </ol>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">7.3 GDPR Rights (EU Users)</h3>
            <p className="text-zinc-300">
              If you are in the European Union, you have additional rights: right to data portability, right to object
              to processing, right to restrict processing, and right to lodge a complaint with a supervisory authority.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">7.4 CCPA Rights (California Users)</h3>
            <p className="text-zinc-300">
              If you are a California resident, you have the right to know what personal information is collected,
              know if personal information is sold or disclosed (we do not sell data), opt-out of the sale of personal
              information, and non-discrimination for exercising your rights.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">8. Children's Privacy</h2>
            <p className="text-zinc-300">
              Our Service is not intended for children under 13 years of age. We do not knowingly collect personal
              information from children under 13. If you are a parent or guardian and believe your child has provided
              us with personal information, please contact us immediately at{" "}
              <a href="mailto:privacy@digitalgrimoire.io" className="text-amber-400 hover:text-amber-300">
                privacy@digitalgrimoire.io
              </a>.
            </p>
            <p className="text-zinc-300 mt-2">
              If we discover we have collected information from a child under 13, we will delete that information promptly.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">9. International Data Transfers</h2>
            <p className="text-zinc-300">
              Your information may be transferred to and processed in countries other than your country of residence.
              These countries may have data protection laws that differ from those in your country.
            </p>
            <p className="text-zinc-300 mt-2">
              By using our Service, you consent to the transfer of your information to these countries. We ensure
              appropriate safeguards are in place when transferring data internationally, including standard contractual
              clauses, adequacy decisions, and vendor privacy certifications.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-zinc-300">
              We may update this Privacy Policy from time to time. We will notify you of any changes by:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1 mt-2">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "Last Updated" date</li>
              <li>Sending an email notification (for material changes)</li>
              <li>Displaying a notice in the application (for significant changes)</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong>Your continued use of the Service after changes become effective constitutes acceptance of the updated policy.</strong>
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">11. Contact Us</h2>
            <p className="text-zinc-300 mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-zinc-300">
                <strong>Service:</strong> Project Parallax<br />
                <strong>Contact:</strong>{" "}
                <a href="mailto:privacy@projectparallax.io" className="text-amber-400 hover:text-amber-300">
                  privacy@projectparallax.io
                </a>
                <br />
                <strong>Operated by:</strong> Jeanine Melendez
              </p>
              <p className="text-zinc-400 text-sm mt-2">
                For privacy-specific inquiries, please use the subject line: "Privacy Inquiry"
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">12. Additional Information</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">12.1 Data Controller</h3>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-zinc-300">
                <strong>Service:</strong> Project Parallax<br />
                <strong>Operated by:</strong> Jeanine Melendez<br />
                <strong>Contact Email:</strong>{" "}
                <a href="mailto:privacy@projectparallax.io" className="text-amber-400 hover:text-amber-300">
                  privacy@projectparallax.io
                </a>
              </p>
              <p className="text-zinc-400 text-sm mt-2 italic">
                Note: This service is operated by an individual. For privacy inquiries, please contact us at the email address above.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">12.2 Supervisory Authority (EU Users)</h3>
            <p className="text-zinc-300">
              If you are in the EU and have concerns about our data practices, you can contact your local data protection authority.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">13. Affiliate Link Disclosure</h2>
            <p className="text-zinc-300">
              Project Parallax participates in the Amazon Services LLC Associates Program, an affiliate advertising program
              designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com.
            </p>
            <p className="text-zinc-300 mt-4">
              As an Amazon Associate, we earn from qualifying purchases. This means that when you click on certain
              links to products on Amazon and make a purchase, we may receive a small commission at no additional cost to you.
              This helps support the maintenance and development of the Project Parallax platform.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm">
              This Privacy Policy is effective as of {currentDate} and applies to all users of the Project Parallax platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

