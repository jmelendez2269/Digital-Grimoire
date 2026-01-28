// Nano Banana AI cover generation service
// Powered by Google's Gemini models via Google AI Studio

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeneratedCoverResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  creditsUsed?: number;
}

/**
 * Check if the Google/Nano Banana service is configured and available
 */
export async function checkNanoBananaStatus(): Promise<{
  configured: boolean;
  available: boolean;
  credits?: number;
  error?: string;
}> {
  try {
    const apiKey = process.env.NANO_BANANA_API_KEY;

    if (!apiKey) {
      return {
        configured: false,
        available: false,
        error: 'API key not configured',
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try multiple models for availability check
    const modelsToCheck = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-001", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    let lastError;

    for (const modelName of modelsToCheck) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        await model.generateContent("ping");
        return {
          configured: true,
          available: true,
          credits: 100,
        };
      } catch (err) {
        console.warn(`[NanoBanana] Check failed for model ${modelName}:`, err);
        lastError = err;
      }
    }

    throw lastError || new Error("All models failed check");

  } catch (error) {
    return {
      configured: !!process.env.NANO_BANANA_API_KEY,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate a book cover using Google Gemini
 * Uses SVG generation strategy to ensure compatibility with standard text models
 */
export async function generateBookCover(
  title: string,
  author: string,
  domain: string,
  tags?: string[]
): Promise<GeneratedCoverResult> {
  try {
    console.log(`\n🎨 Generating AI cover with Google Gemini for: "${title}" by ${author}`);

    const apiKey = process.env.NANO_BANANA_API_KEY;
    if (!apiKey) {
      throw new Error('NANO_BANANA_API_KEY not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Fallback strategy: Try models in order of preference
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-001", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

    let result;
    let modelUsed;
    let generationError;

    const tagContext = tags && tags.length > 0
      ? `Themes: ${tags.slice(0, 5).join(', ')}.`
      : '';

    // Request an SVG code block
    const prompt = `You are an expert book cover designer.
    Create a highly detailed, artistic SVG code for a vintage book cover for:
    Title: "${title}"
    Author: ${author}
    Subject: ${domain}
    ${tagContext}
    
    DESIGN REQUIREMENTS:
    - Aspect Ratio: 2:3 (e.g. 600x900)
    - Style: Dark Academia, Antique, Mystical, Vintage Hardcover.
    - Colors: Deep rich tones (Burgundy, Navy, Forest Green, Void Black) with Gold/Bronze accents.
    - Typography: Classic Serif, elegant, legible.
    - Graphics: Include symbolic geometric patterns, ornate borders, and a central mystical symbol relevant to the subject.
    - OUTPUT MUST BE VALID SVG CODE ONLY.
    - Do not use external images. Use SVG paths, gradients, and filters to create texture and depth.
    - Add a paper texture effect using SVG filters if possible.
    
    Respond ONLY with the SVG code block. Start with <svg and end with </svg>.`;

    for (const modelName of models) {
      try {
        console.log(`[NanoBanana] Attempting generation with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const chatResult = await model.generateContent(prompt);
        const response = await chatResult.response;
        const text = response.text();
        if (text) {
          result = text;
          modelUsed = modelName;
          break;
        }
      } catch (err: any) {
        console.warn(`[NanoBanana] Model ${modelName} failed:`, err.message);
        // Always update the last error so we don't return "Unknown"
        generationError = err;
      }
    }

    if (!result) {
      throw new Error(`Failed to generate content with any Gemini model. Last error: ${generationError?.message || 'Unknown'}`);
    }

    // Extract SVG from response
    const svgMatch = result.match(/<svg[\s\S]*?<\/svg>/);
    if (!svgMatch) {
      throw new Error("Failed to generate valid SVG code from Gemini response (Model: " + modelUsed + ")");
    }

    const svgCode = svgMatch[0];

    // Convert SVG to Base64 Data URL
    const base64Svg = Buffer.from(svgCode).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

    console.log(`[NanoBanana] Success! Generated via ${modelUsed}`);

    return {
      success: true,
      imageUrl: dataUrl,
      creditsUsed: 1
    };

  } catch (error) {
    console.error('[GoogleGemini] Generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? `[GoogleGenerativeAI Error]: ${error.message}` : String(error),
    };
  }
}
