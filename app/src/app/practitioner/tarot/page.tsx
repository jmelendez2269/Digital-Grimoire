import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TarotDeck from '@/components/practitioner/TarotDeck';
import TarotWorkbench from '@/components/practitioner/TarotWorkbench';

export default async function TarotPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch recent readings
    const { data: recentReadings } = await supabase
        .from('tarot_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-serif text-amber-500 mb-2">The Oracle</h1>
                <p className="text-zinc-400">Consult the cards for guidance.</p>
            </div>

            <TarotWorkbench />

            {/* History Section - MVP: Just a list */}
            {recentReadings && recentReadings.length > 0 && (
                <div className="max-w-4xl mx-auto mt-16 pt-8 border-t border-zinc-800">
                    <h2 className="text-xl font-serif text-zinc-300 mb-6">Recent Draw History</h2>
                    <div className="grid gap-4">
                        {recentReadings.map((reading: any) => (
                            <div key={reading.id} className="bg-zinc-900/30 p-4 rounded border border-zinc-800 flex gap-4">
                                <div className="text-amber-500 font-mono text-sm whitespace-nowrap">
                                    {new Date(reading.created_at).toLocaleDateString()}
                                </div>
                                <div>
                                    <div className="flex gap-2 mb-2">
                                        {reading.cards_drawn.map((card: any, i: number) => (
                                            <span key={i} className="px-2 py-0.5 bg-black border border-zinc-700 rounded text-xs text-zinc-300">
                                                {card.name}
                                            </span>
                                        ))}
                                    </div>
                                    {reading.reflection && (
                                        <p className="text-zinc-400 text-sm italic">"{reading.reflection}"</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
