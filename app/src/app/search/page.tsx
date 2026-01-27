'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function SearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Construct the target URL with query params
        const query = searchParams.get('q') || searchParams.get('query') || '';
        const type = searchParams.get('type') || 'all';

        // Map existing params to the dashboard tabs
        let tab = 'ai'; // Default to AI search
        if (type === 'library' || type === 'books') tab = 'library';
        if (type === 'concept' || type === 'ideas') tab = 'concept';

        // Build the redirect URL
        const params = new URLSearchParams();
        if (query) params.set('query', query);
        params.set('tab', tab);

        // Perform the redirect
        router.replace(`/?${params.toString()}`);
    }, [searchParams, router]);

    return (
        <div className="flex min-h-screen flex-col bg-black">
            <Header />
            <main className="flex flex-1 flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                        <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin relative z-10" />
                    </div>
                    <h1 className="text-xl font-medium text-amber-100/80">
                        Redirecting to Search Hub...
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        Accessing the central knowledge matrix
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
