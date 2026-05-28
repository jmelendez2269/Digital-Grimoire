export type AIProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

export type KnownAIModel =
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'claude-3-5-sonnet-latest'
    | 'claude-3-opus-20240229'
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
}

export interface AIResponse {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: AIProvider;
}
