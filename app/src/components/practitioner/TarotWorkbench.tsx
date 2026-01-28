"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ALL_TAROT_CARDS } from '@/lib/tarot-data';
import { toast } from 'sonner';
import { Loader2, Plus, Sparkles, Wand2 } from 'lucide-react';
import Image from 'next/image';

type CustomCard = {
    id: string;
    name: string;
    image_url: string;
    meaning_upright: string;
};

export default function TarotWorkbench() {
    const supabase = createClient();
    const [selectedCard, setSelectedCard] = useState(ALL_TAROT_CARDS[0]);
    const [prompt, setPrompt] = useState('');
    const [meaning, setMeaning] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCard, setGeneratedCard] = useState<CustomCard | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return toast.error("Please describe your vision for the card.");

        setIsGenerating(true);
        try {
            const response = await fetch('/api/practitioner/tarot/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardName: selectedCard,
                    prompt,
                    meaning
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate card");
            }

            setGeneratedCard(data.card);
            toast.success("Card forged successfully!");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Workbench Panel */}
            <div className="space-y-8">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <Wand2 className="text-amber-500" size={24} />
                        <h2 className="text-2xl font-serif text-white">Deck Forge</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Card Selection */}
                        <div>
                            <label htmlFor="card-select" className="block text-sm text-zinc-400 mb-2">Select Arcana Key</label>
                            <select
                                id="card-select"
                                value={selectedCard}
                                onChange={(e) => setSelectedCard(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-amber-500 outline-none"
                            >
                                {ALL_TAROT_CARDS.map(card => (
                                    <option key={card} value={card}>{card}</option>
                                ))}
                            </select>
                        </div>

                        {/* Visual Prompt */}
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Visual Prompt</label>
                            <p className="text-xs text-zinc-500 mb-2">Describe the imagery, style, and symbols you want to manifest.</p>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., A cyberpunk fool stepping off a neon ledge into a digital void, glitch art style..."
                                className="w-full h-32 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-amber-500 outline-none resize-none"
                            />
                        </div>

                        {/* Meaning (Optional) */}
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Resonance / Meaning (Optional)</label>
                            <textarea
                                value={meaning}
                                onChange={(e) => setMeaning(e.target.value)}
                                placeholder="What does this card mean to you?"
                                className="w-full h-24 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-amber-500 outline-none resize-none"
                            />
                        </div>

                        {/* Premium Warning & Action */}
                        <div className="pt-4 border-t border-zinc-800">
                            <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-4 mb-4 flex gap-3 text-amber-200/80 text-sm">
                                <Sparkles size={18} className="shrink-0 mt-0.5" />
                                <p>Generative crafting utilizes significant energy. This is a premium action.</p>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt}
                                className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-bold rounded-lg shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Forging Card...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        Forge Card
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Panel */}
            <div className="flex flex-col items-center justify-center min-h-[600px] bg-zinc-950/50 rounded-xl border-2 border-dashed border-zinc-800 relative">

                {generatedCard ? (
                    <div className="animate-in fade-in zoom-in duration-700 relative group">
                        <div className="relative w-[300px] h-[520px] rounded-xl overflow-hidden shadow-2xl border border-amber-500/30">
                            <Image
                                src={generatedCard.image_url}
                                alt={generatedCard.name}
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />
                            <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                                <h3 className="text-2xl font-serif text-amber-500 mb-2">{generatedCard.name}</h3>
                                {generatedCard.meaning_upright && (
                                    <p className="text-sm text-zinc-300 line-clamp-3">{generatedCard.meaning_upright}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-zinc-600">
                        <div className="w-48 h-80 border-2 border-zinc-800 rounded-xl mx-auto mb-6 flex items-center justify-center bg-zinc-900/50">
                            <span className="text-6xl opacity-20">?</span>
                        </div>
                        <p>Your creation will appear here.</p>
                    </div>
                )}

            </div>
        </div>
    );
}
