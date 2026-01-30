import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiOrchestrator } from '@/lib/ai/ai-orchestrator';
import { logApiUsage } from '@/lib/usage-tracker';

export async function POST(request: Request) {
    try {
        // 1. Authenticate user
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse request
        const { messages } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        // 3. Call AI Orchestrator Consensus
        const aiResponse = await aiOrchestrator.consensusChat(messages);

        // 4. Log API Usage
        await logApiUsage({
            service: 'other',
            operation: 'consensus_chat',
            unitsUsed: aiResponse.usage.totalTokens,
            unitType: 'tokens',
            userId: user.id,
            requestMetadata: {
                model: aiResponse.model,
                provider: aiResponse.provider,
                messageCount: messages.length,
                individualModels: Object.keys(aiResponse.individualResponses),
            },
            success: true,
        });

        // 5. Return response
        return NextResponse.json({
            response: aiResponse.content,
            model: aiResponse.model,
            individualResponses: aiResponse.individualResponses,
        });

    } catch (error: any) {
        console.error('Consensus API Error:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
        }, { status: 500 });
    }
}
