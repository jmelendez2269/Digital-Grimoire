/**
 * Azure Cognitive Services Speech TTS Implementation
 * Premium, high-quality neural text-to-speech
 */

import { TTSService, TTSVoice, TTSConfig } from './tts-service';

export class AzureSpeechTTS extends TTSService {
  private sdk: any = null;
  private synthesizer: any = null;
  private isInitialized: boolean = false;

  constructor(config: TTSConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    if (!this.config.azureKey || !this.config.azureRegion) {
      throw new Error('Azure Speech credentials not provided');
    }

    try {
      // Dynamically import Azure SDK (only loaded when premium is enabled)
      this.sdk = await import('microsoft-cognitiveservices-speech-sdk');
      
      const speechConfig = this.sdk.SpeechConfig.fromSubscription(
        this.config.azureKey,
        this.config.azureRegion
      );

      // Set default voice if specified
      if (this.config.voice) {
        speechConfig.speechSynthesisVoiceName = this.config.voice;
      }

      // Create synthesizer with no audio output (we'll handle playback)
      this.synthesizer = new this.sdk.SpeechSynthesizer(speechConfig);
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Azure Speech: ${error}`);
    }
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (!this.isInitialized) {
      throw new Error('Azure Speech not initialized');
    }

    // Return a curated list of popular Azure neural voices
    // In production, you could fetch the full list from Azure API
    return [
      { id: 'en-US-AriaNeural', name: 'Aria (US English, Female)', lang: 'en-US', gender: 'female', isPremium: true },
      { id: 'en-US-GuyNeural', name: 'Guy (US English, Male)', lang: 'en-US', gender: 'male', isPremium: true },
      { id: 'en-US-JennyNeural', name: 'Jenny (US English, Female)', lang: 'en-US', gender: 'female', isPremium: true },
      { id: 'en-GB-SoniaNeural', name: 'Sonia (UK English, Female)', lang: 'en-GB', gender: 'female', isPremium: true },
      { id: 'en-GB-RyanNeural', name: 'Ryan (UK English, Male)', lang: 'en-GB', gender: 'male', isPremium: true },
      { id: 'en-AU-NatashaNeural', name: 'Natasha (Australian, Female)', lang: 'en-AU', gender: 'female', isPremium: true },
      { id: 'en-IN-NeerjaNeural', name: 'Neerja (Indian English, Female)', lang: 'en-IN', gender: 'female', isPremium: true },
    ];
  }

  async speak(text: string, startPosition: number = 0): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Azure Speech not initialized');
    }

    this.stop();

    this.currentText = text;
    this.currentPosition = startPosition;

    const textToSpeak = startPosition > 0 ? text.substring(startPosition) : text;

    // Build SSML for better control
    const ssml = this.buildSSML(textToSpeak);

    this.isPlaying = true;
    this.emit('start');

    return new Promise((resolve, reject) => {
      this.synthesizer.speakSsmlAsync(
        ssml,
        (result: any) => {
          if (result.reason === this.sdk.ResultReason.SynthesizingAudioCompleted) {
            this.isPlaying = false;
            this.emit('end');
            resolve();
          } else {
            this.isPlaying = false;
            const error = new Error(`Speech synthesis failed: ${result.errorDetails}`);
            this.emit('error', error);
            reject(error);
          }
        },
        (error: any) => {
          this.isPlaying = false;
          const err = new Error(`Speech synthesis error: ${error}`);
          this.emit('error', err);
          reject(err);
        }
      );
    });
  }

  private buildSSML(text: string): string {
    const voice = this.config.voice || 'en-US-AriaNeural';
    const rate = this.getRateString(this.config.rate);
    const pitch = this.getPitchString(this.config.pitch);
    const volume = Math.round(this.config.volume * 100);

    return `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voice}">
          <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
            ${this.escapeXml(text)}
          </prosody>
        </voice>
      </speak>
    `.trim();
  }

  private getRateString(rate: number): string {
    // Convert 0.5-2.0 to percentage
    const percentage = Math.round((rate - 1) * 100);
    return percentage >= 0 ? `+${percentage}%` : `${percentage}%`;
  }

  private getPitchString(pitch: number): string {
    // Convert 0-2.0 to relative pitch
    const relative = (pitch - 1) * 50; // -50% to +50%
    return relative >= 0 ? `+${relative}%` : `${relative}%`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  pause(): void {
    // Azure SDK doesn't support pause/resume in browser
    // We would need to implement this using audio playback controls
    console.warn('Pause not supported with Azure Speech in browser');
  }

  resume(): void {
    console.warn('Resume not supported with Azure Speech in browser');
  }

  stop(): void {
    if (this.synthesizer) {
      this.synthesizer.close();
      this.isPlaying = false;
      this.isPaused = false;
    }
  }

  isSupported(): boolean {
    return !!(this.config.azureKey && this.config.azureRegion);
  }
}

