/**
 * Text-to-Speech Service
 * Unified interface for TTS operations supporting multiple engines
 */

export type TTSEngine = 'web-speech' | 'azure';

export interface TTSVoice {
  id: string;
  name: string;
  lang: string;
  gender?: 'male' | 'female' | 'neutral';
  isPremium?: boolean;
}

export interface TTSConfig {
  engine: TTSEngine;
  voice?: string;
  rate: number; // 0.5 to 2.0
  pitch: number; // 0 to 2.0
  volume: number; // 0 to 1.0
  azureKey?: string;
  azureRegion?: string;
}

export interface TTSEventMap {
  start: () => void;
  end: () => void;
  pause: () => void;
  resume: () => void;
  boundary: (event: { charIndex: number; charLength: number; name?: string }) => void;
  error: (error: Error) => void;
}

export abstract class TTSService {
  protected config: TTSConfig;
  protected listeners: Map<keyof TTSEventMap, Set<Function>> = new Map();
  protected currentText: string = '';
  protected currentPosition: number = 0;
  protected isPlaying: boolean = false;
  protected isPaused: boolean = false;

  constructor(config: TTSConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract getVoices(): Promise<TTSVoice[]>;
  abstract speak(text: string, startPosition?: number): Promise<void>;
  abstract pause(): void;
  abstract resume(): void;
  abstract stop(): void;
  abstract isSupported(): boolean;

  setRate(rate: number): void {
    this.config.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  setPitch(pitch: number): void {
    this.config.pitch = Math.max(0, Math.min(2.0, pitch));
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1.0, volume));
  }

  setVoice(voiceId: string): void {
    this.config.voice = voiceId;
  }

  getConfig(): TTSConfig {
    return { ...this.config };
  }

  getCurrentPosition(): number {
    return this.currentPosition;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  on<K extends keyof TTSEventMap>(event: K, callback: TTSEventMap[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as Function);
  }

  off<K extends keyof TTSEventMap>(event: K, callback: TTSEventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as Function);
    }
  }

  protected emit<K extends keyof TTSEventMap>(
    event: K,
    ...args: Parameters<TTSEventMap[K]>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args));
    }
  }

  protected updatePosition(position: number): void {
    this.currentPosition = position;
  }
}

/**
 * Factory function to create TTS service based on engine type
 */
export async function createTTSService(config: TTSConfig): Promise<TTSService> {
  let service: TTSService;

  if (config.engine === 'azure') {
    const { ServerProxyTTS } = await import('./server-proxy-tts');
    service = new ServerProxyTTS(config);
  } else {
    const { WebSpeechTTS } = await import('./web-speech-tts');
    service = new WebSpeechTTS(config);
  }

  await service.initialize();
  return service;
}

