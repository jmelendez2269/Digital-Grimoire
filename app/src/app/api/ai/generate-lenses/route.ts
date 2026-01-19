import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logMetadataExtractionUsage } from "@/lib/usage-tracker";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      entityName,
      entityCategory,
      tradition,
      entityDescription,
      graphType,
    } = body || {};

    if (!entityName || !graphType) {
      return NextResponse.json(
        { error: "entityName and graphType are required" },
        { status: 400 }
      );
    }

    const entityType = graphType === "correspondences" ? entityCategory : tradition;
    const context = graphType === "correspondences" 
      ? `category: ${entityCategory}` 
      : `tradition: ${tradition}`;

    const userPrompt = `Suggest relevant analytical perspectives or lenses for studying "${entityName}" in the context of ${context}.

${entityDescription ? `Entity description: ${entityDescription}\n\n` : ""}Lenses are analytical perspectives or viewpoints such as: scientific, psychological, philosophical, religious_spiritual, historical_anthropological, symbolic_occult, mathematical, etc.

Return your response as a JSON object with a "lenses" property containing an array of lens names as strings. Only include lenses that are genuinely relevant to studying this entity.

Example format:
{
  "lenses": ["scientific", "psychological", "philosophical", "symbolic_occult"]
}

Return only the JSON object, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a knowledge base assistant. Suggest relevant analytical perspectives (lenses) for studying entities. Return only valid JSON objects with a 'lenses' array.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const output = completion.choices?.[0]?.message?.content?.trim() || "";

    // Parse the JSON response
    let lenses: string[] = [];
    try {
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed.lenses)) {
        lenses = parsed.lenses;
      } else if (Array.isArray(parsed)) {
        lenses = parsed;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        lenses = parsed.data;
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    // Validate and filter lenses
    const validLenses = lenses
      .filter((l) => l && typeof l === "string" && l.trim().length > 0)
      .map((l) => l.trim())
      .filter((l, index, self) => self.indexOf(l) === index); // Remove duplicates

    await logMetadataExtractionUsage({
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
      userId: user.id,
      success: true,
      model: "gpt-4o-mini",
    });

    return NextResponse.json({ lenses: validLenses });
  } catch (error) {
    console.error("Error in AI generate-lenses endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
