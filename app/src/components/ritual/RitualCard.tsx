import Link from "next/link";
import Image from "next/image";
import { Clock, Book, ArrowRight } from "lucide-react";

interface RitualCardProps {
    id: string;
    title: string;
    description: string;
    duration?: string;
    difficulty?: "Beginner" | "Intermediate" | "Advanced";
    tags?: string[];
    imageUrl?: string | null;
    source?: string;
}

export default function RitualCard({
    id,
    title,
    description,
    duration = "30 min",
    difficulty = "Beginner",
    tags = [],
    imageUrl,
    source,
}: RitualCardProps) {
    return (
        <Link href={`/ritual-machine/${id}`} className="group block h-full">
            <div className="relative h-full overflow-hidden rounded-xl bg-zinc-900/40 border border-white/10 backdrop-blur-md transition-all duration-300 group-hover:border-amber-500/50 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                {/* Image/Decoration */}
                <div className="relative h-48 w-full overflow-hidden bg-zinc-950">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                            <div className="text-6xl opacity-20">🔮</div>
                        </div>
                    )}

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />

                    {/* Difficulty Badge */}
                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-mono uppercase tracking-wider text-amber-500 border border-amber-500/20">
                        {difficulty}
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col h-[calc(100%-12rem)]">
                    <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500 font-mono">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {duration}
                        </span>
                        {source && (
                            <span className="flex items-center gap-1 opacity-70 border-l border-zinc-700 pl-2">
                                <Book className="w-3 h-3" /> {source}
                            </span>
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-zinc-100 font-serif mb-2 group-hover:text-amber-400 transition-colors line-clamp-2">
                        {title}
                    </h3>

                    <p className="text-sm text-zinc-400 line-clamp-3 mb-4 flex-grow">
                        {description}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                        <div className="flex gap-2">
                            {tags.slice(0, 2).map((tag) => (
                                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-500 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                            Initialize <ArrowRight className="w-3 h-3" />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
