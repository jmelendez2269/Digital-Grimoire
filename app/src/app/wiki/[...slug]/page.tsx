import { getUserDoc } from "@/lib/wiki";
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
    const doc = await getUserDoc(resolvedParams.slug);

    if (!doc) {
        return {
            title: 'Not Found | Wiki',
        };
    }

    return {
        title: `${doc.title} | Wiki`,
        description: `Documentation for ${doc.title}`,
    };
}

export default async function WikiPage({ params }: WikiPageProps) {
    const resolvedParams = await params;
    const doc = await getUserDoc(resolvedParams.slug);

    if (!doc) {
        notFound();
    }

    return (
        <div>
            <div className="mb-8 border-b border-zinc-800 pb-8">
                <h1 className="text-4xl font-bold text-zinc-100">{doc.title}</h1>
                <p className="mt-2 text-sm text-zinc-500">
                    Last updated: {new Date(doc.lastModified).toLocaleDateString()}
                </p>
            </div>
            <MarkdownViewer content={doc.content} />
        </div>
    );
}
