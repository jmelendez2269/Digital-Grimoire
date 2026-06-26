"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function RitualMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-amber-300 mb-4 mt-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xs font-mono text-amber-500/60 uppercase tracking-widest mt-7 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-zinc-200 mt-5 mb-2">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-zinc-300 leading-7 mb-4">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside ml-4 text-zinc-300 mb-4 space-y-1.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside ml-4 text-zinc-300 mb-4 space-y-1.5">{children}</ol>
        ),
        li: ({ children }) => <li className="text-zinc-300 leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-zinc-100">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-zinc-400">{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-amber-500/30 pl-4 my-4 text-zinc-400 italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-zinc-800 my-6" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
