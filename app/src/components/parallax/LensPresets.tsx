'use client';

import { LensWeights } from '@/lib/parallax/lens-orchestrator';
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
      scientific: 30, // Standard
      psychological: 30, // Standard
      philosophical: 30, // Standard
      religious_spiritual: 30, // Standard
      historical_anthropological: 30, // Standard
      symbolic_occult: 30, // Standard
      mathematical: 30, // Standard
    },
  },
  {
    name: 'Scholar',
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Academic rigor',
    weights: {
      scientific: 60, // Boosted
      psychological: 30, // Standard
      philosophical: 60, // Boosted
      religious_spiritual: 15, // Minimal
      historical_anthropological: 30, // Standard
      symbolic_occult: 0, // Off
      mathematical: 15, // Minimal
    },
  },
  {
    name: 'Practitioner',
    icon: <Wand2 className="w-4 h-4" />,
    description: 'Esoteric focus',
    weights: {
      scientific: 0, // Off
      psychological: 30, // Standard
      philosophical: 30, // Standard
      religious_spiritual: 60, // Boosted
      historical_anthropological: 15, // Minimal
      symbolic_occult: 100, // Dominant
      mathematical: 0, // Off
    },
  },
  {
    name: 'Seeker',
    icon: <Search className="w-4 h-4" />,
    description: 'Holistic exploration',
    weights: {
      scientific: 15, // Minimal
      psychological: 30, // Standard
      philosophical: 30, // Standard
      religious_spiritual: 30, // Standard
      historical_anthropological: 30, // Standard
      symbolic_occult: 15, // Minimal
      mathematical: 15, // Minimal
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
          className="p-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg hover:border-cyan-500/50 hover:bg-zinc-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-cyan-400">{preset.icon}</span>
            <span className="text-sm font-semibold text-amber-100">{preset.name}</span>
          </div>
          <p className="text-xs text-amber-100/60">{preset.description}</p>
        </button>
      ))}
    </div>
  );
}

