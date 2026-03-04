import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Wand2, History } from 'lucide-react';

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
            <div className="mb-8 border-b border-zinc-800/50 pb-8 text-center pt-8">
                <h1 className="text-5xl font-serif text-amber-500 mb-4">The Oracle</h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Consult the digital cards for guidance and reflection.</p>
            </div>

            <div className="max-w-xl mx-auto mb-16">
                <Link href="/extras/tarot/draw" className="group p-8 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-amber-500/50 transition-all hover:-translate-y-1 block">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                            <Sparkles size={24} />
                        </div>
                        <h2 className="text-2xl font-serif text-zinc-100 group-hover:text-amber-400 transition-colors">Daily Draw</h2>
                    </div>
                    <p className="text-zinc-400">Draw from the standard digital grimoire deck. Focus your intention and receive a reading.</p>
                </Link>
            </div>

            {/* History Section */}
            {recentReadings && recentReadings.length > 0 && (
                <div className="max-w-4xl mx-auto mt-16 pt-8 border-t border-zinc-800">
                    <div className="flex items-center gap-3 mb-8">
                        <History className="text-amber-500" size={24} />
                        <h2 className="text-3xl font-serif text-zinc-100">Draw History</h2>
                    </div>

                    <div className="grid gap-4">
                        {recentReadings.map((reading: any) => (
                            <div key={reading.id} className="bg-zinc-900/30 p-6 rounded-lg border border-zinc-800 flex flex-col md:flex-row gap-6 hover:border-zinc-700 transition-colors">
                                <div className="text-amber-500/80 font-mono text-sm whitespace-nowrap min-w-[100px]">
                                    {new Date(reading.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {reading.cards_drawn.map((card: any, i: number) => (
                                            <span key={i} className="px-3 py-1 bg-black border border-zinc-700 rounded text-sm text-zinc-300">
                                                {card.name}
                                            </span>
                                        ))}
                                    </div>
                                    {reading.reflection && (
                                        <div className="pl-4 border-l-2 border-amber-900/50">
                                            <p className="text-zinc-400 text-sm italic leading-relaxed">"{reading.reflection}"</p>
                                        </div>
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
