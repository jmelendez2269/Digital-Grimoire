import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function WikiLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-black">
            <Header />
            <main className="flex-1 px-6 py-12">
                <div className="mx-auto max-w-4xl">
                    {children}
                </div>
            </main>
            <Footer />
        </div>
    );
}
