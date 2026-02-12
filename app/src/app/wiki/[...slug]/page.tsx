import { getUserDoc, getTechnicalDoc, WikiDoc } from "@/lib/wiki";
import MarkdownViewer from "@/components/Wiki/MarkdownViewer";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface WikiPageProps {
    params: Promise<{
        slug: string[];
    }>;
}

async function getDoc(slug: string[]): Promise<WikiDoc | null> {
    if (slug.length === 0) return null;

    const [section, ...rest] = slug;

    if (section === 'technical') {
        return getTechnicalDoc(rest);
    }

    if (section === 'user') {
        return getUserDoc(rest);
    }

    // Fallback for legacy URLs or direct short links (defaults to user)
    return getUserDoc(slug);
}

export async function generateMetadata({ params }: WikiPageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const doc = await getDoc(resolvedParams.slug);

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
    const doc = await getDoc(resolvedParams.slug);

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
