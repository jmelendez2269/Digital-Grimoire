'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Clock, CheckCircle2 } from 'lucide-react';

interface ReadingProgressProps {
  textId: string;
  totalPages?: number;
  onProgressUpdate?: (progress: number) => void;
}

interface Progress {
  current_page: number;
  total_pages: number | null;
  progress_percent: number;
  time_spent_seconds: number;
  completed: boolean;
}

export default function ReadingProgress({
  textId,
  totalPages,
  onProgressUpdate,
}: ReadingProgressProps) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [textId]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/reading-progress?text_id=${textId}`);
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error fetching reading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (updates: Partial<Progress>) => {
    try {
      const response = await fetch('/api/reading-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_id: textId,
          ...updates,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
        onProgressUpdate?.(data.progress.progress_percent);
      }
    } catch (error) {
      console.error('Error updating reading progress:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const markAsCompleted = async () => {
    await updateProgress({
      completed: true,
      progress_percent: 100,
    });
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4 animate-pulse">
        <div className="h-20 bg-zinc-800/50 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-amber-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-600" />
          Reading Progress
        </h3>
        {progress?.completed && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )}
      </div>

      {progress ? (
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-amber-100/60">
              <span>
                {progress.current_page} of {progress.total_pages || totalPages || '?'} pages
              </span>
              <span>{Math.round(progress.progress_percent)}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-300"
                style={{ width: `${progress.progress_percent}%` }}
              />
            </div>
          </div>

          {/* Time Spent */}
          {progress.time_spent_seconds > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-100/60">
              <Clock className="w-3 h-3" />
              <span>Time spent: {formatTime(progress.time_spent_seconds)}</span>
            </div>
          )}

          {/* Mark as Complete Button */}
          {!progress.completed && progress.progress_percent > 80 && (
            <button
              onClick={markAsCompleted}
              className="w-full mt-2 py-2 px-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-3 h-3" />
              Mark as Completed
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-100/60">
          Start reading to track your progress
        </p>
      )}
    </div>
  );
}

// Hook for tracking reading progress
export function useReadingProgressTracker(textId: string, totalPages?: number) {
  const [currentPage, setCurrentPage] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    setStartTime(Date.now());
    return () => {
      if (startTime) {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        saveProgress(timeSpent);
      }
    };
  }, []);

  const saveProgress = async (timeSpent: number = 0) => {
    try {
      const progressPercent = totalPages ? (currentPage / totalPages) * 100 : 0;
      
      await fetch('/api/reading-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_id: textId,
          current_page: currentPage,
          total_pages: totalPages,
          progress_percent: progressPercent,
          time_spent_seconds: timeSpent,
        }),
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const updatePage = (page: number) => {
    setCurrentPage(page);
    if (totalPages) {
      const progressPercent = (page / totalPages) * 100;
      saveProgress();
    }
  };

  return { currentPage, updatePage };
}

