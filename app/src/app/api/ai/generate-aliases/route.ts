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

    const userPrompt = `Generate common alternative names, nicknames, variations, or aliases for "${entityName}" in the context of ${context}.

${entityDescription ? `Entity description: ${entityDescription}\n\n` : ""}Return your response as a JSON object with an "aliases" property containing an array of strings. Include common variations, alternative spellings, nicknames, or related names that might be used to refer to this entity.

Example format:
{
  "aliases": ["Alternative Name 1", "Nickname", "Variation", "Other Name"]
}

Return only the JSON object, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a knowledge base assistant. Generate relevant alternative names and aliases for entities. Return only valid JSON objects with an 'aliases' array.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const output = completion.choices?.[0]?.message?.content?.trim() || "";

    // Parse the JSON response
    let aliases: string[] = [];
    try {
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed.aliases)) {
        aliases = parsed.aliases;
      } else if (Array.isArray(parsed)) {
        aliases = parsed;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        aliases = parsed.data;
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    // Validate and filter aliases
    const validAliases = aliases
      .filter((a) => a && typeof a === "string" && a.trim().length > 0)
      .map((a) => a.trim())
      .filter((a, index, self) => self.indexOf(a) === index); // Remove duplicates

    await logMetadataExtractionUsage({
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
      userId: user.id,
      success: true,
      model: "gpt-4o-mini",
    });

    return NextResponse.json({ aliases: validAliases });
  } catch (error) {
    console.error("Error in AI generate-aliases endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
