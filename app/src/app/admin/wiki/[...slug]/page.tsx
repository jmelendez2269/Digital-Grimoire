import { getTechnicalDoc } from "@/lib/wiki";
import MarkdownViewer from "@/components/Wiki/MarkdownViewer";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface WikiPageProps {
    params: Promise<{
        slug: string[];
    }>;
}

export async function generateMetadata({ params }: WikiPageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const doc = await getTechnicalDoc(resolvedParams.slug);

    if (!doc) {
        return {
            title: 'Not Found | Admin Wiki',
        };
    }

    return {
        title: `${doc.title} | Admin Wiki`,
        description: `Technical Documentation for ${doc.title}`,
    };
}

export default async function AdminWikiPage({ params }: WikiPageProps) {
    const resolvedParams = await params;
    const doc = await getTechnicalDoc(resolvedParams.slug);

    if (!doc) {
        notFound();
    }

    return (
        <div>
            <div className="mb-8 border-b border-zinc-800 pb-8">
                <div className="flex items-center gap-4 mb-4">
                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        TECHNICAL DOCUMENTATION
                    </span>
                </div>
                <h1 className="text-4xl font-bold text-zinc-100">{doc.title}</h1>
                <p className="mt-2 text-sm text-zinc-500">
                    Last updated: {new Date(doc.lastModified).toLocaleDateString()}
                </p>
            </div>
            <MarkdownViewer content={doc.content} className="prose-headings:text-amber-100 prose-a:text-amber-400 prose-a:hover:text-amber-300" />
        </div>
    );
}
