import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import TarotDeck from '@/components/practitioner/TarotDeck';

export default async function TarotDrawPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Back Button and Header */}
            <div className="mb-8 border-b border-zinc-800/50 pb-8">
                <Link
                    href="/extras/tarot"
                    className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-amber-500 mb-6 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to The Oracle
                </Link>
                <h1 className="text-4xl font-serif text-amber-500 mb-3 flex items-center gap-3">
                    <span className="text-amber-500">✦</span> Daily Draw
                </h1>
                <p className="text-zinc-400 text-lg">Draw cards from the digital grimoire standard deck to gain insight and guidance.</p>
            </div>

            <TarotDeck />
        </div>
    );
}
