import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AIProvider = 'openai' | 'anthropic' | 'google';

export type AIModel =
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'claude-3-5-sonnet-20240620'
    | 'claude-3-opus-20240229'
    | 'gemini-1-5-pro'
    | 'gemini-1-5-flash';

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

class AIOrchestrator {
    private openai: OpenAI;
    private anthropic: Anthropic;
    private google: GoogleGenerativeAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        this.google = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
    }

    /**
     * Get the default provider for a specific model
     */
    private getProviderForModel(model: AIModel): AIProvider {
        if (model.startsWith('gpt-')) return 'openai';
        if (model.startsWith('claude-')) return 'anthropic';
        if (model.startsWith('gemini-')) return 'google';
        return 'openai'; // Default
    }

    /**
     * Generate a completion using the specified model/provider
     */
    async chatComplete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<AIResponse> {
        const model = options.model || 'gpt-4o';
        const provider = this.getProviderForModel(model);

        switch (provider) {
            case 'openai':
                return this.openaiChat(messages, options);
            case 'anthropic':
                return this.anthropicChat(messages, options);
            case 'google':
                return this.googleChat(messages, options);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    private async openaiChat(messages: ChatMessage[], options: CompletionOptions): Promise<AIResponse> {
        const response = await this.openai.chat.completions.create({
            model: options.model || 'gpt-4o',
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
            response_format: options.jsonMode ? { type: 'json_object' } : undefined,
        });

        return {
            content: response.choices[0].message.content || '',
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
            model: response.model,
            provider: 'openai',
        };
    }

    private async anthropicChat(messages: ChatMessage[], options: CompletionOptions): Promise<AIResponse> {
        const systemMessage = messages.find(m => m.role === 'system')?.content;
        const userMessages = messages.filter(m => m.role !== 'system');

        const response = await this.anthropic.messages.create({
            model: (options.model as any) || 'claude-3-5-sonnet-20240620',
            system: systemMessage,
            messages: userMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            max_tokens: options.maxTokens || 1024,
            temperature: options.temperature ?? 0.7,
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';

        return {
            content,
            usage: {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            model: response.model,
            provider: 'anthropic',
        };
    }

    private async googleChat(messages: ChatMessage[], options: CompletionOptions): Promise<AIResponse> {
        const modelId = options.model || 'gemini-1-5-pro';
        const model = this.google.getGenerativeModel({ model: modelId });

        const systemMessage = messages.find(m => m.role === 'system')?.content;
        const chatHistory = messages
            .filter(m => m.role !== 'system')
            .slice(0, -1)
            .map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
            }));

        const lastMessage = messages[messages.length - 1].content;

        const chat = model.startChat({
            history: chatHistory as any,
            generationConfig: {
                maxOutputTokens: options.maxTokens,
                temperature: options.temperature ?? 0.7,
                responseMimeType: options.jsonMode ? 'application/json' : undefined,
            },
            systemInstruction: systemMessage,
        });

        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;

        // Gemini SDK doesn't always provide token usage in the same way as OpenAI
        // Use estimates or check metadata if available
        const promptTokens = response.usageMetadata?.promptTokenCount || 0;
        const completionTokens = response.usageMetadata?.candidatesTokenCount || 0;

        return {
            content: response.text(),
            usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
            },
            model: modelId,
            provider: 'google',
        };
    }

    /**
     * Run multiple models in parallel and synthesize their results
     */
    async consensusChat(messages: ChatMessage[]): Promise<AIResponse & { individualResponses: Record<string, string> }> {
        const models: AIModel[] = ['gpt-4o', 'claude-3-5-sonnet-20240620', 'gemini-1-5-pro'];

        // Execute all models in parallel
        const responses = await Promise.allSettled(
            models.map(model => this.chatComplete(messages, { model, temperature: 0.5 }))
        );

        const individualResponses: Record<string, string> = {};
        const synthesisContext: string[] = [];
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;

        responses.forEach((result, index) => {
            const modelName = models[index];
            if (result.status === 'fulfilled') {
                individualResponses[modelName] = result.value.content;
                synthesisContext.push(`MODEL: ${modelName}\nRESPONSE: ${result.value.content}`);
                totalPromptTokens += result.value.usage.promptTokens;
                totalCompletionTokens += result.value.usage.completionTokens;
            } else {
                console.error(`Consensus error for ${modelName}:`, result.reason);
            }
        });

        // Use GPT-4o for synthesis
        const synthesisPrompt = `
You are a master orchestrator synthesizing insights from three top-tier AI models: GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro.

USER QUERY:
"${messages[messages.length - 1].content}"

INDIVIDUAL MODEL RESPONSES:
${synthesisContext.join('\n\n---\n\n')}

TASK:
1. Identify common themes and core agreements across all models.
2. Note unique perspectives or specific details mentioned by only one or two models.
3. Call out any contradictions or conflicting information.
4. Provide a definitive, high-level "Consensus Synthesis" that combines the best parts of each response into a cohesive, comprehensive answer.

Format your output beautifully using Markdown with clear headings.
`;

        const synthesisResult = await this.openaiChat([
            { role: 'system', content: 'You are a master research synthesizer. Provide a comprehensive, clear, and objective synthesis of multiple AI perspectives.' },
            { role: 'user', content: synthesisPrompt }
        ], { model: 'gpt-4o', temperature: 0.3 });

        return {
            content: synthesisResult.content,
            individualResponses,
            usage: {
                promptTokens: totalPromptTokens + synthesisResult.usage.promptTokens,
                completionTokens: totalCompletionTokens + synthesisResult.usage.completionTokens,
                totalTokens: totalPromptTokens + totalCompletionTokens + synthesisResult.usage.totalTokens,
            },
            model: 'consensus',
            provider: 'openai',
        };
    }
}

export const aiOrchestrator = new AIOrchestrator();
