import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TarotWorkbench from '@/components/practitioner/TarotWorkbench';

export default async function DeckForgePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-10 border-b border-zinc-800/50 pb-8">
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-amber-500 text-2xl">✦</span>
                    <h1 className="text-4xl font-serif text-amber-500">Deck Forge</h1>
                </div>
                <p className="text-zinc-400 text-lg max-w-2xl">
                    Generate custom tarot cards using arcane intelligence and your unique vision.
                </p>
            </div>

            <TarotWorkbench />
        </div>
    );
}
