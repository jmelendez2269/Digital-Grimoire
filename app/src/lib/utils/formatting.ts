/**
 * Formatting utility functions
 * Centralized to avoid duplication across components
 */

/**
 * Format file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date string to localized format
 */
export function formatDate(dateString: string, options?: {
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  year?: 'numeric' | '2-digit';
}): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: options?.month || 'short',
    day: options?.day || 'numeric',
    ...options,
  });
}

/**
 * Format time in seconds to human-readable format
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/**
 * Get status color classes for badges
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'processing':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'ready':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'error':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}

/**
 * Format lens name for display
 */
export function formatLensName(lens: string): string {
  return lens
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' / ');
}

/**
 * Lens descriptions mapping
 */
export const LENS_DESCRIPTIONS: Record<string, string> = {
  'scientific': 'Physics, biology, cosmology, empirical evidence',
  'psychological': 'Jungian archetypes, cognitive science, shadow work',
  'philosophical': 'Metaphysics, ethics, epistemology, ontology',
  'religious_spiritual': 'Comparative theology, mysticism, sacred texts',
  'historical_anthropological': 'Cultural evolution, mythology, ritual context',
  'symbolic_occult': 'Correspondences, alchemy, astrology, esoteric systems',
  'mathematical': 'Sacred geometry, numerology, patterns, universal ratios'
};

