'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BookOpen, Edit, ShoppingCart } from 'lucide-react';
import BookmarkButton from '@/components/BookmarkButton';
import type { Text } from '@/hooks/useLibrary';
import { generateTrackedLink } from '@/lib/utils/affiliate';

interface LibraryGridProps {
  texts: Text[];
  isAdmin?: boolean;
  onDelete?: (textId: string, title: string) => void;
}

export default function LibraryGrid({ texts, isAdmin = false, onDelete }: LibraryGridProps) {
  const router = useRouter();

  if (texts.length === 0) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 p-1">
        {texts.map((text) => (
          <div
            key={text.id}
            className="group relative flex flex-col h-full bg-transparent rounded-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:scale-[1.02] hover:z-10"
          >
            <div className="relative w-full aspect-[2/3]">
              <Link href={`/library/${text.id}`} className="block w-full h-full relative cursor-pointer overflow-hidden rounded-md border border-white/10 bg-zinc-900 group-hover:border-amber-500/50 transition-colors">

                {/* Scanline Overlay */}
                <div className="absolute inset-0 z-10 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none opacity-20" />

                {text.cover_image_url ? (
                  <Image
                    src={text.cover_image_url}
                    alt={text.title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    className="object-cover transition-all duration-500 grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110"
                    style={{ objectPosition: (text.metadata as any)?.cover_position || 'center' }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-900 text-zinc-700 gap-2">
                    <BookOpen className="w-8 h-8 opacity-50" />
                    <span className="text-xs text-center font-mono opacity-50 line-clamp-2">{text.title}</span>
                  </div>
                )}

                {/* Hover Overlay - Full Details */}
                <div className="absolute inset-0 z-20 flex flex-col p-4 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/95 backdrop-blur-sm">
                  {/* Header: Title & Author */}
                  <div className="mb-3 shrink-0">
                    <h3 className="text-base font-bold text-zinc-100 leading-snug mb-1 line-clamp-3">{text.title}</h3>
                    {text.author && <p className="text-xs text-amber-500 font-mono uppercase tracking-wider truncate">// {text.author}</p>}
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">

                    {/* Meta Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {text.domain && (
                        <span className="px-1.5 py-0.5 text-[10px] border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 rounded uppercase tracking-wider">
                          {text.domain}
                        </span>
                      )}
                      {text.lenses?.slice(0, 4).map(lens => (
                        <span key={lens} className="px-1.5 py-0.5 text-[10px] border border-white/10 bg-white/5 text-zinc-400 rounded">
                          {lens}
                        </span>
                      ))}
                    </div>

                    {/* Summary */}
                    {text.short_summary && (
                      <div className="mb-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Summary</span>
                        <p className="text-xs text-zinc-300 leading-relaxed font-light">{text.short_summary}</p>
                      </div>
                    )}

                    {/* Curator Note */}
                    {text.curator_note && (
                      <div className="pt-2 border-t border-white/10">
                        <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider block mb-1">Curator Note</span>
                        <p className="text-xs text-zinc-400 italic font-serif">"{text.curator_note}"</p>
                      </div>
                    )}
                  </div>

                  {/* Footer: Actions */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.preventDefault(); router.push(`/admin/edit/${text.id}`); }}
                          className="text-zinc-500 hover:text-amber-400 p-1.5 hover:bg-white/5 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(generateTrackedLink(text.title, text.author || undefined, 'Library_Grid'), '_blank', 'noopener,noreferrer');
                        }}
                        className="text-zinc-500 hover:text-amber-500 p-1.5 hover:bg-white/5 rounded transition-colors"
                        title="Buy on Amazon"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                      <div onClick={(e) => { e.preventDefault(); }}>
                        <BookmarkButton textId={text.id} size="sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1 group-hover:text-zinc-300 transition-colors">
                      Access
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
