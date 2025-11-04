'use client';

import { LensWeights } from '@/lib/convergence/lens-orchestrator';
import { Sparkles, GraduationCap, Wand2, Search } from 'lucide-react';

interface Preset {
  name: string;
  icon: React.ReactNode;
  description: string;
  weights: LensWeights;
}

const presets: Preset[] = [
  {
    name: 'Equal',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'All perspectives balanced',
    weights: {
      scientific: 14,
      psychological: 14,
      philosophical: 14,
      religious_spiritual: 14,
      historical_anthropological: 14,
      symbolic_occult: 14,
      mathematical: 16, // Slightly more to round to 100
    },
  },
  {
    name: 'Scholar',
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Academic rigor',
    weights: {
      scientific: 25,
      psychological: 20,
      philosophical: 25,
      religious_spiritual: 10,
      historical_anthropological: 15,
      symbolic_occult: 3,
      mathematical: 2,
    },
  },
  {
    name: 'Practitioner',
    icon: <Wand2 className="w-4 h-4" />,
    description: 'Esoteric focus',
    weights: {
      scientific: 5,
      psychological: 20,
      philosophical: 15,
      religious_spiritual: 25,
      historical_anthropological: 10,
      symbolic_occult: 20,
      mathematical: 5,
    },
  },
  {
    name: 'Seeker',
    icon: <Search className="w-4 h-4" />,
    description: 'Holistic exploration',
    weights: {
      scientific: 10,
      psychological: 20,
      philosophical: 20,
      religious_spiritual: 20,
      historical_anthropological: 15,
      symbolic_occult: 10,
      mathematical: 5,
    },
  },
];

interface LensPresetsProps {
  onSelect: (weights: LensWeights) => void;
  disabled?: boolean;
}

export default function LensPresets({ onSelect, disabled = false }: LensPresetsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {presets.map((preset) => (
        <button
          key={preset.name}
          onClick={() => onSelect(preset.weights)}
          disabled={disabled}
          className="p-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg hover:border-purple-600/50 hover:bg-zinc-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-400">{preset.icon}</span>
            <span className="text-sm font-semibold text-amber-100">{preset.name}</span>
          </div>
          <p className="text-xs text-amber-100/60">{preset.description}</p>
        </button>
      ))}
    </div>
  );
}

