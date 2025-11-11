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
    console.log(`[NanoBanana] API endpoint: https://api.nanobanana.dev/v1/generate`);
    console.log(`[NanoBanana] API key present: ${!!apiKey}`);
    console.log(`[NanoBanana] API key length: ${apiKey?.length || 0}`);
    
    // Calculate dimensions for 2:3 aspect ratio (book cover)
    // Standard book cover dimensions: 400x600px or 800x1200px
    const width = 800;
    const height = 1200; // 2:3 aspect ratio
    
    console.log(`[NanoBanana] Request payload:`, {
      prompt: prompt.substring(0, 100) + '...',
      width,
      height,
      quality: 'high',
    });
    
    // Create abort controller for timeout (Node.js compatible)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    // Nano Banana API call - using correct endpoint from documentation
    // Base URL: https://api.nanobanana.dev/v1
    // Endpoint: POST /generate
    let response;
    try {
      const requestBody = {
        prompt,
        width,
        height,
        quality: 'high',
      };
      
      console.log(`[NanoBanana] Making fetch request to: https://api.nanobanana.dev/v1/generate`);
      response = await fetch('https://api.nanobanana.dev/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log(`[NanoBanana] Fetch completed. Status: ${response.status} ${response.statusText}`);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[NanoBanana] Fetch error details:', {
        name: fetchError instanceof Error ? fetchError.name : 'Unknown',
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        cause: fetchError instanceof Error ? fetchError.cause : undefined,
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
      });
      
      // Provide more specific error messages
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error(`Network error: Unable to reach Nano Banana API. Check your internet connection and verify the API endpoint: https://api.nanobanana.dev/v1/generate. Error: ${fetchError.message}`);
      } else if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('aborted'))) {
        throw new Error('Request timeout: Nano Banana API did not respond within 60 seconds. The service may be down or slow.');
      } else if (fetchError instanceof Error && fetchError.message.includes('ENOTFOUND')) {
        throw new Error(`DNS error: Cannot resolve api.nanobanana.dev. Check if the domain is correct. Error: ${fetchError.message}`);
      } else {
        throw new Error(`Failed to connect to Nano Banana API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }
      const errorMessage = errorData.error || errorData.message || errorData.raw || response.statusText;
      console.error('[NanoBanana] API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(`Nano Banana API error (${response.status}): ${errorMessage}`);
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[NanoBanana] Failed to parse JSON response:', responseText.substring(0, 500));
      throw new Error(`Invalid JSON response from Nano Banana API: ${parseError}`);
    }
    
    console.log('[NanoBanana] API response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
    
    // Extract image URL from response
    // According to Nano Banana API docs, response contains image_url
    const imageUrl = data.image_url || data.imageUrl || data.url || data.images?.[0]?.url || data.data?.image_url;
    
    if (!imageUrl) {
      console.error('[NanoBanana] Unexpected response structure. Full response:', JSON.stringify(data, null, 2));
      throw new Error('No image URL found in Nano Banana response. Check API response structure.');
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

    // Check account status - using correct base URL
    const response = await fetch('https://api.nanobanana.dev/v1/account', {
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

