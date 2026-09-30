import type { ColourToken } from '@ploutizo/types';
import type { CSSProperties } from 'react';

/**
 * CSS value for a palette token. `globals.css` imports Tailwind with `theme(static)` so every
 * `--color-<hue>-<shade>` variable is emitted, even when no utility class references it.
 */
export const colourTokenVar = (token: ColourToken): string =>
  `var(--color-${token})`;

/** Tinted background and border with solid text, for category badges. */
export const colourTokenBadgeStyle = (token: ColourToken): CSSProperties => {
  const colour = colourTokenVar(token);
  return {
    backgroundColor: `color-mix(in oklab, ${colour} 12%, transparent)`,
    borderColor: `color-mix(in oklab, ${colour} 25%, transparent)`,
    color: colour,
  };
};
