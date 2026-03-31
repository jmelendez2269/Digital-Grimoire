'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, AlertCircle } from 'lucide-react';

function NewJournalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }

    const courseId = searchParams.get('course');
    const weekParam = searchParams.get('week');
    const weekNumber = weekParam ? parseInt(weekParam, 10) : null;

    if (!courseId) {
      // No course specified - create a blank journal page
      createBlankJournalPage();
      return;
    }

    // Create journal page with course/week context
    createSynthesisArtifact(courseId, weekNumber);
  }, [user, authLoading, searchParams, router]);

  async function createBlankJournalPage() {
    try {
      setLoading(true);
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Page',
          content: { type: 'doc', content: [] },
          icon: '📝',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create journal page (${response.status})`);
      }

      const data = await response.json();
      router.push(`/journal/${data.page.id}`);
    } catch (err) {
      console.error('Error creating journal page:', err);
      setError(err instanceof Error ? err.message : 'Failed to create journal page');
      setLoading(false);
    }
  }

  async function createSynthesisArtifact(courseId: string, weekNumber: number | null) {
    try {
      setLoading(true);
      setError(null);

      // Fetch course data
      const courseResponse = await fetch(`/api/courses/${courseId}`);
      if (!courseResponse.ok) {
        throw new Error('Failed to fetch course data');
      }

      const courseData = await courseResponse.json();
      if (!courseData.success || !courseData.course) {
        throw new Error('Course not found');
      }

      const course = courseData.course;
      
      // Find the week data
      let week = null;
      let synthesisPrompt = null;
      let weekTitle = '';

      if (weekNumber !== null && course.content?.weeks) {
        week = course.content.weeks.find((w: any) => w.week_number === weekNumber);
        if (week) {
          weekTitle = week.title || `Week ${weekNumber}`;
          synthesisPrompt = week.synthesis_prompt;
        }
      }

      // Build the journal page title
      const pageTitle = week 
        ? `Synthesis: ${course.title} - ${weekTitle}`
        : `Synthesis: ${course.title}`;

      // Build initial content with synthesis prompt if available
      let initialContent: any = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: pageTitle }],
          },
          {
            type: 'paragraph',
            content: [],
          },
        ],
      };

      if (synthesisPrompt) {
        // Handle synthesis prompt - it could be:
        // 1. A rich text object (TipTap JSON)
        // 2. A JSON string that needs parsing
        // 3. A plain text string
        let promptContent: any = null;
        
        if (typeof synthesisPrompt === 'string') {
          try {
            // Try to parse as JSON
            promptContent = JSON.parse(synthesisPrompt);
          } catch {
            // If parsing fails, treat as plain text
            promptContent = {
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 2 },
                  content: [{ type: 'text', text: 'Synthesis Prompt' }],
                },
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: synthesisPrompt }],
                },
              ],
            };
          }
        } else {
          // Already an object
          promptContent = synthesisPrompt;
        }

        // If promptContent is a doc structure, extract its content
        if (promptContent && promptContent.type === 'doc' && Array.isArray(promptContent.content)) {
          // Add a heading before the prompt content
          initialContent.content.push({
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Synthesis Prompt' }],
          });
          // Add the prompt content
          initialContent.content.push(...promptContent.content);
        } else if (promptContent) {
          // If it's not a doc structure, wrap it
          initialContent.content.push({
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Synthesis Prompt' }],
          });
          initialContent.content.push({
            type: 'paragraph',
            content: [{ type: 'text', text: JSON.stringify(promptContent) }],
          });
        }
        
        // Add a separator paragraph before user's response area
        initialContent.content.push({
          type: 'paragraph',
          content: [],
        });
        initialContent.content.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Your Synthesis' }],
        });
        initialContent.content.push({
          type: 'paragraph',
          content: [],
        });
      }

      // Create the journal page
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pageTitle,
          content: initialContent,
          icon: '🎯',
          course_id: courseId,
          week_number: weekNumber,
          entry_type: 'synthesis',
          artifact_name: week?.micro_artifact?.name || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create journal page (${response.status})`);
      }

      const data = await response.json();
      router.push(`/journal/${data.page.id}`);
    } catch (err) {
      console.error('Error creating synthesis artifact:', err);
      setError(err instanceof Error ? err.message : 'Failed to create synthesis artifact');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-4" />
            <p className="text-amber-100">Creating your synthesis artifact...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="max-w-md mx-auto p-6 bg-red-950/20 border border-red-900/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-red-100 mb-2">Failed to load page</h2>
                <p className="text-red-200/80 mb-4">{error}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/journal')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Back to Journal
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return null;
}

export default function NewJournalPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-4" />
              <p className="text-amber-100">Loading...</p>
            </div>
          </div>
          <Footer />
        </>
      }
    >
      <NewJournalPageContent />
    </Suspense>
  );
}
