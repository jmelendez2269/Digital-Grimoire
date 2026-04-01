/**
 * Server-side proxy TTS implementation.
 * Calls /api/tts/synthesize instead of the Azure SDK directly, keeping Azure
 * credentials server-side and enforcing quota before synthesis.
 */

import { TTSService, TTSVoice, TTSConfig } from './tts-service';

const AZURE_VOICES: TTSVoice[] = [
  { id: 'en-US-AriaNeural',    name: 'Aria (US English, Female)',      lang: 'en-US', gender: 'female', isPremium: true },
  { id: 'en-US-GuyNeural',     name: 'Guy (US English, Male)',         lang: 'en-US', gender: 'male',   isPremium: true },
  { id: 'en-US-JennyNeural',   name: 'Jenny (US English, Female)',     lang: 'en-US', gender: 'female', isPremium: true },
  { id: 'en-GB-SoniaNeural',   name: 'Sonia (UK English, Female)',     lang: 'en-GB', gender: 'female', isPremium: true },
  { id: 'en-GB-RyanNeural',    name: 'Ryan (UK English, Male)',        lang: 'en-GB', gender: 'male',   isPremium: true },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (Australian, Female)',   lang: 'en-AU', gender: 'female', isPremium: true },
  { id: 'en-IN-NeerjaNeural',  name: 'Neerja (Indian English, Female)',lang: 'en-IN', gender: 'female', isPremium: true },
];

export class ServerProxyTTS extends TTSService {
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private stopRequested = false;

  constructor(config: TTSConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    // AudioContext is created lazily on first speak() to avoid autoplay restrictions
  }

  async getVoices(): Promise<TTSVoice[]> {
    return AZURE_VOICES;
  }

  async speak(text: string, startPosition: number = 0): Promise<void> {
    this.stop();
    this.stopRequested = false;

    const textToSpeak = startPosition > 0 ? text.substring(startPosition) : text;
    this.currentText = text;
    this.currentPosition = startPosition;
    this.isPlaying = true;
    this.emit('start');

    try {
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voice: this.config.voice ?? 'en-US-AriaNeural',
          rate: this.config.rate,
          pitch: this.config.pitch,
          volume: this.config.volume,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Synthesis failed (${response.status})`);
      }

      if (this.stopRequested) return;

      const audioData = await response.arrayBuffer();

      if (this.stopRequested) return;

      await this.playAudio(audioData);

      if (!this.stopRequested) {
        this.isPlaying = false;
        this.emit('end');
      }
    } catch (err) {
      this.isPlaying = false;
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    }
  }

  private async playAudio(data: ArrayBuffer): Promise<void> {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const buffer = await this.audioCtx.decodeAudioData(data);
    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);
    this.currentSource = source;

    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start(0);
    });
  }

  pause(): void {
    if (this.audioCtx?.state === 'running') {
      this.audioCtx.suspend();
      this.isPaused = true;
      this.emit('pause');
    }
  }

  resume(): void {
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
      this.isPaused = false;
      this.emit('resume');
    }
  }

  stop(): void {
    this.stopRequested = true;
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* already stopped */ }
      this.currentSource = null;
    }
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    this.isPlaying = false;
    this.isPaused = false;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof AudioContext !== 'undefined';
  }
}
