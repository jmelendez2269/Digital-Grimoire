// Transcript generation service using OpenAI Whisper API
// Generates transcripts for audio and video files

import OpenAI from 'openai';

export interface TranscriptResult {
  success: boolean;
  transcript?: string;
  language?: string;
  segments?: TranscriptSegment[];
  error?: string;
}

export interface TranscriptSegment {
  start: number; // Start time in seconds
  end: number; // End time in seconds
  text: string; // Transcript text
}

/**
 * Generate transcript from audio/video file using OpenAI Whisper API
 */
export async function generateTranscript(
  audioUrl: string,
  language?: string // Optional language code (e.g., 'en', 'es', 'fr')
): Promise<TranscriptResult> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Add OPENAI_API_KEY to .env.local');
    }

    const openai = new OpenAI({ apiKey });

    console.log(`🎤 Generating transcript from audio/video: ${audioUrl}`);
    
    // Fetch the audio/video file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio file: ${audioResponse.statusText}`);
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });
    
    // Create a File-like object for OpenAI API
    // OpenAI Whisper API accepts File, Blob, or ReadableStream
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    if (language) {
      formData.append('language', language);
    }
    // Optional: Enable timestamp generation
    formData.append('response_format', 'verbose_json');
    
    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `Whisper API error: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Parse response
    let transcript = '';
    let segments: TranscriptSegment[] = [];
    
    if (result.text) {
      transcript = result.text;
    }
    
    if (result.segments && Array.isArray(result.segments)) {
      segments = result.segments.map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      }));
    }
    
    console.log(`✅ Transcript generated: ${transcript.length} characters, ${segments.length} segments`);
    
    return {
      success: true,
      transcript,
      language: result.language || language || 'en',
      segments,
    };
  } catch (error) {
    console.error('Transcript generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate transcript with timestamps for synchronization
 * Returns transcript with word-level timestamps if available
 */
export async function generateTranscriptWithTimestamps(
  audioUrl: string,
  language?: string
): Promise<TranscriptResult> {
  // Use the same function but ensure verbose_json format is used
  return generateTranscript(audioUrl, language);
}

/**
 * Format transcript with timestamps for display
 */
export function formatTranscriptWithTimestamps(
  segments: TranscriptSegment[]
): string {
  return segments
    .map((seg) => {
      const startTime = formatTime(seg.start);
      return `[${startTime}] ${seg.text}`;
    })
    .join('\n\n');
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

