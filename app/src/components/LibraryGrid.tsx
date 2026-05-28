'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BookOpen, Edit, ShoppingCart, Maximize2, X, Layers } from 'lucide-react';
import BookmarkButton from '@/components/BookmarkButton';
import type { Text } from '@/hooks/useLibrary';
import { generateTrackedLink } from '@/lib/utils/affiliate';
import { formatLensName } from '@/lib/utils/formatting';
import { getLensColorClasses } from '@/lib/utils/lens-colors';

interface LibraryGridProps {
  texts: Text[];
  isAdmin?: boolean;
  onDelete?: (textId: string, title: string) => void;
}

export default function LibraryGrid({ texts, isAdmin = false, onDelete }: LibraryGridProps) {
  const router = useRouter();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  if (texts.length === 0) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 p-1">
        {texts.map((text) => {
          const corpus = (text.metadata as any)?.corpus;
          const isCorpus = Boolean((text.metadata as any)?.isCorpusCollection && corpus);
          const corpusWorksCount = isCorpus && Array.isArray(corpus?.groups)
            ? corpus.groups.reduce(
              (sum: number, group: any) => sum + (Array.isArray(group?.items) ? group.items.length : 0),
              0
            )
            : 0;

          return (
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
                    {isCorpus ? (
                      <Layers className="w-14 h-14 opacity-50" />
                    ) : (
                      <BookOpen className="w-14 h-14 opacity-50" />
                    )}
                    <span className="text-sm text-center font-mono opacity-50 line-clamp-2">
                      {text.title}
                    </span>
                  </div>
                )}

                {isCorpus && (
                  <div className="absolute left-2 top-2 z-30 inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-black/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 backdrop-blur-sm">
                    <Layers className="h-3 w-3" />
                    Corpus
                  </div>
                )}

                {/* Hover Overlay - Full Details */}
                <div className="absolute inset-0 z-20 flex flex-col p-5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/95 backdrop-blur-sm antialiased">
                  {/* Header: Title & Author */}
                  <div className="mb-4 shrink-0">
                    <h3 className="text-xl font-bold text-zinc-100 leading-tight mb-2 line-clamp-3">{text.title}</h3>
                    {text.author && <p className="text-base text-amber-500 font-mono uppercase tracking-wider truncate">// {text.author}</p>}
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">

                    {/* Meta Tags */}
                    <div className="flex flex-wrap gap-2">
                      {isCorpus && (
                        <span className="px-2.5 py-1 text-sm border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 rounded uppercase tracking-wider font-medium">
                          {corpusWorksCount} works
                        </span>
                      )}
                      {text.domain && (
                        <span className="px-2.5 py-1 text-sm border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 rounded uppercase tracking-wider font-medium">
                          {text.domain}
                        </span>
                      )}
                      {text.lenses?.slice(0, 4).map(lens => {
                        const lensColor = getLensColorClasses(lens);

                        return (
                        <span key={lens} className={`px-2.5 py-1 text-sm border ${lensColor.border} ${lensColor.bg} ${lensColor.text} rounded`}>
                          {formatLensName(lens)}
                        </span>
                        );
                      })}
                    </div>

                    {/* Summary */}
                    {text.short_summary && (
                      <div className="mb-3">
                        <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider block mb-2">Summary</span>
                        <p className="text-base text-zinc-200 leading-relaxed">{text.short_summary}</p>
                      </div>
                    )}

                    {/* Curator Note */}
                    {text.curator_note && (
                      <div className="pt-3 border-t border-white/10">
                        <span className="text-sm font-bold text-amber-500/80 uppercase tracking-wider block mb-2">Curator Note</span>
                        <p className="text-base text-zinc-300 italic font-serif">"{text.curator_note}"</p>
                      </div>
                    )}
                  </div>

                  {/* Footer: Actions */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.preventDefault(); router.push(`/admin/edit/${text.id}`); }}
                          className="text-zinc-500 hover:text-amber-400 p-2 hover:bg-white/5 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedCardId(text.id);
                        }}
                        className="text-zinc-500 hover:text-cyan-400 p-2 hover:bg-white/5 rounded transition-colors"
                        title="Expand View"
                      >
                        <Maximize2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(generateTrackedLink(text.title, text.author || undefined, 'Library_Grid'), '_blank', 'noopener,noreferrer');
                        }}
                        className="text-zinc-500 hover:text-amber-500 p-2 hover:bg-white/5 rounded transition-colors"
                        title="Buy on Amazon"
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </button>
                      <div onClick={(e) => { e.preventDefault(); }}>
                        <BookmarkButton textId={text.id} size="sm" />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1 group-hover:text-zinc-300 transition-colors">
                      {isCorpus ? 'Open Corpus' : 'Access'}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
          );
        })}
      </div>

      {/* Expanded Card Modal */}
      {expandedCardId && (() => {
        const expandedText = texts.find(t => t.id === expandedCardId);
        if (!expandedText) return null;
        const expandedCorpus = (expandedText.metadata as any)?.corpus;
        const expandedIsCorpus = Boolean((expandedText.metadata as any)?.isCorpusCollection && expandedCorpus);
        const expandedCorpusWorksCount = expandedIsCorpus && Array.isArray(expandedCorpus?.groups)
          ? expandedCorpus.groups.reduce(
            (sum: number, group: any) => sum + (Array.isArray(group?.items) ? group.items.length : 0),
            0
          )
          : 0;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setExpandedCardId(null)}
          >
            <div
              className="relative bg-zinc-900 border border-amber-500/30 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl shadow-amber-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setExpandedCardId(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-2 hover:bg-white/5 rounded transition-colors"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Cover Image */}
              {expandedText.cover_image_url && (
                <div className="relative w-full aspect-[2/3] max-w-sm mx-auto mb-6 rounded-lg overflow-hidden border border-white/10">
                  <Image
                    src={expandedText.cover_image_url}
                    alt={expandedText.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 500px"
                    className="object-cover"
                    style={{ objectPosition: (expandedText.metadata as any)?.cover_position || 'center' }}
                  />
                </div>
              )}

              {/* Title & Author */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-zinc-100 leading-tight mb-3">{expandedText.title}</h2>
                {expandedText.author && (
                  <p className="text-xl text-amber-500 font-mono uppercase tracking-wider">// {expandedText.author}</p>
                )}
              </div>

              {/* Meta Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {expandedIsCorpus && (
                  <span className="px-3 py-1.5 text-base border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 rounded uppercase tracking-wider font-medium">
                    {expandedCorpusWorksCount} works
                  </span>
                )}
                {expandedText.domain && (
                  <span className="px-3 py-1.5 text-base border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 rounded uppercase tracking-wider font-medium">
                    {expandedText.domain}
                  </span>
                )}
                {expandedText.lenses?.map(lens => {
                  const lensColor = getLensColorClasses(lens);

                  return (
                  <span key={lens} className={`px-3 py-1.5 text-base border ${lensColor.border} ${lensColor.bg} ${lensColor.text} rounded`}>
                    {formatLensName(lens)}
                  </span>
                  );
                })}
              </div>

              {/* Summary */}
              {expandedText.short_summary && (
                <div className="mb-6 pb-6 border-b border-white/10">
                  <h3 className="text-lg font-bold text-zinc-500 uppercase tracking-wider mb-3">Summary</h3>
                  <p className="text-lg text-zinc-200 leading-relaxed">{expandedText.short_summary}</p>
                </div>
              )}

              {/* Curator Note */}
              {expandedText.curator_note && (
                <div className="mb-6 pb-6 border-b border-white/10">
                  <h3 className="text-lg font-bold text-amber-500/80 uppercase tracking-wider mb-3">Curator Note</h3>
                  <p className="text-lg text-zinc-300 italic font-serif">"{expandedText.curator_note}"</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push(`/library/${expandedText.id}`)}
                  className="px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-lg transition-colors font-medium"
                >
                  {expandedIsCorpus ? 'Open Corpus' : 'View Full Text'}
                </button>
                <button
                  onClick={() => window.open(generateTrackedLink(expandedText.title, expandedText.author || undefined, 'Library_Modal'), '_blank', 'noopener,noreferrer')}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Buy on Amazon
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
