"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function AdminWikiLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex flex-col bg-black text-amber-100">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
                        <p className="text-zinc-400">You do not have administrative privileges.</p>
                        <Link href="/dashboard" className="mt-6 inline-block px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-black">
            <Header />
            <div className="bg-amber-900/10 border-b border-amber-900/20 py-2">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-amber-500 font-mono">
                    <span>ADMINISTRATIVE ARCHIVE // CLASSIFIED</span>
                    <Link href="/admin" className="hover:text-amber-300">← RETURN TO COMMAND</Link>
                </div>
            </div>
            <main className="flex-1 px-6 py-12">
                <div className="mx-auto max-w-4xl">
                    {children}
                </div>
            </main>
            <Footer />
        </div>
    );
}
