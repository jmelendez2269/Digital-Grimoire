import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "License | Prismarium",
  description: "License information for Prismarium - Software, documentation, and content licensing",
  openGraph: {
    title: "License | Prismarium",
    description: "License information for Prismarium - Software, documentation, and content licensing",
    type: "website",
    url: "https://prismarium.xyz/license",
    images: [
      {
        url: "https://prismarium.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismarium License",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "License | Prismarium",
    description: "License information for Prismarium - Software, documentation, and content licensing",
    images: ["https://prismarium.xyz/og-image.png"],
  },
};

export default function LicensePage() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-4xl font-bold text-amber-100">License</h1>

        <div className="prose prose-invert prose-amber max-w-none">
          <p className="text-zinc-400">
            <strong>Last Updated:</strong> {currentDate}
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">1. Overview</h2>
            <p className="text-zinc-300">
              This page outlines the licensing terms for different components of Prismarium, a Project Parallax product,
              including software code, documentation, and content. Different parts of the Prismarium service are
              licensed under different terms.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">2. Software Code License</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">2.1 Source Code</h3>
            <p className="text-zinc-300 mb-4">
              The Prismarium platform source code is licensed under the <strong>MIT License</strong>.
            </p>

            <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700 my-4">
              <h4 className="text-lg font-semibold text-amber-200 mb-3">MIT License</h4>
              <p className="text-zinc-300 text-sm mb-2">
                Copyright (c) {new Date().getFullYear()} Prismarium
              </p>
              <p className="text-zinc-300 text-sm mb-4">
                Permission is hereby granted, free of charge, to any person obtaining a copy
                of this software and associated documentation files (the "Software"), to deal
                in the Software without restriction, including without limitation the rights
                to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                copies of the Software, and to permit persons to whom the Software is
                furnished to do so, subject to the following conditions:
              </p>
              <p className="text-zinc-300 text-sm mb-2">
                The above copyright notice and this permission notice shall be included in all
                copies or substantial portions of the Software.
              </p>
              <p className="text-zinc-300 text-sm">
                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                SOFTWARE.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">2.2 What This Means</h3>
            <p className="text-zinc-300 mb-2">You are free to:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Use the code for commercial or private purposes</li>
              <li>Modify the code to suit your needs</li>
              <li>Distribute the code</li>
              <li>Sublicense the code</li>
              <li>Use the code privately</li>
            </ul>
            <p className="text-zinc-300 mb-2 mt-4">You must:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Include the original copyright notice and license</li>
              <li>Include a copy of the MIT License</li>
            </ul>
            <p className="text-zinc-300 mb-2 mt-4">You cannot:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Hold the authors liable for damages</li>
              <li>Use the authors' names to promote your products without permission</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">3. Documentation License</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">3.1 Planning and Development Documentation</h3>
            <p className="text-zinc-300 mb-4">
              Planning documentation, development guides, and project documentation are licensed under the
              <strong> Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0)</strong>.
            </p>

            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 my-4">
              <p className="text-zinc-300 mb-2"><strong>CC BY-SA 4.0 Summary:</strong></p>
              <ul className="list-disc pl-6 text-zinc-300 space-y-1 text-sm">
                <li><strong>Attribution:</strong> You must give appropriate credit, provide a link to the license, and indicate if changes were made.</li>
                <li><strong>ShareAlike:</strong> If you remix, transform, or build upon the material, you must distribute your contributions under the same license.</li>
                <li><strong>Commercial Use:</strong> Allowed</li>
                <li><strong>Modification:</strong> Allowed</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">3.2 API Documentation</h3>
            <p className="text-zinc-300">
              API documentation follows the same CC BY-SA 4.0 license as other documentation.
              You may use, modify, and distribute API documentation with proper attribution.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">4. Content Licensing</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.1 User-Generated Content</h3>
            <p className="text-zinc-300 mb-2">
              Content you create and upload to Prismarium (documents, annotations, notes, journal entries)
              remains your intellectual property. By uploading content, you grant Prismarium:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>A non-exclusive, worldwide, royalty-free license to store, display, and process your content to provide the Service</li>
              <li>Permission to use your content for AI processing (metadata extraction, search, analysis)</li>
              <li>The right to display your content to you and, if you choose to make it public, to other users</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong>You retain all ownership rights</strong> to your content. You can delete your content
              at any time, and we will remove it from our systems (subject to backup retention policies).
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.2 Third-Party Content</h3>
            <p className="text-zinc-300 mb-2">
              Prismarium hosts content from various sources, each with its own licensing terms:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li><strong>Public Domain Works:</strong> No copyright restrictions - free to use</li>
              <li><strong>Licensed Content:</strong> Used with proper permissions and attribution</li>
              <li><strong>Fair Use:</strong> Excerpts used for educational purposes with proper attribution</li>
              <li><strong>Creative Commons:</strong> Licensed under various CC licenses (attribution required)</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              Each document in the library should indicate its license status. If you believe content
              infringes your intellectual property rights, please contact us at{" "}
              <a href="mailto:legal@prismarium.xyz" className="text-amber-400 hover:text-amber-300">
                legal@prismarium.xyz
              </a>.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.3 Prismarium Courses</h3>
            <p className="text-zinc-300 mb-2">
              Prismarium-authored course materials are separate from the public-domain, licensed, or third-party source texts
              referenced by those courses. Unless explicitly licensed otherwise, Prismarium course materials are
              <strong> All Rights Reserved</strong>.
            </p>
            <p className="text-zinc-300 mb-2">
              Public previews, course titles, reading references, and public Curator&apos;s Notes may be quoted or shared with
              attribution. Full weekly instructions, prompts, exercises, sequencing, micro-artifacts, capstones, facilitator
              materials, and related curriculum language are provided for personal educational use inside Prismarium.
            </p>
            <p className="text-zinc-300">
              You may not reproduce, scrape, mirror, redistribute, resell, sublicense, publish, adapt for teaching outside
              Prismarium, or use full course materials for AI model training or dataset creation without written permission.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.4 Prismarium-Generated Content</h3>
            <p className="text-zinc-300 mb-2">
              Content created by Prismarium (AI-generated metadata, synthesized responses, UI text) is:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>© Prismarium {new Date().getFullYear()}</li>
              <li>Licensed under CC BY-SA 4.0 for documentation and educational content</li>
              <li>Subject to MIT License for code-related content</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">5. Third-Party Software and Dependencies</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">5.1 Open Source Dependencies</h3>
            <p className="text-zinc-300 mb-4">
              Prismarium uses many open-source libraries and frameworks. Each has its own license,
              which we respect and comply with. Major dependencies include:
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-zinc-700">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-amber-200">Component</th>
                    <th className="px-4 py-2 text-left text-amber-200">License</th>
                    <th className="px-4 py-2 text-left text-amber-200">Type</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">Next.js</td>
                    <td className="px-4 py-2">MIT</td>
                    <td className="px-4 py-2">Framework</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">React</td>
                    <td className="px-4 py-2">MIT</td>
                    <td className="px-4 py-2">Library</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">TypeScript</td>
                    <td className="px-4 py-2">Apache 2.0</td>
                    <td className="px-4 py-2">Language</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">Supabase</td>
                    <td className="px-4 py-2">Apache 2.0</td>
                    <td className="px-4 py-2">Backend</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">TipTap</td>
                    <td className="px-4 py-2">MIT</td>
                    <td className="px-4 py-2">Editor</td>
                  </tr>
                  <tr className="border-t border-zinc-700">
                    <td className="px-4 py-2">PDF.js</td>
                    <td className="px-4 py-2">Apache 2.0</td>
                    <td className="px-4 py-2">PDF Viewer</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-zinc-300 mt-4">
              For a complete list of dependencies and their licenses, see the{" "}
              <code className="bg-zinc-800 px-2 py-1 rounded text-amber-300">package.json</code> file
              in the project repository. All dependencies are compatible with the MIT License.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">5.2 Attribution Requirements</h3>
            <p className="text-zinc-300">
              When using Prismarium code, you should maintain attribution to third-party libraries
              as required by their respective licenses. Most MIT and Apache 2.0 licenses require
              including the original copyright notice and license text.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">6. Trademarks and Branding</h2>
            <p className="text-zinc-300 mb-4">
              "Prismarium" and the Prismarium logo are product marks used in connection with the Prismarium service. While the code is open source,
              the Prismarium name and branding are protected. You may:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Use the code for your own projects</li>
              <li>Modify and distribute the code</li>
              <li>Create derivative works</li>
            </ul>
            <p className="text-zinc-300 mb-2 mt-4">You may not:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Use the "Prismarium" name or logo for your own products without permission</li>
              <li>Imply endorsement or affiliation with Prismarium</li>
              <li>Use Prismarium branding in a way that causes confusion</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              If you fork or modify Prismarium, please use a different name and branding to avoid confusion.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">7. Contributing</h2>
            <p className="text-zinc-300 mb-4">
              We welcome contributions to Prismarium! By contributing code, documentation, or content,
              you agree that your contributions will be licensed under the same terms as the project:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li><strong>Code contributions:</strong> MIT License</li>
              <li><strong>Documentation contributions:</strong> CC BY-SA 4.0</li>
              <li><strong>Content contributions:</strong> You retain ownership, but grant Prismarium the rights needed to use and display your content</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              For more information about contributing, see our{" "}
              <Link href="https://github.com/jmelendez2269/Digital-Grimoire"
                className="text-amber-400 hover:text-amber-300">
                GitHub repository
              </Link>.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">8. Disclaimer</h2>
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-semibold mb-2">Important:</p>
              <p className="text-zinc-300">
                The software is provided "as is", without warranty of any kind. Prismarium and its
                contributors are not liable for any damages arising from the use of this software.
                See the full MIT License text above for complete disclaimer language.
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">9. Questions About Licensing</h2>
            <p className="text-zinc-300 mb-4">
              If you have questions about licensing, want to use Prismarium code in a way not covered
              by these licenses, or need clarification on any licensing terms, please contact us:
            </p>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-zinc-300">
                <strong>Service:</strong> Prismarium, a Project Parallax product<br />
                <strong>Contact:</strong>{" "}
                <a href="mailto:legal@prismarium.xyz" className="text-amber-400 hover:text-amber-300">
                  legal@prismarium.xyz
                </a>
                <br />
                <strong>Operated by:</strong> Jeanine Melendez
              </p>
              <p className="text-zinc-400 text-sm mt-2">
                For licensing inquiries, please use the subject line: "License Inquiry"
              </p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm">
              This License page is effective as of {currentDate} and applies to all users of the Prismarium platform.
            </p>
            <div className="mt-4 flex gap-4">
              <Link
                href="/privacy"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                Back to Privacy Policy
              </Link>
              <Link
                href="/cookies"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
