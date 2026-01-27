"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getFullDeck, TarotCard } from '@/lib/tarot-data';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw } from 'lucide-react';

export default function TarotDeck() {
    const supabase = createClient();
    const [deck, setDeck] = useState<TarotCard[]>(getFullDeck().sort(() => Math.random() - 0.5));
    const [drawnCards, setDrawnCards] = useState<TarotCard[]>([]);
    const [reflection, setReflection] = useState('');
    const [saving, setSaving] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false); // For animation of current card

    // Draw Card
    const drawCard = () => {
        if (drawnCards.length >= 3) {
            toast('Maximum 3 cards for this spread.');
            return;
        }
        if (deck.length === 0) return;

        setIsFlipped(false);

        // Simulate shuffle/draw delay
        setTimeout(() => {
            const newCard = deck[0];
            setDeck(deck.slice(1));
            setDrawnCards([...drawnCards, newCard]);
            setIsFlipped(true); // Trigger reveal animation
        }, 300);
    };

    // Reset
    const resetDeck = () => {
        setDeck(getFullDeck().sort(() => Math.random() - 0.5));
        setDrawnCards([]);
        setReflection('');
        setIsFlipped(false);
    };

    // Save Reading
    const saveReading = async () => {
        if (drawnCards.length === 0) return;

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('tarot_readings')
                .insert({
                    user_id: user.id,
                    spread_type: drawnCards.length === 1 ? 'One Card' : 'Three Card',
                    cards_drawn: drawnCards, // JSONB stores the full card object
                    reflection: reflection || null,
                    query: "Daily Draw" // Default for now
                });

            if (error) throw error;

            toast.success('Reading saved to journal.');
            setDrawnCards([]);
            setReflection('');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Table Top */}
            <div className="min-h-[400px] bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 mb-8 relative flex flex-col items-center justify-center">

                {/* Card Spread */}
                <div className="flex flex-wrap gap-8 justify-center items-center">

                    {/* The Deck (Draw Pile) */}
                    <button
                        onClick={drawCard}
                        disabled={drawnCards.length >= 3}
                        className={`
                w-48 h-72 rounded-lg bg-zinc-800 border-2 border-zinc-700 shadow-xl 
                flex items-center justify-center transition-all
                ${drawnCards.length < 3 ? 'hover:-translate-y-2 hover:border-amber-500/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
            `}
                    >
                        <div className="text-zinc-600 font-serif text-center p-4 border border-zinc-700 m-2 h-[90%] w-[90%] flex items-center justify-center box-border">
                            <span className="tracking-widest uppercase text-xs">Digital Grimoire</span>
                        </div>
                    </button>

                    {/* Drawn Cards */}
                    {drawnCards.map((card, index) => (
                        <div
                            key={`${card.id}-${index}`}
                            className="w-48 h-72 bg-black border border-amber-500/30 rounded-lg shadow-2xl flex flex-col animate-in fade-in zoom-in slide-in-from-left-4 duration-500"
                        >
                            <div className="h-40 bg-zinc-800 rounded-t-lg flex items-center justify-center overflow-hidden relative">
                                {/* Placeholder Art */}
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-black" />
                                <span className="text-4xl relative z-10 opacity-50">
                                    {card.arcana === 'Major' ? 'M' : 'm'}
                                </span>
                            </div>
                            <div className="p-4 flex-1 flex flex-col text-center">
                                <h3 className="font-serif text-amber-500 text-lg leading-tight mb-2">{card.name}</h3>
                                <p className="text-xs text-zinc-400 mb-2">{card.keywords.join(" • ")}</p>
                                <div className="mt-auto pt-2 border-t border-white/5">
                                    <p className="text-[10px] text-zinc-500 leading-tight line-clamp-3">
                                        {card.meaning_upright}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {drawnCards.length === 0 && (
                    <p className="absolute bottom-8 text-zinc-500 text-sm animate-pulse">
                        Click the deck to draw a card.
                    </p>
                )}
            </div>

            {/* Controls & Reflection */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
                <label className="block text-sm text-zinc-400 mb-2">Reflection / Journal Entry</label>
                <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="What does this reading reveal to you?"
                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-zinc-300 focus:border-amber-500 outline-none min-h-[100px] mb-4"
                />

                <div className="flex justify-between items-center">
                    <button
                        onClick={resetDeck}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
                    >
                        <RotateCcw size={16} /> Reset
                    </button>

                    <button
                        onClick={saveReading}
                        disabled={saving || drawnCards.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded disabled:opacity-50 transition-colors"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save to Journal
                    </button>
                </div>
            </div>
        </div>
    );
}
