'use client';

/**
 * AudioPlayer Component
 * Floating audio control bar for PDF read-aloud functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  ChevronDown, 
  ChevronUp,
  Settings,
  Sparkles,
  Volume
} from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';
import { TTSEngine, TTSVoice } from '@/lib/services/tts-service';
import { extractPDFText } from '@/lib/utils/pdf-text-extractor';
import { cleanHtmlText } from '@/lib/utils/formatting';
import TTSSettings from './TTSSettings';

export interface AudioPlayerControls {
  startFromPosition: (charIndex: number) => void;
}

export interface AudioPlayerProps {
  documentId: string;
  ocrText?: string | null;
  pdfUrl?: string | null;
  onHighlight?: (charIndex: number, charLength: number) => void;
  onReady?: (controls: AudioPlayerControls) => void;
  defaultCollapsed?: boolean;
}

type TextSource = 'ocr' | 'pdf';

export default function AudioPlayer({
  documentId,
  ocrText,
  pdfUrl,
  onHighlight,
  onReady,
  defaultCollapsed = false,
}: AudioPlayerProps) {
  // UI State
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [showSettings, setShowSettings] = useState(false);
  const [textSource, setTextSource] = useState<TextSource>('ocr');
  const [currentText, setCurrentText] = useState<string>('');
  const [extractingPdf, setExtractingPdf] = useState(false);

  // TTS Settings from localStorage
  const [engine, setEngine] = useState<TTSEngine>('web-speech');
  const [rate, setRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>();
  const [ttsCapExceeded, setTtsCapExceeded] = useState(false);

  // Check TTS cap when azure engine is active; fall back to web-speech if exceeded
  useEffect(() => {
    if (engine !== 'azure') return;
    fetch('/api/tts/check')
      .then((r) => r.json())
      .then((data) => {
        if (!data.allowed) {
          setTtsCapExceeded(true);
          setEngine('web-speech');
          setSelectedVoice(undefined);
        }
      })
      .catch(() => {});
  }, [engine]);

  // Load preferences from localStorage
  useEffect(() => {
    const prefs = localStorage.getItem(`tts-prefs-${documentId}`);
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs);
        setEngine(parsed.engine || 'web-speech');
        setRate(parsed.rate || 1.0);
        setVolume(parsed.volume || 1.0);
        setSelectedVoice(parsed.voice);
        setTextSource(parsed.textSource || 'ocr');
      } catch (err) {
        console.error('Error loading TTS preferences:', err);
      }
    }

  }, [documentId]);

  // Save preferences to localStorage
  const savePreferences = useCallback(() => {
    const prefs = {
      engine,
      rate,
      volume,
      voice: selectedVoice,
      textSource,
    };
    localStorage.setItem(`tts-prefs-${documentId}`, JSON.stringify(prefs));
  }, [documentId, engine, rate, volume, selectedVoice, textSource]);

  useEffect(() => {
    savePreferences();
  }, [savePreferences]);

  // Initialize TTS
  const {
    speak,
    pause,
    resume,
    stop,
    togglePlayPause,
    voices,
    isPlaying,
    isPaused,
    currentPosition,
    isInitializing,
    error,
  } = useTTS({
    engine,
    rate,
    volume,
    voice: selectedVoice,
    onBoundary: (charIndex, charLength) => {
      onHighlight?.(charIndex, charLength);
      // Update position in localStorage for bookmarking
      localStorage.setItem(`tts-position-${documentId}`, charIndex.toString());
    },
    onEnd: () => {
      // Clear position when finished
      localStorage.removeItem(`tts-position-${documentId}`);
    },
  });

  // Use ref to track playing state for cleanup handlers
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Extract text from PDF if needed
  useEffect(() => {
    const loadText = async () => {
      if (textSource === 'pdf' && pdfUrl) {
        setExtractingPdf(true);
        try {
          const extracted = await extractPDFText(pdfUrl);
          setCurrentText(extracted.fullText);
        } catch (err) {
          console.error('Error extracting PDF text:', err);
          // Fallback to OCR
          if (ocrText) {
            const cleaned = cleanHtmlText(ocrText);
            setCurrentText(cleaned);
            setTextSource('ocr');
          }
        } finally {
          setExtractingPdf(false);
        }
      } else if (textSource === 'ocr' && ocrText) {
        // Always clean HTML text to ensure TTS doesn't read HTML tags
        // This is especially important for HTML documents
        const cleanedText = cleanHtmlText(ocrText);
        
        // Debug: Always log when we have HTML text (even if cleaning didn't change it)
        const hasHtml = ocrText.includes('<') || ocrText.includes('&');
        if (hasHtml) {
          console.log('[AudioPlayer] Processing HTML text for TTS:', {
            originalLength: ocrText.length,
            cleanedLength: cleanedText.length,
            wasChanged: ocrText !== cleanedText,
            originalPreview: ocrText.substring(0, 200),
            cleanedPreview: cleanedText.substring(0, 200)
          });
        }
        
        setCurrentText(cleanedText);
      } else if (!ocrText && !pdfUrl) {
        console.warn('[AudioPlayer] No text source available');
        setCurrentText('');
      }
    };

    loadText();
  }, [textSource, pdfUrl, ocrText]);

  // Handle play
  const handlePlay = async (startPosition?: number) => {
    if (!currentText) return;

    // Use provided position or load saved position
    let position = startPosition;
    if (position === undefined) {
      const savedPosition = localStorage.getItem(`tts-position-${documentId}`);
      position = savedPosition ? parseInt(savedPosition, 10) : 0;
    }

    try {
      await speak(currentText, position);
    } catch (err) {
      console.error('Error playing audio:', err);
    }
  };

  // Expose controls to parent component
  useEffect(() => {
    if (onReady && currentText) {
      onReady({
        startFromPosition: (charIndex: number) => {
          // Validate position
          if (charIndex < 0 || charIndex >= currentText.length) {
            console.warn('[AudioPlayer] Invalid position for startFromPosition', {
              charIndex,
              textLength: currentText.length
            });
            return;
          }

          // Stop current playback if any
          if (isPlaying) {
            stop();
          }
          
          // Clear any saved position to prevent resuming from wrong place
          localStorage.removeItem(`tts-position-${documentId}`);
          
          console.log('[AudioPlayer] Starting from position', {
            charIndex,
            textLength: currentText.length,
            remainingChars: currentText.length - charIndex,
            preview: currentText.substring(charIndex, charIndex + 50)
          });
          
          // Start from the clicked position
          handlePlay(charIndex);
        },
      });
    }
  }, [onReady, currentText, isPlaying, documentId, stop, handlePlay]);

  // Handle pause/resume
  const handleTogglePlayPause = () => {
    if (isPlaying && isPaused) {
      resume();
    } else if (isPlaying) {
      pause();
    } else {
      handlePlay();
    }
  };

  // Handle stop
  const handleStop = () => {
    stop();
    localStorage.removeItem(`tts-position-${documentId}`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handleTogglePlayPause();
          break;
        case 'escape':
          e.preventDefault();
          handleStop();
          break;
        case 'arrowup':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setVolume((v) => Math.min(1, v + 0.1));
          }
          break;
        case 'arrowdown':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setVolume((v) => Math.max(0, v - 0.1));
          }
          break;
        case 'arrowright':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setRate((r) => Math.min(2, r + 0.1));
          }
          break;
        case 'arrowleft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setRate((r) => Math.max(0.5, r - 0.1));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, isPaused]);

  // Stop TTS when component unmounts or page unloads/refreshes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isPlayingRef.current) {
        stop();
      }
    };

    const handleUnload = () => {
      if (isPlayingRef.current) {
        stop();
      }
    };

    // Add event listeners for page navigation/refresh
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    // Stop on component unmount and cleanup event listeners
    return () => {
      if (isPlayingRef.current) {
        stop();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [stop]);

  // Calculate progress percentage
  const progress = currentText.length > 0 
    ? (currentPosition / currentText.length) * 100 
    : 0;

  // Format time remaining (rough estimate based on rate and remaining characters)
  const remainingChars = currentText.length - currentPosition;
  const charsPerMinute = 1000 * rate; // Rough estimate
  const remainingMinutes = Math.ceil(remainingChars / charsPerMinute);

  if (!ocrText && !pdfUrl) {
    return null; // No text available to read
  }

  return (
    <>
      {/* Read Aloud Button - Shown when collapsed */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
          aria-label="Open Read Aloud player"
        >
          <Volume className="w-5 h-5" />
          <span className="font-medium">Read Aloud</span>
        </button>
      )}

      {/* Floating Audio Player */}
      {isExpanded && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 border-t border-amber-900/20 backdrop-blur-lg">
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute -top-10 right-4 p-2 bg-zinc-900/95 border border-amber-900/20 rounded-t-lg hover:bg-zinc-800 transition-colors"
            aria-label="Collapse player"
          >
            <ChevronDown className="w-5 h-5 text-amber-400" />
          </button>

          <div className="max-w-7xl mx-auto px-6 py-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-amber-100/60 mb-2">
                <span>Reading Progress</span>
                <span>
                  {isPlaying && remainingMinutes > 0 
                    ? `~${remainingMinutes} min remaining`
                    : `${Math.round(progress)}%`
                  }
                </span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Play/Pause/Stop Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlayPause}
                  disabled={isInitializing || extractingPdf || !currentText}
                  className="p-3 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  aria-label={isPlaying ? (isPaused ? 'Resume' : 'Pause') : 'Play'}
                >
                  {isPlaying && !isPaused ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={handleStop}
                  disabled={!isPlaying}
                  className="p-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 text-amber-100 rounded-lg transition-colors"
                  aria-label="Stop"
                >
                  <Square className="w-5 h-5" />
                </button>
              </div>

              {/* Text Source Toggle */}
              {ocrText && pdfUrl && (
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
                  <span className="text-xs text-amber-100/60">Source:</span>
                  <button
                    onClick={() => setTextSource('ocr')}
                    disabled={isPlaying}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      textSource === 'ocr'
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-100/60 hover:text-amber-100'
                    }`}
                  >
                    OCR Text
                  </button>
                  <button
                    onClick={() => setTextSource('pdf')}
                    disabled={isPlaying}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      textSource === 'pdf'
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-100/60 hover:text-amber-100'
                    }`}
                  >
                    PDF Text
                  </button>
                </div>
              )}

              {/* Speed Control */}
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
                <span className="text-xs text-amber-100/60">Speed:</span>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-24 h-1 accent-amber-600"
                  aria-label="Playback speed"
                />
                <span className="text-xs text-amber-100 w-8">{rate.toFixed(1)}x</span>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
                <Volume2 className="w-4 h-4 text-amber-100/60" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 accent-amber-600"
                  aria-label="Volume"
                />
              </div>

              {/* Voice Selector */}
              <select
                value={selectedVoice || ''}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={isPlaying}
                className="px-3 py-2 bg-zinc-800 text-amber-100 text-sm rounded-lg border border-zinc-700 focus:border-amber-600 focus:outline-none disabled:opacity-50"
                aria-label="Select voice"
              >
                <option value="">Default Voice</option>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} {voice.isPremium && '✨'}
                  </option>
                ))}
              </select>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg transition-colors flex items-center gap-2"
                aria-label="TTS Settings"
              >
                {engine === 'azure' && <Sparkles className="w-4 h-4 text-amber-400" />}
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Status Messages */}
            {(isInitializing || extractingPdf) && (
              <div className="mt-2 text-xs text-amber-100/60 text-center">
                {isInitializing && 'Initializing text-to-speech...'}
                {extractingPdf && 'Extracting text from PDF...'}
              </div>
            )}

            {ttsCapExceeded && (
              <div className="mt-2 text-xs text-amber-400/80 text-center">
                Monthly premium TTS limit reached — switched to free voices.
              </div>
            )}

            {error && (
              <div className="mt-2 text-xs text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Keyboard Shortcuts Help */}
            <div className="mt-2 text-xs text-amber-100/40 text-center">
              Shortcuts: <kbd className="px-1 py-0.5 bg-zinc-800 rounded">Space</kbd> Play/Pause • 
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded ml-1">Esc</kbd> Stop • 
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded ml-1">Ctrl+↑↓</kbd> Volume • 
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded ml-1">Ctrl+←→</kbd> Speed
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <TTSSettings
          currentEngine={engine}
          onEngineChange={setEngine}
          onAzureCredentials={(key: string, region: string) => {
            // Save to localStorage
            localStorage.setItem('tts-azure-credentials', JSON.stringify({ key, region }));
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

