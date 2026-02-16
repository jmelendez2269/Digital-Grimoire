"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentationLinkProps {
    href: string;
    label?: string;
    className?: string;
}

export default function DocumentationLink({
    href,
    label = "User Guide",
    className
}: DocumentationLinkProps) {
    return (
        <div className={cn("flex justify-end mb-4", className)}>
            <Link
                href={href}
                className="group relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/40 border border-amber-900/30 hover:border-amber-500/50 transition-all duration-300 backdrop-blur-sm"
            >
                <div className="relative">
                    <BookOpen size={14} className="text-amber-500/80 group-hover:text-amber-400 transition-colors" />
                    {/* Pulse animation */}
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                </div>
                <span className="text-xs font-medium text-amber-500/80 group-hover:text-amber-400 transition-colors">
                    {label}
                </span>
            </Link>
        </div>
    );
}
