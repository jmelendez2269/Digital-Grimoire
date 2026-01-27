import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RitualEditor from '@/components/practitioner/RitualEditor';

export default async function CreateRitualPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-serif text-zinc-100 mb-2">Design New Ritual</h1>
                <p className="text-zinc-400">Codify your intent into action.</p>
            </div>

            <RitualEditor />
        </div>
    );
}
