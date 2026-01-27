import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import ActiveRitualPlayer from '@/components/practitioner/ActiveRitualPlayer';

interface ActiveRitualPageProps {
    params: {
        id: string;
    };
}

export default async function ActiveRitualPage({ params }: ActiveRitualPageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Fetch Ritual Metadata
    const { data: ritual, error } = await supabase
        .from('rituals')
        .select('*')
        .eq('id', params.id)
        .single();

    if (error || !ritual) {
        notFound();
    }

    // 2. Fetch Steps
    const { data: steps } = await supabase
        .from('ritual_steps')
        .select('*')
        .eq('ritual_id', params.id)
        .order('step_order', { ascending: true });

    const ritualData = {
        ...ritual,
        steps: steps || []
    };

    return <ActiveRitualPlayer ritual={ritualData} />;
}
