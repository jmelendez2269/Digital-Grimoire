'use client';

interface ResponseLengthSliderProps {
  value: 'short' | 'medium' | 'long';
  onChange: (value: 'short' | 'medium' | 'long') => void;
  disabled?: boolean;
}

const RESPONSE_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short', desc: 'Concise answers (~200 tokens)', credits: 2 },
  { value: 'medium', label: 'Medium', desc: 'Balanced (~400 tokens)', credits: 2 },
  { value: 'long', label: 'Long', desc: 'Comprehensive (~1000 tokens)', credits: 3 },
] as const;

export default function ResponseLengthSlider({ value, onChange, disabled }: ResponseLengthSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-amber-100/80">
          Response Length
        </label>
        <span className="text-xs text-cyan-400">
          {RESPONSE_LENGTH_OPTIONS.find(o => o.value === value)?.label}
        </span>
      </div>

      <div className="flex gap-2">
        {RESPONSE_LENGTH_OPTIONS.map(option => (
          <button
            type="button"
            key={option.value}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            aria-pressed={value === option.value}
            className={`min-h-11 flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${value === option.value
                ? 'bg-cyan-600 text-white border-2 border-cyan-400'
                : 'bg-zinc-800/50 text-amber-100/60 border-2 border-zinc-700 hover:border-zinc-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={option.desc}
          >
            <span className="block">{option.label}</span>
            <span className="mt-0.5 block text-[11px] opacity-80">
              {option.credits} credits
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs text-amber-100/50">
        {RESPONSE_LENGTH_OPTIONS.find(o => o.value === value)?.desc}. Charged only after the analysis is saved.
      </p>
    </div>
  );
}

