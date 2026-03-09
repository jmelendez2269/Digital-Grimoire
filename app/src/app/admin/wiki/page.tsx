import { getAllTechnicalDocs } from "@/lib/wiki";
import Link from "next/link";
import { BookOpen, FileText } from "lucide-react";

export const metadata = {
    title: "Technical Wiki Index | Admin",
    description: "Index of all technical documentation",
};

export default async function AdminWikiRoot() {
    const docs = await getAllTechnicalDocs();

    // Sort docs by title alphabetically
    docs.sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="w-full max-w-4xl">
            <div className="mb-8 border-b border-zinc-800 pb-8">
                <div className="flex items-center gap-3 mb-3">
                    <BookOpen className="w-5 h-5 text-teal-400" />
                    <span className="text-xs font-mono text-teal-400 uppercase tracking-widest">Technical Wiki</span>
                </div>
                <h1 className="text-4xl font-bold text-zinc-100">Documentation Index</h1>
                <p className="mt-2 text-sm text-zinc-500">
                    Overview of all available technical reference materials.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {docs.map((doc) => (
                    <Link
                        key={doc.slug}
                        href={`/admin/wiki/${doc.slug}`}
                        className="flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all"
                    >
                        <FileText className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                            <h2 className="text-lg font-bold text-zinc-200">{doc.title}</h2>
                            <p className="text-xs text-zinc-500 font-mono mt-1">/{doc.slug}</p>
                            <p className="text-xs text-zinc-600 mt-2">
                                Updated: {new Date(doc.lastModified).toLocaleDateString()}
                            </p>
                        </div>
                    </Link>
                ))}

                {docs.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-500">
                        No technical documentation found.
                    </div>
                )}
            </div>
        </div>
    );
}
