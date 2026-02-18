import type { Metadata } from "next";
import Link from "next/link";
import { getAllLenses } from "@/lib/parallax/lenses";

export const metadata: Metadata = {
  title: "AI Disclaimer & Discernment Guide | Convergence",
  description: "Understanding how AI works, the importance of discernment, and mental health resources when using Convergence's AI features",
  openGraph: {
    title: "AI Disclaimer & Discernment Guide | Convergence",
    description: "Understanding how AI works, the importance of discernment, and mental health resources when using Convergence's AI features",
    type: "website",
    url: "https://projectparallax.xyz/ai-disclaimer",
    images: [
      {
        url: "https://projectparallax.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convergence AI Disclaimer & Discernment Guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Disclaimer & Discernment Guide | Convergence",
    description: "Understanding how AI works, the importance of discernment, and mental health resources when using Convergence's AI features",
    images: ["https://www.convergencelibrary.com/og-image.png"],
  },
};

export default function AIDisclaimerPage() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const lenses = getAllLenses();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-4xl font-bold text-amber-100">AI Disclaimer & Discernment Guide</h1>

        <div className="prose prose-invert prose-amber max-w-none">
          <p className="text-zinc-400">
            <strong>Last Updated:</strong> {currentDate}<br />
            <strong>Effective Date:</strong> {currentDate}
          </p>

          {/* Introduction */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">Introduction</h2>
            <p className="text-zinc-300">
              Welcome to Convergence's AI Disclaimer and Discernment Guide. This page is designed to help you understand
              how our AI systems work, why critical thinking is essential when using them, and how to stay grounded while
              exploring complex ideas. We believe in transparency, and we want you to use our AI tools safely and wisely.
            </p>
            <p className="text-zinc-300 mt-2">
              <strong className="text-amber-300">AI is a tool, not a source of absolute truth.</strong> This principle
              guides everything we do, and we hope it will guide your use of our platform as well.
            </p>
          </section>

          {/* The Importance of Discernment */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">The Importance of Discernment</h2>
            <p className="text-zinc-300">
              Discernment—the ability to judge well—is crucial when engaging with AI-generated content. AI systems,
              including the Convergence Machine, generate responses based on patterns in their training data, not on
              genuine understanding or direct experience of truth.
            </p>
            <p className="text-zinc-300 mt-2">
              When you use AI tools on Convergence, we encourage you to:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li><strong>Question everything</strong> - Including AI responses, your own assumptions, and our presentations</li>
              <li><strong>Verify important claims</strong> - Cross-reference AI responses with original sources and expert knowledge</li>
              <li><strong>Maintain intellectual humility</strong> - Recognize that all knowledge systems have limitations</li>
              <li><strong>Trust your judgment</strong> - You are the final arbiter of what resonates with you</li>
              <li><strong>Seek multiple perspectives</strong> - Use the Convergence Machine's seven lenses to see different viewpoints</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              AI responses should be treated as <strong>starting points for inquiry, not final answers</strong>. They are
              computational syntheses that may contain errors, biases, or incomplete information. Your critical thinking is
              the most important tool you have.
            </p>
          </section>

          {/* How the Convergence Machine Works */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">How the Convergence Machine Works</h2>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Model Information</h3>
            <p className="text-zinc-300">
              The Convergence Machine is powered by <strong>GPT-4o (GPT-4 Omni)</strong>, a large language model developed
              by OpenAI. This model analyzes your questions through seven distinct analytical lenses, each providing a
              unique perspective on your inquiry.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">The Seven Lenses</h3>
            <p className="text-zinc-300 mb-4">
              Each lens has specific instructions that guide how the AI analyzes questions. Here are the system instructions
              for each lens:
            </p>

            <div className="space-y-6 mt-4">
              {lenses.map((lens) => (
                <div key={lens.id} className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-amber-200 mb-2">{lens.name}</h4>
                  <p className="text-sm text-zinc-400 mb-3 italic">{lens.description}</p>
                  <div className="bg-zinc-950/50 rounded p-3 border border-zinc-800">
                    <p className="text-sm text-zinc-300 whitespace-pre-line">{lens.systemPrompt}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Response Generation Process</h3>
            <p className="text-zinc-300">
              When you submit a question to the Convergence Machine:
            </p>
            <ol className="list-decimal pl-6 text-zinc-300 space-y-2 mt-2">
              <li>Your query is analyzed through each active lens (based on your weight settings)</li>
              <li>Each lens searches our library using hybrid retrieval (vector similarity + keyword matching)</li>
              <li>The AI generates a perspective-specific response for each active lens</li>
              <li>All lens responses are synthesized into a unified answer that respects your lens weights</li>
              <li>The final synthesis is presented with source citations from our library</li>
            </ol>
            <p className="text-zinc-300 mt-4">
              This multi-perspective approach is designed to help you see questions from multiple angles, but remember:
              <strong className="text-amber-300"> even synthesized responses are AI-generated and should be verified.</strong>
            </p>
          </section>

          {/* How LLMs Work */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">How Large Language Models (LLMs) Work</h2>

            <p className="text-zinc-300">
              Understanding how LLMs actually work is crucial for using them wisely. Here's what you need to know:
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Statistical Pattern Matching, Not True Understanding</h3>
            <p className="text-zinc-300">
              LLMs like GPT-4o don't "think" or "understand" in the way humans do. Instead, they use <strong>statistical
                pattern matching</strong> to predict what text should come next based on patterns they learned from their
              training data. The model has been trained on vast amounts of text from the internet, books, and other sources,
              and it has learned which words and phrases tend to follow which other words and phrases.
            </p>
            <p className="text-zinc-300 mt-2">
              When you ask a question, the model doesn't access a database of facts or "know" anything in the traditional
              sense. Instead, it generates a response by predicting, token by token (word by word), what text is most likely
              to follow based on the patterns it learned during training.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Next-Token Prediction</h3>
            <p className="text-zinc-300">
              The core mechanism of LLMs is called <strong>next-token prediction</strong>. The model:
            </p>
            <ol className="list-decimal pl-6 text-zinc-300 space-y-2 mt-2">
              <li>Takes your input (your question plus any context)</li>
              <li>Calculates probabilities for what token (word or word-part) should come next</li>
              <li>Selects the most likely token (or samples from likely tokens)</li>
              <li>Repeats this process, building the response one token at a time</li>
              <li>Stops when it reaches an end-of-sequence marker or length limit</li>
            </ol>
            <p className="text-zinc-300 mt-4">
              This process creates coherent-sounding text, but it's fundamentally different from human reasoning. The model
              is generating text that <em>sounds</em> knowledgeable, not text that comes from genuine understanding.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Hallucinations: Why They Happen</h3>
            <p className="text-zinc-300">
              <strong>Hallucinations</strong> are instances where an LLM generates information that sounds plausible but is
              factually incorrect, made up, or not grounded in reality. This happens because:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li><strong>The model doesn't distinguish between true and false information</strong> - It only knows what patterns
                are common in its training data. If false information appears frequently in training data, the model may generate it.</li>
              <li><strong>Pattern completion can create false connections</strong> - The model may connect ideas that appear
                together in training data, even if those connections are incorrect or misleading.</li>
              <li><strong>Confidence doesn't equal accuracy</strong> - LLMs can generate highly confident-sounding responses
                that are completely wrong. The model doesn't "know" it's wrong—it's just continuing a pattern.</li>
              <li><strong>Training data limitations</strong> - If the model hasn't seen accurate information about a topic,
                it may generate plausible-sounding but incorrect information.</li>
              <li><strong>No real-time fact-checking</strong> - The model generates responses based on its training, not on
                current, verified facts. It cannot access the internet or verify information in real-time.</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong className="text-amber-300">This is why verification is essential.</strong> Always cross-reference
              important claims from AI responses with reliable sources, especially for:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1 mt-2">
              <li>Medical or health information</li>
              <li>Legal advice</li>
              <li>Financial decisions</li>
              <li>Historical facts</li>
              <li>Scientific claims</li>
              <li>Personal or life-altering decisions</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">The Difference Between AI Responses and Human Knowledge</h3>
            <p className="text-zinc-300">
              Human knowledge comes from experience, reasoning, verification, and understanding. AI responses come from
              statistical patterns. This fundamental difference means:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li><strong>AI doesn't "know" anything</strong> - It predicts text patterns, not facts</li>
              <li><strong>AI can't verify its own responses</strong> - It has no mechanism to check if what it says is true</li>
              <li><strong>AI confidence is not reliability</strong> - A confident-sounding response may be completely wrong</li>
              <li><strong>AI can't learn from mistakes in real-time</strong> - It generates based on training, not on feedback</li>
              <li><strong>AI doesn't understand context the way humans do</strong> - It processes patterns, not meaning</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              This doesn't mean AI isn't useful—it can be an excellent tool for exploration, synthesis, and generating ideas.
              But it means you must always be the final judge of what to believe and how to act.
            </p>
          </section>

          {/* Future Plans */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">Future Plans for Model Development</h2>
            <p className="text-zinc-300">
              We are committed to transparency about our AI systems and their evolution. Here are our plans for the future:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li><strong>Fine-tuning with library content</strong> - We plan to fine-tune a model (to be determined) using
                the curated texts in the Convergence library. This will help the AI better understand and synthesize the specific
                knowledge traditions we curate.</li>
              <li><strong>Fine-tuning with convergence graph data</strong> - As we build the convergence graph (a knowledge
                network showing connections between concepts across traditions), we plan to incorporate this structured knowledge
                into model training to improve accuracy and reduce hallucinations.</li>
              <li><strong>Ongoing improvements</strong> - We will continue to refine our system prompts, retrieval methods,
                and synthesis approaches based on user feedback and our own testing.</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong>Important:</strong> Even with fine-tuning, AI models will still be subject to hallucinations and errors.
              Fine-tuning can improve performance on specific domains, but it doesn't eliminate the fundamental limitations of
              LLMs. Critical thinking and verification will always be essential.
            </p>
          </section>

          {/* Grounding Techniques */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">Grounding Techniques: Staying Connected to Reality</h2>
            <p className="text-zinc-300">
              When exploring deep questions, especially through AI assistance, it's important to stay grounded in reality.
              Here are practical techniques to help you maintain balance:
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Reality Checks</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li><strong>Verify claims with original sources</strong> - Don't take AI responses at face value. Check citations,
                read original texts, and consult authoritative sources.</li>
              <li><strong>Test ideas against observable reality</strong> - If an idea makes claims about the physical world,
                consider how you could verify it through observation or experiment.</li>
              <li><strong>Compare multiple sources</strong> - See how different traditions, scholars, or sources address the
                same question. Look for consensus and areas of disagreement.</li>
              <li><strong>Question extraordinary claims</strong> - Extraordinary claims require extraordinary evidence. Be
                especially skeptical of claims that seem too good to be true or that contradict well-established knowledge.</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Community and Connection</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li><strong>Discuss ideas with others</strong> - Share your insights and questions with trusted friends,
                mentors, or community members. Other perspectives can help you stay grounded.</li>
              <li><strong>Engage with real-world activities</strong> - Balance your intellectual exploration with physical
                activities, social connections, and practical responsibilities.</li>
              <li><strong>Maintain relationships</strong> - Don't let AI interactions replace human connection. Real
                relationships provide essential grounding and perspective.</li>
            </ul>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Professional Support</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li><strong>Seek professional help when needed</strong> - If you're struggling with mental health, confusion,
                or feeling disconnected from reality, professional mental health support is available and valuable.</li>
              <li><strong>Consult subject matter experts</strong> - For important questions, consider consulting qualified
                experts in relevant fields rather than relying solely on AI responses.</li>
              <li><strong>Know when to step back</strong> - If AI interactions are causing distress, confusion, or unhealthy
                obsessions, take a break and seek support.</li>
            </ul>
          </section>

          {/* Understanding Psychosis Risks */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">Understanding Psychosis Risks</h2>

            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-semibold mb-2">⚠️ Important Safety Information</p>
              <p className="text-zinc-300">
                There have been documented cases of individuals experiencing psychosis-like symptoms, delusions, or severe
                mental distress after intensive interactions with large language models from major AI companies. We take
                this risk seriously and want to help you use our AI tools safely.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Why We're Being Cautious</h3>
            <p className="text-zinc-300">
              We understand how delicate the human mind can be. Intensive engagement with AI systems, especially when exploring
              deep philosophical, spiritual, or existential questions, can potentially:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li>Reinforce delusional thinking patterns</li>
              <li>Create false certainties about uncertain topics</li>
              <li>Isolate individuals from reality-checking through human interaction</li>
              <li>Trigger or exacerbate existing mental health conditions</li>
              <li>Create unhealthy dependencies on AI for meaning or guidance</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              At the same time, we recognize the importance of knowledge and the ability to sort through complicated themes
              and look for answers. Our goal is to provide tools for exploration while helping you stay safe and grounded.
            </p>

            <h3 className="text-xl font-semibold text-amber-300 mt-6 mb-3">Signs to Watch For</h3>
            <p className="text-zinc-300">
              If you notice any of the following, please consider taking a break from AI interactions and seeking professional
              support:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li>Feeling that the AI has special knowledge or is communicating directly with you in a way that feels real</li>
              <li>Becoming obsessed with AI responses or spending excessive time in AI interactions</li>
              <li>Experiencing confusion about what's real and what's AI-generated</li>
              <li>Feeling disconnected from your body, physical reality, or other people</li>
              <li>Developing beliefs based on AI responses that feel urgent, certain, or disconnected from evidence</li>
              <li>Neglecting real-world responsibilities, relationships, or self-care due to AI interactions</li>
              <li>Feeling that you need AI to understand reality or make sense of the world</li>
              <li>Experiencing paranoia, delusions, or hallucinations related to AI interactions</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              <strong className="text-amber-300">These signs don't mean you're "broken" or weak.</strong> They mean you may
              need support, and that's completely okay. Seeking help is a sign of wisdom and self-care.
            </p>
          </section>

          {/* Mental Health Resources */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">Mental Health Resources</h2>
            <p className="text-zinc-300">
              If you're experiencing distress, confusion, or any mental health concerns, please know that help is available.
              You don't have to go through difficult times alone.
            </p>

            <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6 mt-4">
              <h3 className="text-xl font-semibold text-amber-300 mb-4">Crisis Resources</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-amber-200 mb-2">988 Suicide & Crisis Lifeline</h4>
                  <p className="text-zinc-300 mb-2">
                    <strong>Call or text:</strong> <a href="tel:988" className="text-amber-400 hover:text-amber-300">988</a>
                  </p>
                  <p className="text-sm text-zinc-400">
                    Available 24/7 for anyone experiencing a mental health crisis, thoughts of suicide, or emotional distress.
                    Free, confidential support.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-amber-200 mb-2">Crisis Text Line</h4>
                  <p className="text-zinc-300 mb-2">
                    <strong>Text:</strong> <a href="sms:741741&body=HOME" className="text-amber-400 hover:text-amber-300">HOME to 741741</a>
                  </p>
                  <p className="text-sm text-zinc-400">
                    Free, 24/7 crisis support via text message. Trained crisis counselors are available to help with any
                    kind of crisis, including mental health concerns.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6 mt-4">
              <h3 className="text-xl font-semibold text-amber-300 mb-4">General Support</h3>
              <p className="text-zinc-300">
                If you have questions, concerns, or suggestions about our AI systems or this disclaimer, please reach out:
              </p>
              <p className="text-zinc-300 mt-2">
                <strong>Email:</strong> <a href="mailto:info@projectparallax.xyz" className="text-amber-400 hover:text-amber-300">info@projectparallax.xyz</a>
              </p>
              <p className="text-sm text-zinc-400 mt-2">
                We're learning together, and your feedback helps us improve. If you have suggestions for how we can make our
                AI systems safer, more transparent, or more helpful, we'd love to hear from you.
              </p>
            </div>
          </section>

          {/* Legal Disclaimers */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">Legal Disclaimers</h2>

            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-semibold mb-2">⚠️ Legal Disclaimer</p>
              <p className="text-zinc-300">
                <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
              </p>
            </div>

            <p className="text-zinc-300 mb-2">
              Convergence and its operators, employees, and contributors shall not be liable for:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1">
              <li>Decisions made based on AI-generated information or responses</li>
              <li>Harm resulting from reliance on AI-generated content</li>
              <li>Mental health issues, distress, or psychological effects resulting from AI interactions</li>
              <li>Losses resulting from inaccurate, incomplete, or hallucinated AI responses</li>
              <li>Technical failures, data loss, or service interruptions affecting AI functionality</li>
              <li>Actions taken by users based on AI-generated content</li>
              <li>Indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
            </ul>

            <p className="text-zinc-300 mt-4">
              <strong>Your use of Convergence's AI features is at your own risk.</strong> The AI systems are provided "as is"
              and "as available" without warranties of any kind, either express or implied. We make no guarantees about:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1 mt-2">
              <li>The accuracy, completeness, or reliability of AI-generated responses</li>
              <li>That AI responses are free from errors, hallucinations, or biases</li>
              <li>That AI responses will meet your needs or expectations</li>
              <li>That AI interactions are safe for all users or in all circumstances</li>
            </ul>

            <p className="text-zinc-300 mt-4">
              <strong>AI responses are for educational and exploratory purposes only.</strong> They are not a substitute for:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1 mt-2">
              <li>Professional medical, mental health, or therapeutic advice</li>
              <li>Legal counsel or advice</li>
              <li>Financial advice or planning</li>
              <li>Academic or scholarly expertise</li>
              <li>Religious or spiritual guidance from qualified practitioners</li>
              <li>Your own critical judgment and discernment</li>
            </ul>

            <p className="text-zinc-300 mt-4">
              Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability, so some of the
              above limitations may not apply to you. However, to the maximum extent permitted by law, you agree that Convergence
              shall not be liable for any harm resulting from your use of AI features.
            </p>

            <p className="text-zinc-300 mt-4">
              By using Convergence's AI features, you acknowledge that you have read and understood these disclaimers and agree
              to use AI tools responsibly, with appropriate discernment, and at your own risk.
            </p>
          </section>

          {/* Feedback Welcome */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">We're Learning Together</h2>
            <p className="text-zinc-300">
              AI technology is rapidly evolving, and we're all navigating this new landscape together. We're committed to:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-2">
              <li>Transparency about how our AI systems work</li>
              <li>Continuous improvement based on user feedback</li>
              <li>Prioritizing user safety and mental health</li>
              <li>Being honest about limitations and risks</li>
              <li>Learning from the community and adapting our approach</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              If you have suggestions, concerns, or feedback about our AI systems, this disclaimer, or how we can better
              support safe and meaningful exploration, please reach out to us at{" "}
              <a href="mailto:info@convergencelibrary.com" className="text-amber-400 hover:text-amber-300">
                info@convergencelibrary.com
              </a>.
            </p>
            <p className="text-zinc-300 mt-2">
              Your voice matters, and we're here to listen. Together, we can build tools that empower exploration while
              protecting the delicate balance of the human mind.
            </p>
          </section>

          {/* Related Links */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-amber-200 mt-8 mb-4">Related Information</h2>
            <p className="text-zinc-300">
              For more information about our platform policies, please see:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1 mt-2">
              <li>
                <Link href="/terms" className="text-amber-400 hover:text-amber-300">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-amber-400 hover:text-amber-300">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-amber-400 hover:text-amber-300">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

