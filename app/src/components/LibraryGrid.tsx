"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Edit,
  ShoppingCart,
  Maximize2,
  X,
  Layers,
  LockKeyhole,
} from "lucide-react";
import BookmarkButton from "@/components/BookmarkButton";
import type { Text } from "@/hooks/useLibrary";
import { generateTrackedLink } from "@/lib/utils/affiliate";
import { formatLensName } from "@/lib/utils/formatting";
import { getLensColorClasses } from "@/lib/utils/lens-colors";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : null;
}

function getCoverPosition(metadataValue: unknown): string {
  const coverPosition = asRecord(metadataValue)?.cover_position;
  return typeof coverPosition === "string" ? coverPosition : "center";
}

function getCorpusPresentation(metadataValue: unknown): {
  isCorpus: boolean;
  worksCount: number;
} {
  const metadata = asRecord(metadataValue);
  const corpus = asRecord(metadata?.corpus);
  const publicWorksCount =
    typeof metadata?.corpusWorkCount === "number"
      ? metadata.corpusWorkCount
      : null;
  const groups = Array.isArray(corpus?.groups) ? corpus.groups : [];
  const nestedWorksCount = groups.reduce((total, rawGroup) => {
    const group = asRecord(rawGroup);
    if (!group) return total;

    const works = Array.isArray(group.items)
      ? group.items
      : Array.isArray(group.works)
        ? group.works
        : [];
    return total + works.length;
  }, 0);

  return {
    isCorpus:
      metadata?.isCorpusCollection === true &&
      (corpus !== null || publicWorksCount !== null),
    worksCount: publicWorksCount ?? nestedWorksCount,
  };
}

interface LibraryGridProps {
  texts: Text[];
  isAdmin?: boolean;
  isAuthenticated?: boolean;
  onDelete?: (textId: string, title: string) => void;
}

