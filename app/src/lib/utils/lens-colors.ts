export type LensColorToken =
  | 'scientific'
  | 'psychological'
  | 'philosophical'
  | 'religious_spiritual'
  | 'historical_anthropological'
  | 'symbolic_occult'
  | 'mathematical';

export interface LensColorClasses {
  dot: string;
  text: string;
  mutedText: string;
  border: string;
  borderStrong: string;
  bg: string;
  bgStrong: string;
  hoverBorder: string;
  hoverBg: string;
  ring: string;
  accent: string;
}

export interface LensColorStyle {
  hex: string;
  soft: string;
  border: string;
  glow: string;
}

const LENS_COLOR_CLASSES: Record<LensColorToken, LensColorClasses> = {
  scientific: {
    dot: 'bg-sky-400',
    text: 'text-sky-300',
    mutedText: 'text-sky-200/75',
    border: 'border-sky-500/25',
    borderStrong: 'border-sky-400/55',
    bg: 'bg-sky-500/10',
    bgStrong: 'bg-sky-500/20',
    hoverBorder: 'hover:border-sky-400/55',
    hoverBg: 'hover:bg-sky-500/15',
    ring: 'focus:ring-sky-500',
    accent: 'accent-sky-500',
  },
  psychological: {
    dot: 'bg-violet-400',
    text: 'text-violet-300',
    mutedText: 'text-violet-200/75',
    border: 'border-violet-500/25',
    borderStrong: 'border-violet-400/55',
    bg: 'bg-violet-500/10',
    bgStrong: 'bg-violet-500/20',
    hoverBorder: 'hover:border-violet-400/55',
    hoverBg: 'hover:bg-violet-500/15',
    ring: 'focus:ring-violet-500',
    accent: 'accent-violet-500',
  },
  philosophical: {
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    mutedText: 'text-amber-200/75',
    border: 'border-amber-500/25',
    borderStrong: 'border-amber-400/55',
    bg: 'bg-amber-500/10',
    bgStrong: 'bg-amber-500/20',
    hoverBorder: 'hover:border-amber-400/55',
    hoverBg: 'hover:bg-amber-500/15',
    ring: 'focus:ring-amber-500',
    accent: 'accent-amber-500',
  },
  religious_spiritual: {
    dot: 'bg-rose-400',
    text: 'text-rose-300',
    mutedText: 'text-rose-200/75',
    border: 'border-rose-500/25',
    borderStrong: 'border-rose-400/55',
    bg: 'bg-rose-500/10',
    bgStrong: 'bg-rose-500/20',
    hoverBorder: 'hover:border-rose-400/55',
    hoverBg: 'hover:bg-rose-500/15',
    ring: 'focus:ring-rose-500',
    accent: 'accent-rose-500',
  },
  historical_anthropological: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    mutedText: 'text-emerald-200/75',
    border: 'border-emerald-500/25',
    borderStrong: 'border-emerald-400/55',
    bg: 'bg-emerald-500/10',
    bgStrong: 'bg-emerald-500/20',
    hoverBorder: 'hover:border-emerald-400/55',
    hoverBg: 'hover:bg-emerald-500/15',
    ring: 'focus:ring-emerald-500',
    accent: 'accent-emerald-500',
  },
  symbolic_occult: {
    dot: 'bg-fuchsia-400',
    text: 'text-fuchsia-300',
    mutedText: 'text-fuchsia-200/75',
    border: 'border-fuchsia-500/25',
    borderStrong: 'border-fuchsia-400/55',
    bg: 'bg-fuchsia-500/10',
    bgStrong: 'bg-fuchsia-500/20',
    hoverBorder: 'hover:border-fuchsia-400/55',
    hoverBg: 'hover:bg-fuchsia-500/15',
    ring: 'focus:ring-fuchsia-500',
    accent: 'accent-fuchsia-500',
  },
  mathematical: {
    dot: 'bg-blue-400',
    text: 'text-blue-300',
    mutedText: 'text-blue-200/75',
    border: 'border-blue-500/25',
    borderStrong: 'border-blue-400/55',
    bg: 'bg-blue-500/10',
    bgStrong: 'bg-blue-500/20',
    hoverBorder: 'hover:border-blue-400/55',
    hoverBg: 'hover:bg-blue-500/15',
    ring: 'focus:ring-blue-500',
    accent: 'accent-blue-500',
  },
};

const LENS_COLOR_STYLES: Record<LensColorToken, LensColorStyle> = {
  scientific: {
    hex: '#38bdf8',
    soft: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.34)',
    glow: 'rgba(56, 189, 248, 0.2)',
  },
  psychological: {
    hex: '#a78bfa',
    soft: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.34)',
    glow: 'rgba(167, 139, 250, 0.2)',
  },
  philosophical: {
    hex: '#fbbf24',
    soft: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.34)',
    glow: 'rgba(251, 191, 36, 0.2)',
  },
  religious_spiritual: {
    hex: '#fb7185',
    soft: 'rgba(251, 113, 133, 0.12)',
    border: 'rgba(251, 113, 133, 0.34)',
    glow: 'rgba(251, 113, 133, 0.2)',
  },
  historical_anthropological: {
    hex: '#34d399',
    soft: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.34)',
    glow: 'rgba(52, 211, 153, 0.2)',
  },
  symbolic_occult: {
    hex: '#e879f9',
    soft: 'rgba(232, 121, 249, 0.12)',
    border: 'rgba(232, 121, 249, 0.34)',
    glow: 'rgba(232, 121, 249, 0.2)',
  },
  mathematical: {
    hex: '#60a5fa',
    soft: 'rgba(96, 165, 250, 0.12)',
    border: 'rgba(96, 165, 250, 0.34)',
    glow: 'rgba(96, 165, 250, 0.2)',
  },
};

export function normalizeLensId(lens: string): LensColorToken | null {
  const normalized = lens.toLowerCase().replace(/[/-]/g, '_').replace(/\s+/g, '_');
  if (normalized in LENS_COLOR_CLASSES) {
    return normalized as LensColorToken;
  }
  return null;
}

export function getLensColorClasses(lens: string): LensColorClasses {
  const lensId = normalizeLensId(lens);
  return lensId ? LENS_COLOR_CLASSES[lensId] : LENS_COLOR_CLASSES.philosophical;
}

export function getLensColorStyle(lens: string): LensColorStyle {
  const lensId = normalizeLensId(lens);
  return lensId ? LENS_COLOR_STYLES[lensId] : LENS_COLOR_STYLES.philosophical;
}
