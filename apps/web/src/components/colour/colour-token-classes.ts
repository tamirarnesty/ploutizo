import { parseColourToken } from '@ploutizo/validators';
import type { ColourToken } from '@ploutizo/validators';

/**
 * Category preset palette (D-18). Each value must be a complete Tailwind class literal
 * so utilities are detected at build time — never build class names from token strings.
 */
export const COLOUR_SWATCH_BG: Record<ColourToken, string> = {
  'slate-500': 'bg-slate-500',
  'red-500': 'bg-red-500',
  'orange-500': 'bg-orange-500',
  'amber-500': 'bg-amber-500',
  'yellow-500': 'bg-yellow-500',
  'lime-500': 'bg-lime-500',
  'green-500': 'bg-green-500',
  'teal-500': 'bg-teal-500',
  'cyan-500': 'bg-cyan-500',
  'blue-500': 'bg-blue-500',
  'violet-500': 'bg-violet-500',
  'pink-500': 'bg-pink-500',
};

export const COLOUR_BADGE_CLASS: Record<ColourToken, string> = {
  'slate-500': 'border-slate-500/25 bg-slate-500/12 text-slate-500',
  'red-500': 'border-red-500/25 bg-red-500/12 text-red-500',
  'orange-500': 'border-orange-500/25 bg-orange-500/12 text-orange-500',
  'amber-500': 'border-amber-500/25 bg-amber-500/12 text-amber-500',
  'yellow-500': 'border-yellow-500/25 bg-yellow-500/12 text-yellow-500',
  'lime-500': 'border-lime-500/25 bg-lime-500/12 text-lime-500',
  'green-500': 'border-green-500/25 bg-green-500/12 text-green-500',
  'teal-500': 'border-teal-500/25 bg-teal-500/12 text-teal-500',
  'cyan-500': 'border-cyan-500/25 bg-cyan-500/12 text-cyan-500',
  'blue-500': 'border-blue-500/25 bg-blue-500/12 text-blue-500',
  'violet-500': 'border-violet-500/25 bg-violet-500/12 text-violet-500',
  'pink-500': 'border-pink-500/25 bg-pink-500/12 text-pink-500',
};

export const getColourBadgeClassFromRaw = (
  raw: string | null | undefined
): string | undefined => {
  const token = parseColourToken(raw);
  return token ? COLOUR_BADGE_CLASS[token] : undefined;
};

export const getColourSwatchBgClass = (token: ColourToken): string =>
  COLOUR_SWATCH_BG[token];
