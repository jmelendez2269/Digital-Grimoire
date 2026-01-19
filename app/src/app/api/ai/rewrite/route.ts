import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logMetadataExtractionUsage } from "@/lib/usage-tracker";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
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
    const { text = "", field = "", entityName = "", entityType = "", mode = "rewrite" } = body || {};

    const userPrompt =
      mode === "generate"
        ? `Generate a concise, original ${field || "summary"} for the following entity. Avoid copying any source text or quoting directly. Keep it neutral, factual, and suitable for a public knowledge base.

Entity: ${entityName}
Type/Tradition: ${entityType}
Output:`
        : `Rewrite the following ${field || "text"} in your own words to make it legally safe and original. Do not quote the source and do not preserve unique phrasing. Keep the meaning, but change wording and structure. Keep it concise, neutral, and factual.

Entity: ${entityName}
Type/Tradition: ${entityType}
Original text:
${text}

Output:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a careful editor for a public knowledge base. Avoid quoting or copying. Rewrite in original wording. Keep it concise and neutral.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 250,
    });

    const output = completion.choices?.[0]?.message?.content?.trim() || "";

    await logMetadataExtractionUsage({
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
      userId: user.id,
      success: true,
      model: "gpt-4o-mini",
    });

    return NextResponse.json({ text: output });
  } catch (error) {
    console.error("Error in AI rewrite endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
