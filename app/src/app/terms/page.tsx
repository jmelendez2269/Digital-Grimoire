import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Convergence",
  description: "Terms of Service for Convergence - Rules and guidelines for using our platform",
};

export default function TermsOfServicePage() {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-4xl font-bold text-amber-100">Terms of Service</h1>
        
        <div className="prose prose-invert prose-amber max-w-none">
          <p className="text-zinc-400">
            <strong>Last Updated:</strong> {currentDate}<br />
            <strong>Effective Date:</strong> {currentDate}
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">1. Introduction & Acceptance</h2>
            <p className="text-zinc-300">
              Welcome to Convergence ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of 
              our digital library platform (the "Service"). By accessing or using our Service, you agree to be bound by these Terms.
            </p>
            <p className="text-zinc-300 mt-2">
              If you do not agree to these Terms, please do not use our Service. We may update these Terms from time to time, 
              and your continued use of the Service after changes become effective constitutes acceptance of the updated Terms.
            </p>
            <p className="text-zinc-300 mt-2">
              These Terms should be read in conjunction with our{" "}
              <Link href="/privacy" className="text-amber-400 hover:text-amber-300">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/cookies" className="text-amber-400 hover:text-amber-300">
                Cookie Policy
              </Link>.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">2. Account Registration & Responsibilities</h2>
            
            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">2.1 Account Creation</h3>
            <p className="text-zinc-300 mb-2">To use certain features of our Service, you must create an account. When creating an account, you agree to:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your account information as necessary</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">2.2 Account Eligibility</h3>
            <p className="text-zinc-300 mb-2">You must be at least 13 years of age to create an account. If you are under 18, you represent that you have your parent's or guardian's permission to use the Service.</p>
            <p className="text-zinc-300 mt-2">
              You may not create an account if you are prohibited from receiving our services under applicable laws or if you 
              have previously been banned from the Service.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">2.3 Account Security</h3>
            <p className="text-zinc-300">
              You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your 
              account with others or allow others to access your account. We are not liable for any loss or damage arising from 
              your failure to protect your account information.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">3. Acceptable Use Policy</h2>
            
            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">3.1 Permitted Uses</h3>
            <p className="text-zinc-300 mb-2">You may use our Service for lawful purposes, including:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Personal research and study</li>
              <li>Educational purposes</li>
              <li>Creating and managing your personal library</li>
              <li>Annotating and organizing content</li>
              <li>Sharing content with others in accordance with these Terms</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">3.2 Prohibited Uses</h3>
            <p className="text-zinc-300 mb-2">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon intellectual property rights of others</li>
              <li>Upload malicious software, viruses, or harmful code</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Upload content that is illegal, harmful, threatening, or violates others' rights</li>
              <li>Use the Service for commercial purposes without our written consent</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">3.3 Content Standards</h3>
            <p className="text-zinc-300">
              All content you upload or contribute must comply with applicable laws and respect the rights of others. We reserve 
              the right to remove any content that violates these Terms or is otherwise objectionable, at our sole discretion.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">4. User-Generated Content & Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.1 Your Content</h3>
            <p className="text-zinc-300 mb-2">
              You retain ownership of content you create, upload, or contribute to the Service (such as annotations, notes, 
              journal entries, and uploaded documents). However, by uploading content, you grant us a license to:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Store, display, and process your content to provide the Service</li>
              <li>Use your content to improve and operate the Service</li>
              <li>Back up your content to prevent data loss</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.2 Content Representations</h3>
            <p className="text-zinc-300 mb-2">You represent and warrant that:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>You own the rights to content you upload, OR</li>
              <li>The content is in the public domain, OR</li>
              <li>You have proper licenses or permissions to use and share the content</li>
              <li>Your content does not infringe upon the rights of others</li>
              <li>Your content complies with all applicable laws</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong>You are solely responsible for ensuring your content does not violate intellectual property rights.</strong>
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.3 Our Content</h3>
            <p className="text-zinc-300">
              Content created by Convergence (including the user interface, AI-generated syntheses, and original writing) is 
              protected by copyright and other intellectual property laws. You may not copy, modify, distribute, or create 
              derivative works from our content without our written permission.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">4.4 Third-Party Content</h3>
            <p className="text-zinc-300 mb-2">
              Our Service may include content from third parties, including public domain works and licensed content. We strive 
              to respect intellectual property rights and include only:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Public domain works (no copyright restrictions)</li>
              <li>Licensed content (with proper permissions)</li>
              <li>Fair use excerpts (properly attributed for educational purposes)</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              If you believe content on our Service infringes your intellectual property rights, please contact us at{" "}
              <a href="mailto:legal@convergencelibrary.com" className="text-amber-400 hover:text-amber-300">
                legal@convergencelibrary.com
              </a>{" "}
              with specific information about the allegedly infringing content.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">5. Educational Purpose & Non-Endorsement</h2>
            
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-semibold mb-2">⚠️ Important Disclaimer</p>
              <p className="text-zinc-300">
                <strong>All content on Convergence is presented for educational and exploratory purposes only.</strong>
              </p>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">5.1 Educational Purpose Statement</h3>
            <p className="text-zinc-300">
              Convergence is a platform for learning, research, personal exploration, and intellectual inquiry. We aggregate and 
              synthesize knowledge from diverse traditions and systems to facilitate understanding and cross-cultural synthesis.
            </p>
            <p className="text-zinc-300 mt-2">
              <strong>We do not claim that any particular tradition, system, teaching, or practice represents objective, absolute, 
              or universal truth.</strong>
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">5.2 Non-Endorsement Policy</h3>
            <p className="text-zinc-300 mb-2">
              <strong>The inclusion of content, systems, or traditions on Convergence does not constitute endorsement, validation, 
              verification, or scientific confirmation.</strong>
            </p>
            <p className="text-zinc-300 mt-2">
              We include a wide range of knowledge systems based on one criterion: if it has been meaningful to human beings in 
              their quest to understand themselves, their world, and their universe, it belongs in our library.
            </p>
            <p className="text-zinc-300 mt-2">
              This includes, but is not limited to: esoteric and occult traditions, religious and spiritual teachings, mystical 
              practices, philosophical systems, traditional sciences and cosmologies, systems like astrology and numerology, and 
              alternative healing modalities.
            </p>
            <p className="text-zinc-300 mt-4">
              <strong>Scientific validation is not a prerequisite for inclusion.</strong> Many systems we include have not been 
              validated by contemporary scientific methods. We include them because they have historical and cultural significance 
              and provide frameworks that people find meaningful for self-understanding.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">5.3 Not an Academic Institution</h3>
            <p className="text-zinc-300">
              Convergence is not an academic institution, research university, or scholarly authority. We are a technology platform 
              that aggregates knowledge, provides tools for exploration, and facilitates connections across traditions. We do not 
              claim to be the arbiter of truth or a substitute for formal academic education.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">5.4 User Responsibility</h3>
            <p className="text-zinc-300 mb-2">
              <strong>Users are solely responsible for how they interpret, evaluate, and apply knowledge found on Convergence.</strong>
            </p>
            <p className="text-zinc-300 mt-2">
              We encourage users to cross-reference information, consult qualified experts, verify claims through their own research, 
              and think critically about all content. Convergence is not a substitute for professional advice in matters requiring 
              medical, legal, financial, or other expert guidance.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">6. AI Services & Content Disclaimers</h2>
            
            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">6.1 AI-Generated Content</h3>
            <p className="text-zinc-300 mb-2">
              <strong>AI-generated responses are computational syntheses, not authoritative truth.</strong>
            </p>
            <p className="text-zinc-300 mt-2">
              Our AI system (The Convergence Machine) analyzes content through multiple perspectives, synthesizes information from 
              our database, and provides citations to source material. However, AI responses may contain errors, omissions, or biases.
            </p>
            <p className="text-zinc-300 mt-2">
              <strong>AI responses should be treated as starting points for inquiry, not final answers.</strong>
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">6.2 AI Service Data Processing</h3>
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-semibold mb-2">⚠️ Important:</p>
              <p className="text-zinc-300">
                When you use AI features (chat, metadata extraction), your content is sent to third-party AI providers (Anthropic, 
                OpenAI, Google). These services process your content to generate responses and may temporarily store it for processing. 
                They do NOT use your content to train their models (based on their current policies).
              </p>
              <p className="text-zinc-300 mt-2">
                <strong>We recommend:</strong> Avoid uploading highly sensitive personal information in documents that will be 
                processed by AI.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">6.3 Content Accuracy</h3>
            <p className="text-zinc-300 mb-2">
              <strong>We make a good-faith effort to ensure accuracy, but we cannot guarantee that all information is correct, 
              complete, or up-to-date.</strong>
            </p>
            <p className="text-zinc-300 mt-2">
              Reasons for potential inaccuracy include OCR errors, translation issues, source disagreements, evolving knowledge, 
              and user contributions. Users are responsible for verifying any information they intend to rely upon.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">7. Service Availability & Modifications</h2>
            
            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">7.1 Service Availability</h3>
            <p className="text-zinc-300">
              We strive for high availability, but we do not guarantee that the Service will be available at all times. Service 
              interruptions may occur due to maintenance, technical issues, or circumstances beyond our control. We are not liable 
              for any loss or inconvenience resulting from service unavailability.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">7.2 Service Modifications</h3>
            <p className="text-zinc-300 mb-2">We reserve the right to:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Modify, suspend, or discontinue any part of the Service at any time</li>
              <li>Change features, functionality, or pricing</li>
              <li>Impose limits on usage or storage</li>
              <li>Remove or modify content</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              We will provide reasonable notice of material changes when possible, but we are not obligated to do so for all changes.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">7.3 Data Backups</h3>
            <p className="text-zinc-300">
              While we implement backup systems, data loss, while unlikely, is possible. <strong>Users should maintain backups of 
              important content created on the platform.</strong> We are not liable for any loss of data or content.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">7.4 Third-Party Services</h3>
            <p className="text-zinc-300">
              Our Service integrates with third-party services (hosting, storage, AI providers, etc.). We are not responsible for 
              third-party service outages, failures, data practices, or changes to third-party terms or pricing.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">8. Health & Safety Disclaimers</h2>
            
            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">8.1 Not Medical or Mental Health Advice</h3>
            <p className="text-zinc-300 mb-2">
              <strong>Nothing on Convergence constitutes medical advice, diagnosis, or treatment.</strong>
            </p>
            <p className="text-zinc-300 mt-2">
              Some content may discuss traditional healing practices, spiritual approaches to wellness, psychological concepts, or 
              plant medicines. <strong>This information is for educational purposes only.</strong> Always consult licensed healthcare 
              professionals for medical diagnoses, treatment, mental health concerns, or any health-related decisions.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">8.2 Safety in Practice</h3>
            <p className="text-zinc-300">
              Some spiritual or esoteric practices may involve altered states of consciousness, physical exercises, dietary 
              restrictions, or use of herbs or substances. Exercise caution and common sense. Consider your physical and mental 
              health status, potential risks, the importance of proper guidance, and local laws and regulations.
            </p>
            <p className="text-zinc-300 mt-4">
              <strong>Convergence is not responsible for consequences of practices undertaken based on information found on the platform.</strong>
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">9. Limitation of Liability</h2>
            
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-semibold mb-2">⚠️ Legal Disclaimer</p>
              <p className="text-zinc-300">
                <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
              </p>
            </div>

            <p className="text-zinc-300 mb-2">Convergence and its operators, employees, and contributors shall not be liable for:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Decisions made based on information found on the platform</li>
              <li>Harm resulting from practices or teachings described on the platform</li>
              <li>Losses resulting from inaccurate, incomplete, or outdated information</li>
              <li>Technical failures, data loss, or service interruptions</li>
              <li>Actions taken by third parties based on content from the platform</li>
              <li>Indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong>Your use of Convergence is at your own risk.</strong> The Service is provided "as is" and "as available" 
              without warranties of any kind, either express or implied.
            </p>
            <p className="text-zinc-300 mt-2">
              Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability, so some of the above 
              limitations may not apply to you.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">10. Termination</h2>
            
            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">10.1 Termination by You</h3>
            <p className="text-zinc-300">
              You may terminate your account at any time by deleting your account through the Privacy Settings page or by contacting 
              us. Upon termination, your access to the Service will cease, and we will delete your personal information and 
              user-generated content in accordance with our Privacy Policy.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">10.2 Termination by Us</h3>
            <p className="text-zinc-300 mb-2">
              We may suspend or terminate your account and access to the Service immediately, without prior notice, if:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>You violate these Terms or our policies</li>
              <li>You engage in fraudulent, illegal, or harmful activities</li>
              <li>We are required to do so by law</li>
              <li>We discontinue the Service (in whole or in part)</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">10.3 Effect of Termination</h3>
            <p className="text-zinc-300">
              Upon termination, your right to use the Service will immediately cease. We may delete your account and content, 
              though some information may be retained as required by law or for legitimate business purposes. Sections of these 
              Terms that by their nature should survive termination will survive.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">11. Indemnification</h2>
            <p className="text-zinc-300">
              You agree to indemnify, defend, and hold harmless Convergence and its operators, employees, and contributors from and 
              against any claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including attorney's fees) 
              arising from:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1 mt-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Content you upload or contribute</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">12. Dispute Resolution</h2>
            
            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">12.1 Governing Law</h3>
            <p className="text-zinc-300">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Convergence 
              operates, without regard to its conflict of law provisions.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">12.2 Informal Resolution</h3>
            <p className="text-zinc-300">
              Before filing a claim, you agree to try to resolve the dispute informally by contacting us at{" "}
              <a href="mailto:legal@convergencelibrary.com" className="text-amber-400 hover:text-amber-300">
                legal@convergencelibrary.com
              </a>. We will try to resolve the dispute within 60 days.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">12.3 Binding Arbitration</h3>
            <p className="text-zinc-300">
              If we cannot resolve a dispute informally, you agree that any dispute arising out of or relating to these Terms or 
              the Service will be resolved through binding arbitration, except where prohibited by law. Arbitration will be conducted 
              in accordance with applicable arbitration rules.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">13. Changes to These Terms</h2>
            <p className="text-zinc-300">
              We may update these Terms from time to time. We will notify you of any changes by:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1 mt-2">
              <li>Posting the new Terms on this page</li>
              <li>Updating the "Last Updated" date</li>
              <li>Sending an email notification (for material changes)</li>
              <li>Displaying a notice in the application (for significant changes)</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong>Your continued use of the Service after changes become effective constitutes acceptance of the updated Terms.</strong>
            </p>
            <p className="text-zinc-300 mt-2">
              If you do not agree to the updated Terms, you must stop using the Service and may delete your account.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">14. Severability</h2>
            <p className="text-zinc-300">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated 
              to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">15. Entire Agreement</h2>
            <p className="text-zinc-300">
              These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and 
              Convergence regarding your use of the Service and supersede all prior agreements and understandings.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">16. Contact Us</h2>
            <p className="text-zinc-300 mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-zinc-300">
                <strong>Service:</strong> Convergence<br />
                <strong>Contact:</strong>{" "}
                <a href="mailto:legal@convergencelibrary.com" className="text-amber-400 hover:text-amber-300">
                  legal@convergencelibrary.com
                </a>
                <br />
                <strong>Operated by:</strong> Jeanine Melendez
              </p>
              <p className="text-zinc-400 text-sm mt-2">
                For terms-specific inquiries, please use the subject line: "Terms of Service Inquiry"
              </p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm">
              This Terms of Service is effective as of {currentDate} and applies to all users of the Convergence platform.
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link
                href="/privacy"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                ← Privacy Policy
              </Link>
              <Link
                href="/cookies"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                Cookie Policy →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

