export type AIProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

export type KnownAIModel =
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'claude-sonnet-5'
    | 'claude-opus-4-8'
    | 'claude-haiku-4-5-20251001'
    | 'gemini-1-5-pro'
    | 'gemini-1-5-flash';

export type AIModel = KnownAIModel | (string & {});

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface CompletionOptions {
    model?: AIModel;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    jsonMode?: boolean;
    signal?: AbortSignal;
}

export interface AIResponse {
    content: string;
    providerRequestId?: string | null;
    estimatedCostUsd?: number | null;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: AIProvider;
}
