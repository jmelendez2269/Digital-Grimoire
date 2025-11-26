'use client';

import { Sliders } from 'lucide-react';

export type IntensityLevel = 'off' | 'minimal' | 'standard' | 'boosted' | 'dominant';

interface IntensityConfig {
  level: IntensityLevel;
  value: number;
  label: string;
  description: string;
}

const INTENSITY_LEVELS: IntensityConfig[] = [
  { level: 'off', value: 0, label: 'Off', description: 'Disabled' },
  { level: 'minimal', value: 15, label: 'Low', description: 'Light emphasis' },
  { level: 'standard', value: 30, label: 'Mid', description: 'Balanced' },
  { level: 'boosted', value: 60, label: 'High', description: 'Strong emphasis' },
  { level: 'dominant', value: 100, label: 'Max', description: 'Primary focus' },
];

interface LensIntensitySelectorProps {
  lensId: string;
  lensName: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Get intensity level from numeric value
 */
function getIntensityLevel(value: number): IntensityLevel {
  if (value === 0) return 'off';
  if (value <= 15) return 'minimal';
  if (value <= 30) return 'standard';
  if (value <= 60) return 'boosted';
  return 'dominant';
}

/**
 * Get closest intensity value for a given level
 */
function getIntensityValue(level: IntensityLevel): number {
  return INTENSITY_LEVELS.find(l => l.level === level)?.value || 0;
}

export default function LensIntensitySelector({
  lensId,
  lensName,
  value,
  onChange,
  disabled = false,
}: LensIntensitySelectorProps) {
  const currentLevel = getIntensityLevel(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={lensId} className="text-sm font-medium text-amber-100/80">
          {lensName}
        </label>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {INTENSITY_LEVELS.map((intensity) => {
            const isActive = intensity.level === currentLevel;
            return (
              <button
                key={intensity.level}
                type="button"
                onClick={() => !disabled && onChange(intensity.value)}
                disabled={disabled}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white border-2 border-purple-400'
                    : 'bg-zinc-800/50 text-amber-100/60 border-2 border-zinc-700 hover:border-zinc-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={`${intensity.label}: ${intensity.description} (${intensity.value}%)`}
              >
                {intensity.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onChange(value > 0 ? 0 : getIntensityValue('standard'))}
          disabled={disabled}
          className="p-1.5 text-zinc-400 hover:text-purple-400 transition-colors disabled:opacity-50"
          title={value > 0 ? 'Disable lens' : 'Enable lens (Standard)'}
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-xs text-amber-100/50">
        {INTENSITY_LEVELS.find(l => l.level === currentLevel)?.description}
      </p>
    </div>
  );
}

/**
 * Helper function to get intensity label from value
 */
export function getIntensityLabel(value: number): string {
  const level = getIntensityLevel(value);
  return INTENSITY_LEVELS.find(l => l.level === level)?.label.toUpperCase() || 'OFF';
}

/**
 * Helper function to get intensity value from level
 */
export function getIntensityValueFromLevel(level: IntensityLevel): number {
  return getIntensityValue(level);
}