export default function LibraryGrid({
  texts,
  isAdmin = false,
  isAuthenticated = true,
}: LibraryGridProps) {
  const router = useRouter();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [failedCoverIds, setFailedCoverIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>("img[data-library-text-id]")
    );

    const markFailed = (image: HTMLImageElement) => {
      const textId = image.dataset.libraryTextId;
      if (!textId) return;
      setFailedCoverIds((current) => {
        if (current.has(textId)) return current;
        const next = new Set(current);
        next.add(textId);
        return next;
      });
    };

    const handleError = (event: Event) => {
      markFailed(event.currentTarget as HTMLImageElement);
    };

    images.forEach((image) => image.addEventListener("error", handleError));
    const frame = window.requestAnimationFrame(() => {
      images.forEach((image) => {
        if (image.complete && image.naturalWidth === 0) markFailed(image);
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      images.forEach((image) => image.removeEventListener("error", handleError));
    };
  }, [texts]);

  if (texts.length === 0) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="grid grid-cols-2 gap-4 p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
        {texts.map((text) => {
          const { isCorpus, worksCount: corpusWorksCount } =
            getCorpusPresentation(text.metadata);
          const readHref = isAuthenticated
            ? `/library/${text.id}`
            : `/login?redirect=${encodeURIComponent(`/library/${text.id}`)}`;

          return (
            <div
              key={text.id}
              className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-transparent transition-all duration-300 hover:z-10 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]"
            >
              <div className="relative aspect-[2/3] w-full">
                <Link
                  href={readHref}
                  className="relative block h-full w-full cursor-pointer overflow-hidden rounded-md border border-white/10 bg-zinc-900 transition-colors group-hover:border-amber-500/50"
                >
                  {/* Scanline Overlay */}
                  <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] opacity-20" />

                  {text.cover_image_url && !failedCoverIds.has(text.id) ? (
                    <Image
                      src={text.cover_image_url}
                      alt={text.title}
                      data-library-text-id={text.id}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                      className="object-cover grayscale-[0.2] transition-all duration-500 group-hover:scale-110 group-hover:grayscale-0"
                      style={{
                        objectPosition: getCoverPosition(text.metadata),
                      }}
                      onError={() =>
                        setFailedCoverIds((current) => {
                          const next = new Set(current);
                          next.add(text.id);
                          return next;
                        })
                      }
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-900 p-4 text-zinc-700">
                      {isCorpus ? (
                        <Layers className="h-14 w-14 opacity-50" />
                      ) : (
                        <BookOpen className="h-14 w-14 opacity-50" />
                      )}
                      <span className="line-clamp-2 text-center font-mono text-sm opacity-50">
                        {text.title}
                      </span>
                    </div>
                  )}

                  {isCorpus && (
                    <div className="absolute top-2 left-2 z-30 inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-black/80 px-2 py-1 text-[10px] font-semibold tracking-wider text-cyan-300 uppercase backdrop-blur-sm">
                      <Layers className="h-3 w-3" />
                      Corpus
                    </div>
                  )}

                  {!isAuthenticated && (
                    <div className="absolute top-2 right-2 z-30 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/80 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-zinc-300 uppercase backdrop-blur-sm">
                      <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                      Sign in to read
                    </div>
                  )}

                  {/* Hover Overlay - Full Details */}
                  <div className="absolute inset-0 z-20 flex flex-col bg-black/95 p-5 antialiased opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100">
                    {/* Header: Title & Author */}
                    <div className="mb-4 shrink-0">
                      <h3 className="mb-2 line-clamp-3 text-xl leading-tight font-bold text-zinc-100">
                        {text.title}
                      </h3>
                      {text.author && (
                        <p className="truncate font-mono text-base tracking-wider text-amber-500 uppercase">
                          {"// "}
                          {text.author}
                        </p>
                      )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                      {/* Meta Tags */}
                      <div className="flex flex-wrap gap-2">
                        {isCorpus && (
                          <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-sm font-medium tracking-wider text-cyan-400 uppercase">
                            {corpusWorksCount} works
                          </span>
                        )}
                        {text.domain && (
                          <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-sm font-medium tracking-wider text-cyan-400 uppercase">
                            {text.domain}
                          </span>
                        )}
                        {text.lenses?.slice(0, 4).map((lens) => {
                          const lensColor = getLensColorClasses(lens);

                          return (
                            <span
                              key={lens}
                              className={`border px-2.5 py-1 text-sm ${lensColor.border} ${lensColor.bg} ${lensColor.text} rounded`}
                            >
                              {formatLensName(lens)}
                            </span>
                          );
                        })}
                      </div>

                      {/* Summary */}
                      {text.short_summary && (
                        <div className="mb-3">
                          <span className="mb-2 block text-sm font-bold tracking-wider text-zinc-500 uppercase">
                            Summary
                          </span>
                          <p className="text-base leading-relaxed text-zinc-200">
                            {text.short_summary}
                          </p>
                        </div>
                      )}

                      {/* Curator Note */}
                      {text.curator_note && (
                        <div className="border-t border-white/10 pt-3">
                          <span className="mb-2 block text-sm font-bold tracking-wider text-amber-500/80 uppercase">
                            Curator Note
                          </span>
                          <p className="font-serif text-base text-zinc-300 italic">
                            “{text.curator_note}”
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer: Actions */}
                    <div className="mt-4 flex shrink-0 items-center justify-between border-t border-white/10 pt-4">
                      <div
                        className="flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(`/admin/edit/${text.id}`);
                            }}
                            className="rounded p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-amber-400"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpandedCardId(text.id);
                          }}
                          className="rounded p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-cyan-400"
                          title="Expand View"
                        >
                          <Maximize2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(
                              generateTrackedLink(
                                text.title,
                                text.author || undefined,
                                "Library_Grid"
                              ),
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                          className="rounded p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-amber-500"
                          title="Buy on Amazon"
                        >
                          <ShoppingCart className="h-5 w-5" />
                        </button>
                        {isAuthenticated && (
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                            }}
                          >
                            <BookmarkButton textId={text.id} size="sm" />
                          </div>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-sm font-bold tracking-widest text-zinc-500 uppercase transition-colors group-hover:text-zinc-300">
                        {!isAuthenticated
                          ? "Sign in to read"
                          : isCorpus
                            ? "Open Corpus"
                            : "Access"}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
              <div className="flex flex-1 flex-col px-1 pt-3 pb-3">
                <h3 className="line-clamp-2 text-sm leading-5 font-semibold text-zinc-100">
                  {text.title}
                </h3>
                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                  {text.author || "Author unknown"}
                </p>
                <button
                  type="button"
                  onClick={() => setExpandedCardId(text.id)}
                  className="mt-3 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/10 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-cyan-300/30 hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                  aria-label={`Preview details for ${text.title}`}
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Preview details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Card Modal */}
      {expandedCardId &&
        (() => {
          const expandedText = texts.find((t) => t.id === expandedCardId);
          if (!expandedText) return null;
          const {
            isCorpus: expandedIsCorpus,
            worksCount: expandedCorpusWorksCount,
          } = getCorpusPresentation(expandedText.metadata);
          const expandedReadHref = isAuthenticated
            ? `/library/${expandedText.id}`
            : `/login?redirect=${encodeURIComponent(`/library/${expandedText.id}`)}`;

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
              onClick={() => setExpandedCardId(null)}
            >
              <div
                className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-amber-500/30 bg-zinc-900 p-8 shadow-2xl shadow-amber-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setExpandedCardId(null)}
                  className="absolute top-4 right-4 rounded p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
                  title="Close"
                >
                  <X className="h-6 w-6" />
                </button>

                {/* Cover Image */}
              {expandedText.cover_image_url &&
                !failedCoverIds.has(expandedText.id) && (
                <div className="relative mx-auto mb-6 aspect-[2/3] w-full max-w-sm overflow-hidden rounded-lg border border-white/10">
                  <Image
                    src={expandedText.cover_image_url}
                    alt={expandedText.title}
                    data-library-text-id={expandedText.id}
                      fill
                      sizes="(max-width: 768px) 100vw, 500px"
                      className="object-cover"
                    style={{
                      objectPosition: getCoverPosition(expandedText.metadata),
                    }}
                    onError={() =>
                      setFailedCoverIds((current) => {
                        const next = new Set(current);
                        next.add(expandedText.id);
                        return next;
                      })
                    }
                  />
                </div>
              )}

                {/* Title & Author */}
                <div className="mb-6">
                  <h2 className="mb-3 text-3xl leading-tight font-bold text-zinc-100">
                    {expandedText.title}
                  </h2>
                  {expandedText.author && (
                    <p className="font-mono text-xl tracking-wider text-amber-500 uppercase">
                      {"// "}
                      {expandedText.author}
                    </p>
                  )}
                </div>

                {/* Meta Tags */}
                <div className="mb-6 flex flex-wrap gap-2">
                  {expandedIsCorpus && (
                    <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-base font-medium tracking-wider text-cyan-400 uppercase">
                      {expandedCorpusWorksCount} works
                    </span>
                  )}
                  {expandedText.domain && (
                    <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-base font-medium tracking-wider text-cyan-400 uppercase">
                      {expandedText.domain}
                    </span>
                  )}
                  {expandedText.lenses?.map((lens) => {
                    const lensColor = getLensColorClasses(lens);

                    return (
                      <span
                        key={lens}
                        className={`border px-3 py-1.5 text-base ${lensColor.border} ${lensColor.bg} ${lensColor.text} rounded`}
                      >
                        {formatLensName(lens)}
                      </span>
                    );
                  })}
                </div>

                {/* Summary */}
                {expandedText.short_summary && (
                  <div className="mb-6 border-b border-white/10 pb-6">
                    <h3 className="mb-3 text-lg font-bold tracking-wider text-zinc-500 uppercase">
                      Summary
                    </h3>
                    <p className="text-lg leading-relaxed text-zinc-200">
                      {expandedText.short_summary}
                    </p>
                  </div>
                )}

                {/* Curator Note */}
                {expandedText.curator_note && (
                  <div className="mb-6 border-b border-white/10 pb-6">
                    <h3 className="mb-3 text-lg font-bold tracking-wider text-amber-500/80 uppercase">
                      Curator Note
                    </h3>
                    <p className="font-serif text-lg text-zinc-300 italic">
                      “{expandedText.curator_note}”
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => router.push(expandedReadHref)}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-6 py-3 font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
                  >
                    {!isAuthenticated
                      ? "Sign in to read"
                      : expandedIsCorpus
                        ? "Open Corpus"
                        : "View Full Text"}
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        generateTrackedLink(
                          expandedText.title,
                          expandedText.author || undefined,
                          "Library_Modal"
                        ),
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    <ShoppingCart className="h-5 w-5" />
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
