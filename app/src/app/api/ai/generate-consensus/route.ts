import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
      entityId,
      entityName,
      entityCategory,
      tradition,
      entityType,
      existingDescription,
    } = body || {};

    if (!entityId || !entityName || !entityType) {
      return NextResponse.json(
        { error: "entityId, entityName, and entityType are required" },
        { status: 400 }
      );
    }

    // Fetch all claims for this entity
    const svc = createServiceClient();
    const { data: claims, error: claimsError } = await svc
      .from("knowledge_claims")
      .select(`
        *,
        source:knowledge_sources(id, title, author, year)
      `)
      .eq("entity_type", entityType === "correspondences" ? "correspondence" : "convergence")
      .eq("entity_id", entityId)
      .order("field_key", { ascending: true });

    if (claimsError) {
      console.error("Error fetching claims:", claimsError);
      return NextResponse.json(
        { error: "Failed to fetch claims" },
        { status: 500 }
      );
    }

    if (!claims || claims.length === 0) {
      return NextResponse.json(
        { error: "No claims found for this entity. Add some claims first." },
        { status: 400 }
      );
    }

    // Group claims by field_key
    const claimsByField = new Map<string, Array<typeof claims[0]>>();
    for (const claim of claims) {
      const fieldKey = claim.field_key;
      if (!claimsByField.has(fieldKey)) {
        claimsByField.set(fieldKey, []);
      }
      claimsByField.get(fieldKey)!.push(claim);
    }

    // Build claims text for prompt
    const claimsText = Array.from(claimsByField.entries())
      .map(([fieldKey, fieldClaims]) => {
        const fieldLabel = fieldKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        const valuesWithSources = fieldClaims
          .map((claim) => {
            const value = claim.field_value || "";
            const source = claim.source
              ? `${claim.source.title}${claim.source.author ? ` by ${claim.source.author}` : ""}`
              : "Unattributed";
            return `  - "${value}" (from ${source})`;
          })
          .join("\n");
        return `${fieldLabel}:\n${valuesWithSources}`;
      })
      .join("\n\n");

    const entityContext = entityType === "correspondences"
      ? `category: ${entityCategory}`
      : `tradition: ${tradition}`;

    const userPrompt = `Generate a very brief consensus description for "${entityName}" (${entityContext}) based on the following knowledge claims from various sources.

The entity currently has ${claims.length} claim${claims.length !== 1 ? "s" : ""} across ${claimsByField.size} different property field${claimsByField.size !== 1 ? "s" : ""}.

Knowledge Claims:
${claimsText}

${existingDescription ? `Current Description (for context, may be outdated or incomplete):\n${existingDescription}\n\n` : ""}Create a very short, neutral, factual consensus description that synthesizes this information from multiple sources. The description should:
- Aggregate key information from all sources
- Be extremely concise (1-2 sentences maximum, ideally one sentence)
- Be neutral and factual
- Avoid direct quotes
- Focus on the most important and commonly agreed-upon facts
- Be suitable for a public knowledge base

Return only the consensus description text, no additional commentary. Keep it as brief as possible.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a knowledge synthesis assistant. Create very brief, neutral, factual consensus descriptions (1-2 sentences maximum) that aggregate key information from multiple sources. Be extremely concise and focus only on the most important facts. Avoid quoting directly and synthesize information into original wording.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    const output = completion.choices?.[0]?.message?.content?.trim() || "";

    if (!output) {
      return NextResponse.json(
        { error: "Failed to generate consensus description" },
        { status: 500 }
      );
    }

    await logMetadataExtractionUsage({
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
      userId: user.id,
      success: true,
      model: "gpt-4o-mini",
    });

    return NextResponse.json({ consensus: output });
  } catch (error) {
    console.error("Error in AI generate-consensus endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
