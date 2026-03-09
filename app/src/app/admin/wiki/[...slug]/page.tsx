import { getTechnicalDoc } from "@/lib/wiki";
import MarkdownViewer from "@/components/Wiki/MarkdownViewer";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, BookOpen, Lock } from "lucide-react";

interface AdminWikiPageProps {
    params: Promise<{
        slug: string[];
    }>;
}

export async function generateMetadata({ params }: AdminWikiPageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const doc = await getTechnicalDoc(resolvedParams.slug);

    if (!doc) {
        return { title: 'Not Found | Technical Wiki' };
    }

    return {
        title: `${doc.title} | Technical Wiki`,
        description: `Technical documentation for ${doc.title}`,
    };
}

export default async function AdminWikiPage({ params }: AdminWikiPageProps) {
    const resolvedParams = await params;
    const doc = await getTechnicalDoc(resolvedParams.slug);

    if (!doc) {
        notFound();
    }

    return (
        <div className="w-full max-w-4xl pt-12 pb-24">
            {/* Admin badge + back nav */}
            <div className="flex items-center justify-between mb-8">
                <Link
                    href="/admin/wiki"
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-amber-400 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Technical Wiki Index
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/20 border border-amber-500/20 rounded-full">
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-500 font-mono text-xs">ADMIN — TECHNICAL</span>
                </div>
            </div>

            {/* Doc header */}
            <div className="mb-8 border-b border-zinc-800 pb-8">
                <div className="flex items-center gap-3 mb-3">
                    <BookOpen className="w-5 h-5 text-teal-400" />
                    <span className="text-xs font-mono text-teal-400 uppercase tracking-widest">Technical Reference</span>
                </div>
                <h1 className="text-4xl font-bold text-zinc-100">{doc.title}</h1>
                <p className="mt-2 text-sm text-zinc-500">
                    Last updated: {new Date(doc.lastModified).toLocaleDateString()}
                </p>
            </div>

            <MarkdownViewer content={doc.content} />
        </div>
    );
}
