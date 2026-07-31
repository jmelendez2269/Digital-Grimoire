import OpenAI from 'openai';

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function extractJsonObject(value: string): string | null {
  const text = stripJsonFence(value);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
}

// Some models (notably Claude without OpenAI-style forced JSON mode) emit raw
// control characters (literal newlines/tabs) inside JSON string values instead
// of escaping them. Walk the text tracking string/escape state and escape any
// raw control character found inside a string so JSON.parse can handle it.
function sanitizeControlCharsInStrings(value: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const char of value) {
    if (inString) {
      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === '\\') {
        result += char;
        escaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else if (char.charCodeAt(0) < 0x20) {
        result += `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
      } else {
        result += char;
      }
    } else {
      result += char;
      if (char === '"') {
        inString = true;
      }
    }
  }

  return result;
}

function formatJsonParseError(error: unknown, source: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const positionMatch = message.match(/position\s+(\d+)/i);
  const position = positionMatch ? Number(positionMatch[1]) : -1;
  const start = position >= 0 ? Math.max(0, position - 180) : 0;
  const end = position >= 0 ? Math.min(source.length, position + 180) : Math.min(source.length, 360);
  const snippet = source.slice(start, end);

  return `${message}. Nearby response text: ${JSON.stringify(snippet)}`;
}

export function parseAiJsonObject<T>(responseText: string): T {
  const rawCandidates = [
    responseText.trim(),
    stripJsonFence(responseText),
    extractJsonObject(responseText),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const candidates = [...rawCandidates, ...rawCandidates.map(sanitizeControlCharsInStrings)];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(formatJsonParseError(lastError, responseText));
}

export async function parseOrRepairAiJsonObject<T>(
  responseText: string,
  options: {
    client: OpenAI;
    model: string;
    label: string;
  }
): Promise<T> {
  try {
    return parseAiJsonObject<T>(responseText);
  } catch (parseError) {
    console.warn(`${options.label} JSON parse failed. Requesting one repair attempt.`, parseError);
  }

  const repairResponse = await options.client.chat.completions.create({
    model: options.model,
    temperature: 0,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You repair malformed JSON. Return only one valid JSON object. Preserve all fields and values when possible.',
      },
      {
        role: 'user',
        content: `Repair this malformed JSON response into one valid JSON object:\n\n${responseText}`,
      },
    ],
  });

  const repairedText = repairResponse.choices[0].message.content;
  if (!repairedText) {
    throw new Error(`${options.label} JSON repair returned an empty response`);
  }

  return parseAiJsonObject<T>(repairedText);
}
