import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TarotLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
            <Header />
            <main className="flex flex-1 flex-col">
                {children}
            </main>
            <Footer />
        </div>
    );
}
