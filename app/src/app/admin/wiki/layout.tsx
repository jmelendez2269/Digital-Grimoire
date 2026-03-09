import { getAllTechnicalDocs } from "@/lib/wiki";
import Link from "next/link";
import { BookOpen, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
    const docs = await getAllTechnicalDocs();

    // Sort docs by title alphabetically
    docs.sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="flex min-h-screen flex-col bg-black">
            <Header />

            <div className="flex flex-1 w-full max-w-7xl mx-auto items-stretch px-4 sm:px-6">
                {/* Sidebar Navigation */}
                <aside className="w-64 shrink-0 border-r border-zinc-800 py-12 pr-6 hidden md:block">
                    <div className="flex items-center gap-3 mb-6">
                        <BookOpen className="w-5 h-5 text-teal-400" />
                        <span className="font-mono text-teal-400 font-bold uppercase tracking-widest text-sm">Tech Wiki</span>
                    </div>
                    <nav className="space-y-1">
                        <Link
                            href="/admin/wiki"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/50 rounded-lg transition-colors"
                        >
                            <FileText className="w-4 h-4 opacity-50" />
                            Wiki Index
                        </Link>

                        <div className="h-px bg-zinc-800 my-4" />
                        <div className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3 px-3">Documents</div>

                        {docs.map(doc => (
                            <Link
                                key={doc.slug}
                                href={`/admin/wiki/${doc.slug}`}
                                className="block px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-lg transition-colors truncate"
                                title={doc.title}
                            >
                                {doc.title}
                            </Link>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 md:pl-10">
                    {children}
                </main>
            </div>

            <Footer />
        </div>
    );
}
