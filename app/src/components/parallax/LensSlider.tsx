'use client';

import { Sliders } from 'lucide-react';
import { getLensColorClasses, getLensColorStyle } from '@/lib/utils/lens-colors';

interface LensSliderProps {
  lensId: string;
  lensName: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function LensSlider({
  lensId,
  lensName,
  value,
  onChange,
  disabled = false,
}: LensSliderProps) {
  const lensColor = getLensColorClasses(lensId);
  const lensStyle = getLensColorStyle(lensId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={lensId} className="flex items-center gap-2 text-sm font-medium text-amber-100/80">
          <span className={`h-2.5 w-2.5 rounded-full ${lensColor.dot}`} />
          <span>{lensName}</span>
        </label>
        <span className={`text-sm font-bold ${lensColor.text} tabular-nums`}>
          {Math.round(value)}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          id={lensId}
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className={`flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${lensColor.accent} disabled:opacity-50 disabled:cursor-not-allowed`}
          style={{
            background: `linear-gradient(to right, ${lensStyle.hex} 0%, ${lensStyle.hex} ${value}%, rgb(39 39 42) ${value}%, rgb(39 39 42) 100%)`,
          }}
        />
        <button
          type="button"
          onClick={() => onChange(value > 0 ? 0 : 50)}
          disabled={disabled}
          className={`p-1.5 ${value > 0 ? lensColor.text : 'text-zinc-400'} ${lensColor.hoverBg} transition-colors disabled:opacity-50`}
          title={value > 0 ? 'Disable lens' : 'Enable lens (50%)'}
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

