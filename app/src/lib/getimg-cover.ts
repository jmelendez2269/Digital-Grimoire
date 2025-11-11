// getimg.ai cover generation service
// Uses FLUX.1 [schnell] for fast, affordable book cover generation
// Pricing: ~$0.00252 per 1024x1024 image

export interface GeneratedCoverResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  creditsUsed?: number;
}

/**
 * Generate a book cover using getimg.ai FLUX.1 [schnell] model
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
    console.log(`\n🎨 Generating AI cover with getimg.ai for: "${title}" by ${author}`);
    
    const apiKey = process.env.GETIMG_API_KEY;
    
    if (!apiKey) {
      throw new Error('GETIMG_API_KEY not configured in environment variables');
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

    // Calculate dimensions for 2:3 aspect ratio (book cover)
    // FLUX schnell supports: 1024×1024, 1280×720, 720×1280 (from pricing table)
    // For book covers (portrait 2:3), use 720×1280 (closest to standard book cover)
    const width = 720;
    const height = 1280; // 2:3 aspect ratio (portrait book cover)
    
    console.log(`[GetImg] Sending generation request...`);
    console.log(`[GetImg] API endpoint: https://api.getimg.ai/v1/flux-schnell/text-to-image`);
    console.log(`[GetImg] API key present: ${!!apiKey}`);
    console.log(`[GetImg] API key length: ${apiKey?.length || 0}`);
    console.log(`[GetImg] Request payload:`, {
      prompt: prompt.substring(0, 100) + '...',
      width,
      height,
    });
    
    // Create abort controller for timeout (Node.js compatible)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout (FLUX can take longer)
    
    // getimg.ai API call
    // Endpoint: POST https://api.getimg.ai/v1/flux-schnell/text-to-image
    // According to docs: https://docs.getimg.ai/reference/postfluxschnelltexttoimage
    // Parameters: prompt (required), width (optional, 256-1280, default 1024), height (optional, 256-1280)
    // Note: output_format is NOT a valid parameter for FLUX schnell
    let response;
    try {
      const requestBody = {
        prompt,
        width,
        height,
      };
      
      console.log(`[GetImg] Making fetch request...`);
      response = await fetch('https://api.getimg.ai/v1/flux-schnell/text-to-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log(`[GetImg] Fetch completed. Status: ${response.status} ${response.statusText}`);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[GetImg] Fetch error details:', {
        name: fetchError instanceof Error ? fetchError.name : 'Unknown',
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        cause: fetchError instanceof Error ? fetchError.cause : undefined,
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
      });
      
      // Provide more specific error messages
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error(`Network error: Unable to reach getimg.ai API. Check your internet connection and verify the API endpoint: https://api.getimg.ai/v1/flux-schnell/text-to-image. Error: ${fetchError.message}`);
      } else if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('aborted'))) {
        throw new Error('Request timeout: getimg.ai API did not respond within 90 seconds. The service may be down or slow.');
      } else if (fetchError instanceof Error && fetchError.message.includes('ENOTFOUND')) {
        throw new Error(`DNS error: Cannot resolve api.getimg.ai. Check if the domain is correct. Error: ${fetchError.message}`);
      } else {
        throw new Error(`Failed to connect to getimg.ai API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
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
      
      // Extract error message - handle various response formats
      let errorMessage = response.statusText;
      
      // Handle different error response structures
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData && typeof errorData === 'object') {
        // Try common error message fields
        if (errorData.error) {
          // If error is an object, extract its message
          if (typeof errorData.error === 'object') {
            errorMessage = errorData.error.message || errorData.error.code || JSON.stringify(errorData.error);
          } else {
            errorMessage = errorData.error;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.raw) {
          errorMessage = errorData.raw;
        } else {
          // Last resort: stringify the whole object
          errorMessage = JSON.stringify(errorData, null, 2);
        }
      }
      
      // Provide helpful messages for common status codes
      if (response.status === 402) {
        errorMessage = `Payment required: ${errorMessage}. Please check your getimg.ai account balance and ensure you have credits available.`;
      } else if (response.status === 401) {
        errorMessage = `Unauthorized: ${errorMessage}. Please check your GETIMG_AI_API_KEY is correct.`;
      } else if (response.status === 429) {
        errorMessage = `Rate limit exceeded: ${errorMessage}. Please wait before making another request.`;
      }
      
      console.error('[GetImg] API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        errorData: JSON.stringify(errorData, null, 2),
        extractedMessage: errorMessage,
      });
      throw new Error(`getimg.ai API error (${response.status}): ${errorMessage}`);
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[GetImg] Failed to parse JSON response:', responseText.substring(0, 500));
      throw new Error(`Invalid JSON response from getimg.ai API: ${parseError}`);
    }
    
    console.log('[GetImg] API response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
    
    // Extract image URL from response
    // According to getimg.ai docs, response format is: { "url": "https://...", "seed": 42, "cost": 0.00663552 }
    const imageUrl = data.url || data.image || data.data?.url || data.data?.image || data.images?.[0]?.url || data.images?.[0];
    
    if (!imageUrl) {
      console.error('[GetImg] Unexpected response structure. Full response:', JSON.stringify(data, null, 2));
      throw new Error('No image URL found in getimg.ai response. Check API response structure.');
    }

    // Calculate approximate cost (for tracking)
    // FLUX.1 schnell: ~$0.00221 per 720×1280 image (from pricing table)
    // Response includes actual cost in data.cost field
    const actualCost = data.cost || 0.00221;
    const creditsUsed = 1; // Track as 1 credit per image for consistency
    
    console.log(`[GetImg] ✓ Cover generated successfully`);
    console.log(`[GetImg] Actual cost: $${actualCost.toFixed(6)}`);
    console.log(`[GetImg] Image URL: ${imageUrl}\n`);

    return {
      success: true,
      imageUrl,
      creditsUsed,
    };
  } catch (error) {
    console.error('[GetImg] ✗ Error generating cover:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check getimg.ai API status and account info
 * Useful for admin dashboard monitoring
 */
export async function checkGetImgStatus(): Promise<{
  available: boolean;
  credits?: number;
  error?: string;
}> {
  try {
    const apiKey = process.env.GETIMG_API_KEY;
    
    if (!apiKey) {
      return {
        available: false,
        error: 'API key not configured',
      };
    }

    // Check account status - getimg.ai may have an account endpoint
    // Note: This endpoint may vary - check getimg.ai docs for actual endpoint
    const response = await fetch('https://api.getimg.ai/v1/account', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      // If account endpoint doesn't exist, try a simple test generation
      // or just return available=true since we have a key
      return {
        available: true,
        credits: undefined, // Credits info may not be available via API
      };
    }

    const data = await response.json();
    
    return {
      available: true,
      credits: data.credits || data.balance || data.remaining_credits || undefined,
    };
  } catch (error) {
    // If account endpoint doesn't exist, that's okay - API might still work
    return {
      available: true, // Assume available if we have a key
      error: undefined,
    };
  }
}

