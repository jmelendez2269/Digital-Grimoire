'use client';

interface ResponseLengthSliderProps {
  value: 'short' | 'medium' | 'long';
  onChange: (value: 'short' | 'medium' | 'long') => void;
  disabled?: boolean;
}

export default function ResponseLengthSlider({ value, onChange, disabled }: ResponseLengthSliderProps) {
  const options = [
    { value: 'short', label: 'Short', desc: 'Concise answers (~200 tokens)' },
    { value: 'medium', label: 'Medium', desc: 'Balanced (~400 tokens)' },
    { value: 'long', label: 'Long', desc: 'Comprehensive (~1000 tokens)' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-amber-100/80">
          Response Length
        </label>
        <span className="text-xs text-cyan-400">
          {options.find(o => o.value === value)?.label}
        </span>
      </div>

      <div className="flex gap-2">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => !disabled && onChange(option.value as 'short' | 'medium' | 'long')}
            disabled={disabled}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${value === option.value
                ? 'bg-cyan-600 text-white border-2 border-cyan-400'
                : 'bg-zinc-800/50 text-amber-100/60 border-2 border-zinc-700 hover:border-zinc-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={option.desc}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-amber-100/50">
        {options.find(o => o.value === value)?.desc}
      </p>
    </div>
  );
}

