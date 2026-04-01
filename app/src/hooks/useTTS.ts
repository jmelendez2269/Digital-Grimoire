'use client';

/**
 * React Hook for Text-to-Speech functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createTTSService, TTSService, TTSVoice, TTSConfig, TTSEngine } from '@/lib/services/tts-service';

export interface UseTTSOptions {
  engine?: TTSEngine;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
  azureKey?: string;
  azureRegion?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onBoundary?: (charIndex: number, charLength: number) => void;
  onError?: (error: Error) => void;
}

export function useTTS(options: UseTTSOptions = {}) {
  const [service, setService] = useState<TTSService | null>(null);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textRef = useRef<string>('');
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize TTS service
  useEffect(() => {
    const initService = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const config: TTSConfig = {
          engine: options.engine || 'web-speech',
          rate: options.rate || 1.0,
          pitch: options.pitch || 1.0,
          volume: options.volume || 1.0,
          voice: options.voice,
          azureKey: options.azureKey,
          azureRegion: options.azureRegion,
        };

        const ttsService = await createTTSService(config);

        // Set up event listeners
        ttsService.on('start', () => {
          setIsPlaying(true);
          setIsPaused(false);
          options.onStart?.();
        });

        ttsService.on('end', () => {
          setIsPlaying(false);
          setIsPaused(false);
          options.onEnd?.();
        });

        ttsService.on('pause', () => {
          setIsPaused(true);
          options.onPause?.();
        });

        ttsService.on('resume', () => {
          setIsPaused(false);
          options.onResume?.();
        });

        ttsService.on('boundary', ({ charIndex, charLength }) => {
          setCurrentPosition(charIndex);
          options.onBoundary?.(charIndex, charLength);
        });

        ttsService.on('error', (err) => {
          setError(err.message);
          setIsPlaying(false);
          setIsPaused(false);
          options.onError?.(err);
        });

        // Load voices
        const availableVoices = await ttsService.getVoices();
        setVoices(availableVoices);

        setService(ttsService);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize TTS';
        setError(errorMessage);
        console.error('TTS initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initService();

    return () => {
      if (service) {
        service.stop();
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [options.engine, options.azureKey, options.azureRegion]);

  // Update service configuration when options change
  useEffect(() => {
    if (!service) return;

    if (options.rate !== undefined) {
      service.setRate(options.rate);
    }
    if (options.pitch !== undefined) {
      service.setPitch(options.pitch);
    }
    if (options.volume !== undefined) {
      service.setVolume(options.volume);
    }
    if (options.voice !== undefined) {
      service.setVoice(options.voice);
    }
  }, [service, options.rate, options.pitch, options.volume, options.voice]);

  const speak = useCallback(
    async (text: string, startPosition: number = 0) => {
      if (!service) {
        throw new Error('TTS service not initialized');
      }

      textRef.current = text;
      setCurrentPosition(startPosition);
      setError(null);

      try {
        await service.speak(text, startPosition);
        // Usage tracking for azure is handled server-side in /api/tts/synthesize.
        // No client-side tracking needed.
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to speak';
        setError(errorMessage);
        throw err;
      }
    },
    [service]
  );

  const pause = useCallback(() => {
    if (!service) return;
    service.pause();
  }, [service]);

  const resume = useCallback(() => {
    if (!service) return;
    service.resume();
  }, [service]);

  const stop = useCallback(() => {
    if (!service) return;
    service.stop();
    setIsPlaying(false);
    setIsPaused(false);
  }, [service]);

  const togglePlayPause = useCallback(() => {
    if (!service) return;

    if (isPlaying) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    }
  }, [service, isPlaying, isPaused, pause, resume]);

  return {
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
    isSupported: service?.isSupported() ?? false,
  };
}

