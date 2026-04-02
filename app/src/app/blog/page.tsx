import type { Metadata } from 'next';
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: 'Blog | Project Parallax',
  robots: { index: false, follow: false },
};

export default function BlogPage() {
    return (
        <div className="flex min-h-screen flex-col bg-black text-amber-50">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-amber-500 mb-6 font-cinzel">
                    Grimoire Blog
                </h1>
                <div className="max-w-2xl mx-auto space-y-4">
                    <p className="text-xl md:text-2xl text-zinc-300">
                        This section is currently under construction.
                    </p>
                    <p className="text-zinc-500">
                        The scribes are documenting the arcane knowledge. Check back soon for updates.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
