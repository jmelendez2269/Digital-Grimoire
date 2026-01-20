'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BookOpen, Edit } from 'lucide-react';
import BookmarkButton from '@/components/BookmarkButton';
import type { Text } from '@/hooks/useLibrary';

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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-1">
        {texts.map((text) => (
          <div
            key={text.id}
            className="group relative flex flex-col h-full bg-zinc-900/40 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:bg-zinc-800/60"
          >
            {/* Image Section (Inset) */}
            <div className="px-3 pt-3">
              <Link href={`/library/${text.id}`} className="relative block aspect-[3/4] w-full overflow-hidden rounded-sm border border-white/5 bg-black/50">
                {/* Scanline Overlay */}
                <div className="absolute inset-0 z-10 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none opacity-30" />

                {text.cover_image_url ? (
                  <Image
                    src={text.cover_image_url}
                    alt={text.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover opacity-90 group-hover:opacity-40 transition-all duration-500 grayscale-[0.3] group-hover:grayscale-0"
                    style={{ objectPosition: (text.metadata as any)?.cover_position || 'center' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                    <BookOpen className="w-8 h-8 text-zinc-700" />
                  </div>
                )}

                {/* Hover Overlay - Summary & Curator Note */}
                <div className="absolute inset-0 z-20 flex flex-col p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-sm overflow-hidden">
                  <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent pr-2 space-y-3">
                    {text.short_summary && (
                      <div className="space-y-1">
                        <h4 className="text-xs uppercase tracking-wider text-amber-500 font-bold">Summary</h4>
                        <p className="text-sm text-zinc-300 leading-relaxed font-light">
                          {text.short_summary}
                        </p>
                      </div>
                    )}

                    {text.curator_note && (
                      <div className="space-y-1 pt-2 border-t border-white/10">
                        <h4 className="text-xs uppercase tracking-wider text-cyan-500 font-bold">Curator's Note</h4>
                        <p className="text-sm text-zinc-400 italic font-serif leading-relaxed">
                          "{text.curator_note}"
                        </p>
                      </div>
                    )}

                    {/* Domain & Lenses */}
                    {(text.domain || (text.lenses && text.lenses.length > 0)) && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        {text.domain && (
                          <div className="space-y-1">
                            <h4 className="text-xs uppercase tracking-wider text-cyan-500 font-bold">Domain</h4>
                            <span className="inline-block px-2 py-0.5 text-xs border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 rounded-sm">
                              {text.domain}
                            </span>
                          </div>
                        )}
                        {text.lenses && text.lenses.length > 0 && (
                          <div className="space-y-1">
                            <h4 className="text-xs uppercase tracking-wider text-purple-500 font-bold">Lenses</h4>
                            <div className="flex flex-wrap gap-1">
                              {text.lenses.map(lens => (
                                <span key={lens} className="px-2 py-0.5 text-xs border border-white/10 bg-white/5 text-zinc-300 rounded-sm">
                                  {lens}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!text.short_summary && !text.curator_note && !text.domain && (!text.lenses || text.lenses.length === 0) && (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-xs text-zinc-600 uppercase tracking-widest">No details available</p>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col p-4 gap-3">
              {/* Header */}
              <div className="mb-1">
                <Link href={`/library/${text.id}`} className="block">
                  <h3 className="text-lg font-bold text-zinc-200 group-hover:text-amber-400 leading-tight mb-1.5 transition-colors line-clamp-2 uppercase tracking-tight">
                    {text.title}
                  </h3>
                </Link>
                {text.author && (
                  <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono uppercase tracking-wider">
                    <span>//</span>
                    <span className="truncate">{text.author}</span>
                  </div>
                )}
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {text.domain && (
                  <span className="px-2 py-0.5 text-xs border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 rounded-sm">
                    {text.domain}
                  </span>
                )}
                {text.lenses?.slice(0, 2).map(lens => (
                  <span key={lens} className="px-2 py-0.5 text-xs border border-white/10 bg-white/5 text-zinc-400 rounded-sm">
                    {lens}
                  </span>
                ))}
              </div>

              {/* Action Footer */}
              <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-1">
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.preventDefault(); router.push(`/admin/edit/${text.id}`); }}
                      title="Edit Node"
                      aria-label="Edit Node"
                      className="p-1 hover:text-amber-400 text-zinc-600 transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  )}
                  <BookmarkButton textId={text.id} size="sm" />
                </div>

                <Link
                  href={`/library/${text.id}`}
                  className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  Access_Node <span className="text-amber-500">&gt;</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
