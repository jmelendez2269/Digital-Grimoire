// Nano Banana AI cover generation service
// Uses Google's Gemini 2.5 Flash for high-quality book cover generation

export interface GeneratedCoverResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  creditsUsed?: number;
}

/**
 * Generate a book cover using Nano Banana AI (powered by Gemini 2.5 Flash)
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
    console.log(`\n🎨 Generating AI cover with Nano Banana for: "${title}" by ${author}`);
    
    const apiKey = process.env.NANO_BANANA_API_KEY;
    
    if (!apiKey) {
      throw new Error('NANO_BANANA_API_KEY not configured in environment variables');
    }

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

    console.log(`[NanoBanana] Sending generation request...`);
    
    // Nano Banana API call
    // Note: Adjust endpoint and payload structure based on actual Nano Banana API docs
    const response = await fetch('https://api.nanobanana.im/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        aspect_ratio: '2:3', // Book cover proportions
        quality: 'high',
        num_images: 1,
        model: 'gemini-2.5-flash', // Specify Gemini if needed
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || response.statusText;
      throw new Error(`Nano Banana API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    
    // Extract image URL from response (adjust based on actual API structure)
    const imageUrl = data.image_url || data.images?.[0]?.url || data.url || data.data?.url;
    
    if (!imageUrl) {
      console.error('[NanoBanana] Unexpected response structure:', JSON.stringify(data, null, 2));
      throw new Error('No image URL found in Nano Banana response');
    }

    const creditsUsed = data.credits_used || 2; // Default to 2 credits per image
    
    console.log(`[NanoBanana] ✓ Cover generated successfully`);
    console.log(`[NanoBanana] Credits used: ${creditsUsed}`);
    console.log(`[NanoBanana] Image URL: ${imageUrl}\n`);

    return {
      success: true,
      imageUrl,
      creditsUsed,
    };
  } catch (error) {
    console.error('[NanoBanana] ✗ Error generating cover:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check Nano Banana API status and available credits
 * Useful for admin dashboard monitoring
 */
export async function checkNanoBananaStatus(): Promise<{
  available: boolean;
  credits?: number;
  error?: string;
}> {
  try {
    const apiKey = process.env.NANO_BANANA_API_KEY;
    
    if (!apiKey) {
      return {
        available: false,
        error: 'API key not configured',
      };
    }

    // Check account status (adjust endpoint based on actual API)
    const response = await fetch('https://api.nanobanana.im/v1/account', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        available: false,
        error: `API returned ${response.status}`,
      };
    }

    const data = await response.json();
    
    return {
      available: true,
      credits: data.credits || data.balance || 0,
    };
  } catch (error) {
    return {
      available: false,
      error: String(error),
    };
  }
}

