import OpenAI from 'openai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_FREE_MODEL = 'deepseek/deepseek-v4-flash:free';

let openRouterClient: OpenAI | null = null;

export function getDefaultOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || process.env.AI_TEXT_MODEL || DEFAULT_FREE_MODEL;
}

export function getDefaultOpenRouterMetadataModel(): string {
  return process.env.OPENROUTER_METADATA_MODEL || process.env.AI_METADATA_MODEL || getDefaultOpenRouterModel();
}

export function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Add OPENROUTER_API_KEY to .env.local');
  }

  return apiKey;
}

export function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    openRouterClient = new OpenAI({
      apiKey: getOpenRouterApiKey(),
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'http://localhost:3000',
        'X-OpenRouter-Title': process.env.OPENROUTER_APP_TITLE || 'Prismarium',
      },
    });
  }

  return openRouterClient;
}
