"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FlaskConical, Wand2 } from 'lucide-react';
import Header from '@/components/Header';

type Tab = {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  comingSoon?: boolean;
};

const tabs: Tab[] = [
  { name: 'Journal',      href: '/journal',                  icon: BookOpen    },
  { name: 'The Working',  href: '/workbench/the-working',    icon: FlaskConical },
  { name: 'Tarot',        href: '/workbench/tarot',          icon: Wand2,  comingSoon: true },
];

export default function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-24">
      <Header />
      <div className="border-b border-zinc-800 bg-black/40 backdrop-blur sticky top-16 z-30">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = !tab.comingSoon && isActive(tab.href);

              return tab.comingSoon ? (
                <div
                  key={tab.name}
                  className="flex items-center gap-2 py-4 text-base font-medium border-b-2 border-transparent text-zinc-600 whitespace-nowrap cursor-default select-none"
                >
                  <Icon size={16} />
                  {tab.name}
                  <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest ml-1">soon</span>
                </div>
              ) : (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`flex items-center gap-2 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'border-amber-500 text-amber-500'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <main>{children}</main>
    </div>
  );
}
