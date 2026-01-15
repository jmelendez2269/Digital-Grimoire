'use client';

import React from 'react';
import { Tag } from 'lucide-react';

interface RelatedTermsProps {
    terms: string[];
    onTermClick: (term: string) => void;
}

export default function RelatedTerms({ terms, onTermClick }: RelatedTermsProps) {
    if (!terms || terms.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-amber-100/60 text-sm font-medium">
                <Tag className="w-4 h-4" />
                <span>Related Concepts</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {terms.map((term, index) => (
                    <button
                        key={index}
                        onClick={() => onTermClick(term)}
                        className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-amber-900/20 hover:border-amber-600/50 rounded-full text-amber-100/80 hover:text-amber-100 text-sm transition-all duration-200"
                    >
                        {term}
                    </button>
                ))}
            </div>
        </div>
    );
}
