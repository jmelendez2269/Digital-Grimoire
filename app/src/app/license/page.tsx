import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "License | Prismarium",
  description: "License information for Prismarium - Software, documentation, and content licensing",
  openGraph: {
    title: "License | Prismarium",
    description: "License information for Prismarium - Software, documentation, and content licensing",
    type: "website",
    url: "/license",
    images: [
      {
        url: "/og-image.png",
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
    images: ["/og-image.png"],
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
              The Prismarium platform source code is <strong>proprietary and All Rights Reserved</strong>. It is not
              open source. No license or right to the source code is granted by accessing or using the Service.
            </p>

            <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700 my-4">
              <h4 className="text-lg font-semibold text-amber-200 mb-3">Proprietary License — All Rights Reserved</h4>
              <p className="text-zinc-300 text-sm mb-4">
                Copyright (c) {new Date().getFullYear()} Jeanine Melendez. All rights reserved.
              </p>
              <p className="text-zinc-300 text-sm mb-2">
                The Prismarium source code and its structure, organization, and underlying logic are the confidential
                and proprietary property of Jeanine Melendez. Except as expressly permitted in writing, you may not
                copy, reproduce, modify, adapt, translate, distribute, publish, sublicense, sell, rent, lease, or
                create derivative works from any part of the source code, nor reverse engineer, decompile, or
                disassemble it, nor use it to build or train any competing product, service, or model.
              </p>
              <p className="text-zinc-300 text-sm">
                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                AUTHOR OR COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                SOFTWARE.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">2.2 What This Means</h3>
            <p className="text-zinc-300 mb-2">Without our prior written permission, you may NOT:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Copy, reproduce, or store the source code outside of authorized use of the Service</li>
              <li>Modify, adapt, or create derivative works from the code</li>
              <li>Distribute, publish, sublicense, sell, rent, or lease the code</li>
              <li>Reverse engineer, decompile, or disassemble the code</li>
              <li>Use the code (in whole or in part) to build or train a competing product, service, or model</li>
            </ul>
            <p className="text-zinc-300 mb-2 mt-4">
              If you would like to license or reuse any part of the Prismarium source code, contact us to request
              written permission.
            </p>
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
              Content created by Prismarium (AI-generated metadata, synthesized responses, UI text) is
              © {new Date().getFullYear()} Jeanine Melendez, All Rights Reserved. You may not reproduce,
              redistribute, or create derivative works from it without written permission.
            </p>
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
              in the project. We use each dependency in compliance with its respective open-source license.
              Our use of open-source dependencies does not make the Prismarium source code itself open source.
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
              "Prismarium" and "Project Parallax," together with their associated logos and branding, are marks used
              in connection with the Prismarium service and are protected. The source code is proprietary and is not
              available for reuse. You may not:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Use the "Prismarium" or "Project Parallax" name or logo for your own products without permission</li>
              <li>Imply endorsement or affiliation with Prismarium</li>
              <li>Use Prismarium branding in a way that causes confusion</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">7. Contributing</h2>
            <p className="text-zinc-300 mb-4">
              Prismarium is not an open-source project and does not accept public source-code contributions. If you
              are interested in collaborating or contributing content, please contact us first. Any contribution
              accepted with our written agreement will be assigned to Prismarium unless we agree otherwise in writing.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">8. Disclaimer</h2>
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-semibold mb-2">Important:</p>
              <p className="text-zinc-300">
                The software is provided "as is", without warranty of any kind. Prismarium and its
                operator are not liable for any damages arising from the use of this software.
                See the full proprietary license text above for complete disclaimer language.
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
