import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function WorkbenchRitualsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch rituals
    const { data: rituals } = await supabase
        .from('rituals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-serif text-amber-500 mb-2">My Rituals</h1>
                    <p className="text-zinc-400">Design and perform your personal rites.</p>
                </div>
                <Link
                    href="/workbench/rituals/create"
                    className="px-4 py-2 bg-amber-600 text-black font-semibold rounded hover:bg-amber-500 transition-colors"
                >
                    Create New Ritual
                </Link>
            </div>

            {(!rituals || rituals.length === 0) ? (
                <div className="text-center py-20 border border-zinc-800 rounded-lg bg-black/40">
                    <h3 className="text-xl text-zinc-300 mb-4">No rituals recorded yet.</h3>
                    <p className="text-zinc-500 max-w-md mx-auto mb-8">
                        Begin your practice by designing a simple ritual. Set your intention, choose your materials, and define the steps.
                    </p>
                    <Link
                        href="/workbench/rituals/create"
                        className="px-6 py-3 border border-amber-500/50 text-amber-500 rounded hover:bg-amber-500/10 transition-colors"
                    >
                        Start Your First Rite
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rituals.map((ritual: any) => (
                        <Link
                            key={ritual.id}
                            href={`/workbench/rituals/${ritual.id}/active`}
                            className="block group"
                        >
                            <div className="h-full p-6 bg-black/40 border border-zinc-800 hover:border-amber-500/50 rounded-lg transition-all hover:bg-black/60">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-serif text-zinc-200 group-hover:text-amber-400 transition-colors">
                                        {ritual.title}
                                    </h3>
                                    {ritual.is_favorite && (
                                        <span className="text-amber-500">★</span>
                                    )}
                                </div>

                                <p className="text-zinc-500 text-sm mb-4 line-clamp-2">
                                    {ritual.intention || "No specific intention set."}
                                </p>

                                <div className="flex items-center gap-2 text-xs text-zinc-600">
                                    {ritual.phase && (
                                        <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded">
                                            {ritual.phase}
                                        </span>
                                    )}
                                    {ritual.estimated_duration_minutes && (
                                        <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded">
                                            {ritual.estimated_duration_minutes}m
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
