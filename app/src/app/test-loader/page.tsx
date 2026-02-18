'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ParallaxLoader from '@/components/ui/ParallaxLoader';
import AppLoader from '@/components/ui/AppLoader';

export default function LoaderTestPage() {
    return (
        <div className="flex min-h-screen flex-col bg-zinc-950 text-amber-100">
            <Header />
            <main className="flex-1 p-8">
                <div className="max-w-4xl mx-auto space-y-12">
                    <section className="text-center space-y-4">
                        <h1 className="text-3xl font-bold text-amber-500">Loader Verification</h1>
                        <p className="text-amber-100/60 font-medium">Testing the new Parallax-themed loading animations.</p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 bg-zinc-900/50 border border-amber-900/20 rounded-xl flex flex-col items-center gap-6">
                            <h2 className="text-lg font-semibold text-amber-200">ParallaxLoader (MD)</h2>
                            <ParallaxLoader size="md" />
                        </div>

                        <div className="p-8 bg-zinc-900/50 border border-amber-900/20 rounded-xl flex flex-col items-center gap-6">
                            <h2 className="text-lg font-semibold text-amber-200">ParallaxLoader (LG)</h2>
                            <ParallaxLoader size="lg" />
                        </div>
                    </div>

                    <div className="p-8 bg-zinc-900/50 border border-amber-900/20 rounded-xl flex flex-col items-center gap-8">
                        <h2 className="text-lg font-semibold text-amber-200">Full AppLoader Integration</h2>
                        <AppLoader message="Accessing the Grimoire..." />
                    </div>

                    <section className="bg-amber-900/10 border border-amber-500/20 p-6 rounded-lg text-sm leading-relaxed">
                        <h3 className="text-amber-400 font-bold mb-2">Design Notes:</h3>
                        <ul className="list-disc list-inside space-y-1 text-amber-100/70">
                            <li>Central "Lens" motif with blinking eye and shifting pupil represents perspective focus.</li>
                            <li>7 Orbiting icons represent the Scientific, Psychological, Philosophical, Religious, Historical, Symbolic, and Mathematical lenses.</li>
                            <li>Layered SVG animations create a subtle parallax depth effect.</li>
                            <li>Integrated seamlessly into the existing <code className="bg-black/30 px-1 rounded">AppLoader</code> component.</li>
                        </ul>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
