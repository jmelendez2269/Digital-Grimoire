
import { OpenAI } from 'openai';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; // Allow 60 seconds for image generation

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { cardName, prompt, meaning } = await req.json();

        if (!cardName || !prompt) {
            return NextResponse.json({ error: 'Missing card name or prompt' }, { status: 400 });
        }

        // 1. Generate Image with DALL-E 3
        const fullPrompt = `Tarot Card: ${cardName}. Visually representative of: ${prompt}. The card should have a mystical, high-quality aesthetic suitable for a digital grimoire. ${meaning ? `Meaning context: ${meaning}` : ''}`;

        console.log(`Generating card '${cardName}' for user ${user.id}...`);

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: fullPrompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json", // Request base64 for reliable uploading
        });

        if (!response.data || !response.data[0]) {
            throw new Error("No image data returned from OpenAI");
        }

        const imageBase64 = response.data[0].b64_json;
        if (!imageBase64) {
            throw new Error("No image data returned from OpenAI");
        }

        const buffer = Buffer.from(imageBase64, 'base64');
        const filename = `${user.id}/${Date.now()}-${cardName.replace(/\s+/g, '-').toLowerCase()}.png`;

        // 2. Upload to Supabase Storage
        // We'll try to upload to 'tarot-cards' bucket. If it fails (bucket missing), we might fail here.
        // Ideally, we'd check if bucket exists, but we can't easily creating it from here without service role often.
        // We assume the bucket 'tarot-cards' needs to be created by the user or exists.

        let imageUrl = '';
        try {
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('tarot-cards')
                .upload(filename, buffer, {
                    contentType: 'image/png',
                    upsert: false
                });

            if (uploadError) {
                console.error("Storage upload error:", uploadError);
                // Fallback: If upload fails, just use the temporary OpenAI URL if we asked for 'url', 
                // but we asked for b64_json. So we can't easily fallback to a URL without re-uploading somewhere else.
                // We will throw to trigger the catch, but maybe we can return the base64 as a data URI for preview?
                throw uploadError;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('tarot-cards')
                .getPublicUrl(filename);

            imageUrl = publicUrl;

        } catch (storageErr) {
            console.error("Failed to upload to storage. Is 'tarot-cards' bucket created?", storageErr);
            // Fallback for MVP: Return the base64 as a Data URI so the user can at least SEE it, 
            // even if it won't persist long term without storage.
            imageUrl = `data:image/png;base64,${imageBase64}`;
        }

        // 3. Save to Database
        // We need a deck. Find the first deck for the user, or create one.
        let deckId = '';

        try {
            const { data: decks } = await supabase.from('user_decks').select('id').eq('user_id', user.id).limit(1);

            if (decks && decks.length > 0) {
                deckId = decks[0].id;
            } else {
                // Create default deck
                const { data: newDeck, error: deckError } = await supabase
                    .from('user_decks')
                    .insert({ user_id: user.id, name: 'My First Deck' })
                    .select()
                    .single();

                if (deckError) throw deckError;
                deckId = newDeck.id;
            }

            // Insert Card
            const { data: savedCard, error: cardError } = await supabase
                .from('user_cards')
                .insert({
                    deck_id: deckId,
                    name: cardName,
                    arcana: 'Unknown', // Simplified for MVP, logic to determine arcana could be added
                    meaning_upright: meaning,
                    image_url: imageUrl,
                    image_prompt: prompt
                })
                .select()
                .single();

            if (cardError) throw cardError;

            return NextResponse.json({ card: savedCard });

        } catch (dbError) {
            console.error("Database save error:", dbError);
            // If DB save fails (tables missing?), still return the image so user isn't charged for nothing.
            // We return a 'mock' card object
            return NextResponse.json({
                card: {
                    id: 'temp-' + Date.now(),
                    name: cardName,
                    image_url: imageUrl,
                    meaning_upright: meaning
                },
                warning: "Could not save to database. Please ensure migrations are applied."
            });
        }

    } catch (error: any) {
        console.error("Generation error:", error);
        return NextResponse.json({ error: error.message || 'Error generating card' }, { status: 500 });
    }
}
