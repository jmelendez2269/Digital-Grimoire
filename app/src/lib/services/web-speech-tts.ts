/**
 * Web Speech API TTS Implementation
 * Free, browser-based text-to-speech using the Speech Synthesis API
 */

import { TTSService, TTSVoice, TTSConfig } from './tts-service';

export class WebSpeechTTS extends TTSService {
  private synth: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor(config: TTSConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('Web Speech API is not supported in this browser');
    }

    this.synth = window.speechSynthesis;

    // Load voices (may require a delay on some browsers)
    await this.loadVoices();
  }

  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        this.voices = voices;
        resolve();
        return;
      }

      // Some browsers require waiting for voiceschanged event
      const handleVoicesChanged = () => {
        if (this.synth) {
          this.voices = this.synth.getVoices();
          this.synth.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve();
        }
      };

      this.synth.addEventListener('voiceschanged', handleVoicesChanged);

      // Timeout fallback
      setTimeout(() => {
        if (this.synth) {
          this.voices = this.synth.getVoices();
          this.synth.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve();
        }
      }, 1000);
    });
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (this.voices.length === 0) {
      await this.loadVoices();
    }

    return this.voices.map((voice) => ({
      id: voice.name,
      name: voice.name,
      lang: voice.lang,
      isPremium: false,
    }));
  }

  async speak(text: string, startPosition: number = 0): Promise<void> {
    if (!this.synth) {
      throw new Error('Speech synthesis not initialized');
    }

    // Stop any ongoing speech
    this.stop();

    this.currentText = text;
    this.currentPosition = startPosition;

    // Extract text from startPosition
    const textToSpeak = startPosition > 0 ? text.substring(startPosition) : text;

    this.utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Configure utterance
    this.utterance.rate = this.config.rate;
    this.utterance.pitch = this.config.pitch;
    this.utterance.volume = this.config.volume;

    // Set voice if specified
    if (this.config.voice) {
      const voice = this.voices.find((v) => v.name === this.config.voice);
      if (voice) {
        this.utterance.voice = voice;
      }
    }

    // Event handlers
    this.utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.emit('start');
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.emit('end');
    };

    this.utterance.onerror = (event) => {
      this.isPlaying = false;
      this.isPaused = false;
      this.emit('error', new Error(event.error));
    };

    this.utterance.onpause = () => {
      this.isPaused = true;
      this.emit('pause');
    };

    this.utterance.onresume = () => {
      this.isPaused = false;
      this.emit('resume');
    };

    // Boundary events for text highlighting
    this.utterance.onboundary = (event) => {
      const charIndex = startPosition + event.charIndex;
      this.updatePosition(charIndex);
      this.emit('boundary', {
        charIndex,
        charLength: event.charLength || 1,
        name: event.name,
      });
    };

    this.synth.speak(this.utterance);
  }

  pause(): void {
    if (this.synth && this.isPlaying && !this.isPaused) {
      this.synth.pause();
    }
  }

  resume(): void {
    if (this.synth && this.isPlaying && this.isPaused) {
      this.synth.resume();
    }
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      this.utterance = null;
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  setRate(rate: number): void {
    super.setRate(rate);
    if (this.utterance) {
      this.utterance.rate = this.config.rate;
    }
  }

  setPitch(pitch: number): void {
    super.setPitch(pitch);
    if (this.utterance) {
      this.utterance.pitch = this.config.pitch;
    }
  }

  setVolume(volume: number): void {
    super.setVolume(volume);
    if (this.utterance) {
      this.utterance.volume = this.config.volume;
    }
  }
}

