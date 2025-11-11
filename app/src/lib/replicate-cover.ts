// Replicate cover generation service
// Uses FLUX or Stable Diffusion models for book cover generation
// Pricing: Pay-per-use, no minimum payment required (~$0.002-0.01 per image)

import Replicate from 'replicate';

export interface GeneratedCoverResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  creditsUsed?: number;
}

/**
 * Generate a book cover using Replicate AI models
 * 
 * @param title - Book title
 * @param author - Book author
 * @param domain - Content domain (e.g., 'esoteric', 'philosophy', 'religious')
 * @param tags - Optional tags for additional context
 * @returns Generated cover result with image URL
 */
export async function generateBookCover(
  title: string,
  author: string,
  domain: string,
  tags?: string[]
): Promise<GeneratedCoverResult> {
  try {
    console.log(`\n🎨 Generating AI cover with Replicate for: "${title}" by ${author}`);
    
    const apiKey = process.env.REPLICATE_API_TOKEN;
    
    if (!apiKey) {
      throw new Error('REPLICATE_API_TOKEN not configured in environment variables');
    }

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: apiKey,
    });

    // Craft detailed prompt for Dark Academia aesthetic
    const tagContext = tags && tags.length > 0 
      ? `Additional themes: ${tags.slice(0, 5).join(', ')}.` 
      : '';
    
    const prompt = `Create a vintage book cover for "${title}" by ${author}.

STYLE REQUIREMENTS:
- Dark academia aesthetic: mystical, scholarly, antique library feeling
- Time period: 1880-1920s vintage book design
- Ornate borders with art nouveau or gothic elements
- Classic serif typography with elegant letter spacing
- Mystical symbols relevant to ${domain} content

VISUAL ELEMENTS:
- Subject matter: ${domain} (esoteric, occult, philosophical, spiritual)
- ${tagContext}
- Aged paper texture with yellowed edges
- Gold leaf or metallic accents on title and borders
- Embossed or debossed appearance
- Rich, deep color palette: burgundy, deep green, navy, gold, cream

FORMAT:
- Portrait orientation (2:3 aspect ratio)
- Title text MUST be clearly readable
- Author name in smaller elegant font
- Decorative flourishes and corner ornaments
- Center focal symbol or mystical illustration

The cover should evoke the feeling of discovering a rare mystical text in an old occult library.`;

    // Calculate dimensions for 2:3 aspect ratio (book cover)
    // FLUX supports various sizes, using 768x1152 for good quality at reasonable cost
    const width = 768;
    const height = 1152; // 2:3 aspect ratio (portrait book cover)
    
    console.log(`[Replicate] Sending generation request...`);
    console.log(`[Replicate] Dimensions: ${width}x${height}`);
    console.log(`[Replicate] Prompt length: ${prompt.length} characters`);
    
    // Try multiple model names in case the exact one doesn't exist
    // We'll try FLUX schnell first (fastest/cheapest), then fall back to other models
    const modelOptions = [
      "black-forest-labs/flux-schnell",
      "black-forest-labs/flux-1.1-schnell", 
      "black-forest-labs/flux-1.1-pro",
      "black-forest-labs/flux-pro",
      "stability-ai/sdxl", // Fallback: cheaper but still good quality
    ];
    
    let lastError: Error | null = null;
    let output: any = null;
    
    for (const modelToTry of modelOptions) {
      try {
        console.log(`[Replicate] Trying model: ${modelToTry}...`);
        
        // Run the model with input parameters
        // Note: Type assertion needed as Replicate's types are dynamic
        // Replicate handles async operations internally and will poll until completion
        output = await replicate.run(modelToTry as `${string}/${string}`, {
          input: {
            prompt: prompt,
            width: width,
            height: height,
            num_outputs: 1,
            guidance_scale: 3.5,
            num_inference_steps: 4, // FLUX schnell uses 4 steps for speed
          },
        });
        
        console.log(`[Replicate] ✓ Successfully used model: ${modelToTry}`);
        break; // Success! Exit the loop
      } catch (modelError) {
        const errorMsg = modelError instanceof Error ? modelError.message : String(modelError);
        console.warn(`[Replicate] Model ${modelToTry} failed: ${errorMsg}`);
        lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
        
        // If it's a 404, try the next model
        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          continue; // Try next model
        } else {
          // For other errors (auth, payment, etc.), throw immediately
          throw modelError;
        }
      }
    }
    
    if (!output) {
      throw new Error(`All model options failed. Last error: ${lastError?.message || 'Unknown error'}. Please check available models at https://replicate.com/explore`);
    }
    
    console.log(`[Replicate] Generation completed. Output type:`, typeof output);
    console.log(`[Replicate] Output structure:`, JSON.stringify(output, null, 2).substring(0, 500));
    
    // Replicate returns different formats depending on the model
    // FLUX models typically return: ["https://..."] or string URL
    let imageUrl: string | undefined;
    
    if (Array.isArray(output)) {
      // If output is an array, get the first URL
      imageUrl = output[0] as string;
    } else if (typeof output === 'string') {
      // If output is a string, it's the URL directly
      imageUrl = output;
    } else if (output && typeof output === 'object') {
      // Some models return objects with URL property
      imageUrl = (output as any).url || (output as any).image || (output as any)[0];
    }
    
    if (!imageUrl) {
      console.error('[Replicate] Unexpected output structure. Full output:', JSON.stringify(output, null, 2));
      throw new Error('No image URL found in Replicate response. Check API response structure.');
    }

    // Calculate approximate cost (for tracking)
    // FLUX.1 schnell: ~$0.002-0.004 per image (varies by size and steps)
    // Using 4 steps at 768x1152 = roughly ~$0.003 per image
    const creditsUsed = 1; // Track as 1 credit per image for consistency
    
    console.log(`[Replicate] ✓ Cover generated successfully`);
    console.log(`[Replicate] Estimated cost: ~$0.003 per image`);
    console.log(`[Replicate] Image URL: ${imageUrl}\n`);

    return {
      success: true,
      imageUrl,
      creditsUsed,
    };
  } catch (error) {
    console.error('[Replicate] Generation error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Provide more specific error messages
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = 'Unauthorized: Invalid Replicate API token. Please check your REPLICATE_API_TOKEN.';
    } else if (errorMessage.includes('402') || errorMessage.includes('Payment')) {
      errorMessage = 'Payment required: Your Replicate account needs credits. Please add credits at https://replicate.com/account/billing';
    } else if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
      errorMessage = 'Rate limit exceeded: Too many requests to Replicate. Please wait before trying again.';
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      errorMessage = `Model not found: ${errorMessage}. Please check available models at https://replicate.com/explore`;
    }
    
    console.error('[Replicate] ✗ Error generating cover:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

