import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownViewerProps {
    content: string;
    className?: string;
}

export default function MarkdownViewer({ content, className }: MarkdownViewerProps) {
    return (
        <div className={cn("prose prose-invert prose-cyan max-w-none", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ node, href, children, ...props }) => {
                        const isInternal = href && (href.startsWith('/') || href.startsWith('#'));

                        if (isInternal) {
                            return (
                                <Link href={href as string} className="text-cyan-400 no-underline hover:text-cyan-300 transition-colors" {...props}>
                                    {children}
                                </Link>
                            );
                        }

                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 no-underline hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                                {...props}
                            >
                                {children}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        );
                    },
                    h1: ({ node, children, ...props }) => (
                        <h1 className="text-3xl font-bold text-zinc-100 mb-6 pb-2 border-b border-zinc-800" {...props}>
                            {children}
                        </h1>
                    ),
                    h2: ({ node, children, ...props }) => (
                        <h2 className="text-2xl font-semibold text-cyan-100 mt-10 mb-4" {...props}>
                            {children}
                        </h2>
                    ),
                    h3: ({ node, children, ...props }) => (
                        <h3 className="text-xl font-medium text-zinc-200 mt-8 mb-3" {...props}>
                            {children}
                        </h3>
                    ),
                    p: ({ node, children, ...props }) => (
                        <p className="text-zinc-300 leading-7 mb-4" {...props}>
                            {children}
                        </p>
                    ),
                    ul: ({ node, children, ...props }) => (
                        <ul className="list-disc list-inside text-zinc-300 mb-4 space-y-1" {...props}>
                            {children}
                        </ul>
                    ),
                    ol: ({ node, children, ...props }) => (
                        <ol className="list-decimal list-inside text-zinc-300 mb-4 space-y-1" {...props}>
                            {children}
                        </ol>
                    ),
                    li: ({ node, children, ...props }) => (
                        <li className="text-zinc-300" {...props}>
                            {children}
                        </li>
                    ),
                    code: ({ node, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !className?.includes('language-');

                        return isInline ? (
                            <code className="bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={cn("bg-zinc-900 block p-4 rounded-lg overflow-x-auto text-sm text-zinc-300 font-mono my-4 border border-zinc-800", className)} {...props}>
                                {children}
                            </code>
                        );
                    },
                    blockquote: ({ node, children, ...props }) => (
                        <blockquote className="border-l-4 border-cyan-500/50 pl-4 py-1 my-6 italic text-zinc-400 bg-zinc-900/30 rounded-r-lg" {...props}>
                            {children}
                        </blockquote>
                    ),
                    table: ({ node, children, ...props }) => (
                        <div className="overflow-x-auto my-6 rounded-lg border border-zinc-800">
                            <table className="w-full text-left bg-zinc-900/50" {...props}>
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ node, children, ...props }) => (
                        <th className="px-4 py-3 bg-zinc-900 font-semibold text-zinc-200 border-b border-zinc-800" {...props}>
                            {children}
                        </th>
                    ),
                    td: ({ node, children, ...props }) => (
                        <td className="px-4 py-3 border-b border-zinc-800/50 last:border-0 text-zinc-300" {...props}>
                            {children}
                        </td>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
