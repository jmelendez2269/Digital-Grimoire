
import { createClient } from '@/lib/supabase/server';

export type AIModel = 'gpt-4o' | 'claude-3-5-sonnet-latest' | 'gemini-1-5-pro';

export async function getLeastUsedModel(): Promise<AIModel> {
    try {
        const supabase = await createClient();

        // Get current month start date
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Query api_usage table for current month
        const { data: usageData, error } = await supabase
            .from('api_usage')
            .select('service, operation, request_metadata')
            .gte('created_at', monthStart.toISOString())
            .eq('service', 'other');

        if (error) {
            console.error('Error fetching AI usage for balancing:', error);
            // Default to GPT-4o on error
            return 'gpt-4o';
        }

        // Count usage by model
        let claudeCount = 0;
        let gptCount = 0;
        let geminiCount = 0;

        usageData?.forEach((record) => {
            const operation = record.operation?.toLowerCase() || '';
            const metadata = record.request_metadata as Record<string, any> || {};

            if (operation === 'claude_chat' || operation.includes('claude')) {
                claudeCount++;
            } else if (operation === 'gpt_chat' || operation.includes('gpt') || operation.includes('openai')) {
                gptCount++;
            } else if (operation === 'gemini_chat' || operation.includes('gemini') || operation.includes('google')) {
                geminiCount++;
            } else if (metadata.model) {
                const model = metadata.model.toLowerCase();
                if (model.includes('claude') || model.includes('anthropic')) {
                    claudeCount++;
                } else if (model.includes('gpt') || model.includes('openai')) {
                    gptCount++;
                } else if (model.includes('gemini') || model.includes('google')) {
                    geminiCount++;
                }
            }
        });

        console.log(`AI Usage Balancing: Claude=${claudeCount}, GPT=${gptCount}, Gemini=${geminiCount}`);

        // Find minimum
        const counts = [
            { model: 'claude-3-5-sonnet-latest' as const, count: claudeCount },
            { model: 'gpt-4o' as const, count: gptCount },
            { model: 'gemini-1-5-pro' as const, count: geminiCount }
        ];

        // Sort by count ascending
        counts.sort((a, b) => a.count - b.count);

        return counts[0].model;

    } catch (error) {
        console.error('Error in getLeastUsedModel:', error);
        return 'gpt-4o';
    }
}
