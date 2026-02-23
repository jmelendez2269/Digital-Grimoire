"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, ScrollText, PlayCircle } from 'lucide-react';

export default function PractitionerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const tabs = [
        { name: 'Rituals', href: '/practitioner/rituals', icon: ScrollText },
        { name: 'Tarot Oracle', href: '/practitioner/tarot', icon: Sparkles },
        // { name: 'Meditation', href: '/practitioner/meditation', icon: PlayCircle }, // Future
    ];

    return (
        <div className="min-h-screen bg-black text-zinc-100 pb-24">
            {/* Sub-Navigation */}
            <div className="border-b border-zinc-800 bg-black/40 backdrop-blur sticky top-16 z-30">
                <div className="container mx-auto px-4">
                    <div className="flex space-x-8 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = pathname.startsWith(tab.href);

                            return (
                                <Link
                                    key={tab.name}
                                    href={tab.href}
                                    className={`
                    flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${isActive
                                            ? 'border-amber-500 text-amber-500'
                                            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}
                  `}
                                >
                                    <Icon size={16} />
                                    {tab.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            <main>
                {children}
            </main>
        </div>
    );
}
