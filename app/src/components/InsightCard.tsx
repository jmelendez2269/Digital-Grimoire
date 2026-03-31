'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Compass, BookOpen, Quote, X, Pin, RefreshCw } from 'lucide-react';

interface Insight {
  id: string;
  title: string;
  hook: string;
  source_type: 'blog' | 'convergence_concept' | 'text' | 'parallax_response';
  source_id?: string;
  concept_search_terms?: string[];
  blog_slug?: string;
}

export default function InsightCard() {
  const router = useRouter();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isPinning, setIsPinning] = useState(false);

  const fetchInsight = useCallback(async () => {
    setLoading(true);
    try {
      // Add a timestamp to bypass any caching for a new random insight
      const response = await fetch(`/api/insights/today?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch insight');
      const data = await response.json();
      setInsight(data.insight);
      setError(null);
    } catch (err) {
      console.error('Error fetching insight:', err);
      setError('Failed to load insight');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Quick check if user dismissed this session
    if (localStorage.getItem('dismissedInsight') === new Date().toDateString()) {
      setIsVisible(false);
      return;
    }
    
    fetchInsight();
  }, [fetchInsight]);

  const handleDismiss = () => {
    localStorage.setItem('dismissedInsight', new Date().toDateString());
    setIsVisible(false);
  };

  const handlePin = async () => {
    if (!insight || isPinning) return;
    setIsPinning(true);
    
    try {
      // Create a journal entry from this insight
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: insight.hook }]
          }
        ]
      };
      
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Insight: ${insight.title}`,
          content: content,
          icon: '✨',
          is_pinned: true,
          entry_type: 'free'
        }),
      });
      
      if (!response.ok) throw new Error('Failed to pin to journal');
      
      const data = await response.json();
      router.push(`/journal/${data.page.id}`);
    } catch (err) {
      console.error('Failed to pin:', err);
      alert('Failed to pin to journal');
      setIsPinning(false);
    }
  };

  if (!isVisible || loading || error || !insight) return null;

  // Determine read more link
  let readMoreUrl = null;
  if (insight.source_type === 'blog' && insight.blog_slug) {
    readMoreUrl = `/blog/${insight.blog_slug}`;
  } else if (insight.source_type === 'text' && insight.source_id) {
    readMoreUrl = `/library/${insight.source_id}`;
  }

  // Determine explore this link (Parallax Engine)
  let exploreUrl = `/parallax-engine?query=${encodeURIComponent(insight.hook || insight.title)}`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-zinc-900/80 via-zinc-900/90 to-amber-900/10 mb-8 backdrop-blur-sm group">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative p-6 sm:p-8">
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Dismiss for today"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 text-amber-500/80 font-medium tracking-wide text-sm uppercase">
          <Sparkles className="w-4 h-4" />
          Today's Insight
        </div>
        
        <h3 className="text-xl font-bold text-zinc-100 mb-4 font-serif">
          {insight.title}
        </h3>
        
        <div className="relative pl-6 mb-8">
          <Quote className="absolute top-0 left-0 w-4 h-4 text-amber-500/30 -translate-x-1 translate-y-1" />
          <p className="text-lg text-zinc-300 italic leading-relaxed">
            {insight.hook}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {exploreUrl && (
            <Link
              href={exploreUrl}
              className="px-4 py-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors font-medium border border-purple-500/20 text-sm flex items-center gap-2"
            >
              Explore in Parallax <Compass className="w-4 h-4" />
            </Link>
          )}
          
          {readMoreUrl && (
            <Link
              href={readMoreUrl}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-amber-300 hover:bg-zinc-700 transition-colors text-sm flex items-center gap-2 border border-zinc-700 hover:border-amber-500/30"
            >
              <BookOpen className="w-4 h-4" />
              Source Material
            </Link>
          )}

          <button
            onClick={fetchInsight}
            className="px-4 py-2 rounded-lg bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-sm flex items-center gap-2 border border-zinc-700"
            title="Get another random insight"
          >
            <RefreshCw className="w-4 h-4" />
            Randomize
          </button>
          
          <button
            onClick={handlePin}
            disabled={isPinning}
            className="px-4 py-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-sm flex items-center gap-2 ml-auto"
            title="Save this quote to your journal"
          >
            <Pin className={`w-4 h-4 ${isPinning ? 'animate-pulse' : ''}`} />
            {isPinning ? 'Pinning...' : 'Pin to Journal'}
          </button>
        </div>
      </div>
    </div>
  );
}
