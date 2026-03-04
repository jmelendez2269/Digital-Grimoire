"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, BookOpen, Library, Book, GitGraph, GraduationCap, Box, Zap, Hammer, Eye } from "lucide-react";

interface FeatureOnboardingModalProps {
    onClose?: () => void;
}

const FEATURES = [
    {
        icon: Library,
        label: "Library",
        href: "/wiki/library-features",
        description: "Manage your digital book collection",
    },
    {
        icon: Book,
        label: "Journal",
        href: "/wiki/journal",
        description: "Record your thoughts and experiences",
    },
    {
        icon: GitGraph,
        label: "Graph",
        href: "/wiki/graph",
        description: "Visualize connections in your knowledge",
    },
    {
        icon: GraduationCap,
        label: "Courses",
        href: "/wiki/courses",
        description: "Structured learning paths",
    },
    {
        icon: Zap,
        label: "Parallax Engine",
        href: "/wiki/parallax-engine",
        description: "Multi-lens analysis system",
    },
    {
        icon: Box,
        label: "Ritual Machine",
        href: "/wiki/ritual-machine",
        description: "Design and perform rituals",
    },
    {
        icon: Hammer,
        label: "Workbench",
        href: "/wiki/workbench",
        description: "Practitioner's tools and tracking",
    },
    {
        icon: Eye,
        label: "Tarot",
        href: "/wiki/tarot",
        description: "Digital tarot readings and logging",
    },
];

export default function FeatureOnboardingModal({ onClose }: FeatureOnboardingModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const hasSeenOnboarding = localStorage.getItem("hasSeenFeatureOnboarding");
        if (!hasSeenOnboarding) {
            // Small delay to ensure ready
            const timer = setTimeout(() => setIsOpen(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        if (dontShowAgain) {
            localStorage.setItem("hasSeenFeatureOnboarding", "true");
        }
        if (onClose) onClose();
    };

    const handleDontShowAgainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDontShowAgain(e.target.checked);
    };

    if (!mounted || !isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div
                className="bg-zinc-900/95 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                role="dialog"
                aria-labelledby="onboarding-title"
            >
                {/* Decorative Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                {/* Header */}
                <div className="relative p-8 border-b border-white/5 flex items-start justify-between bg-black/20">
                    <div>
                        <h2 id="onboarding-title" className="text-3xl font-serif text-amber-100 mb-2 flex items-center gap-3">
                            <BookOpen className="text-amber-500" />
                            Welcome to Project Parallax
                        </h2>
                        <p className="text-zinc-400 max-w-xl">
                            Transform information into insight. Build your living knowledge base.
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white"
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Feature Grid */}
                <div className="relative flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {FEATURES.map((feature) => (
                            <Link
                                key={feature.href}
                                href={feature.href}
                                onClick={handleClose}
                                className="group flex flex-col p-4 rounded-xl bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="p-3 bg-black/40 rounded-lg w-max mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <feature.icon className="w-6 h-6 text-amber-500" />
                                </div>
                                <h3 className="text-lg font-medium text-amber-100 mb-1 group-hover:text-amber-400 transition-colors">
                                    {feature.label}
                                </h3>
                                <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                    {feature.description}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative p-6 border-t border-white/5 bg-black/20 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={handleDontShowAgainChange}
                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
                        />
                        Don't show this again
                    </label>

                    <button
                        onClick={handleClose}
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-amber-900/20"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
