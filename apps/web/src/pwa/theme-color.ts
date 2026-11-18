import { PWA_BACKGROUND_COLOR } from './pwa-brand';

/** Light `--background`. The manifest uses this same neutral for first paint. */
export const themeColorLight = PWA_BACKGROUND_COLOR;

/** Dark `--background`. */
export const themeColorDark = '#0c0a09';

/**
 * Route head keeps one meta per `name`, so this pair is rendered as elements.
 * Both must stay, or the installed status bar follows only one scheme.
 */
export const themeColorMetas = [
  {
    name: 'theme-color',
    content: themeColorLight,
    media: '(prefers-color-scheme: light)',
  },
  {
    name: 'theme-color',
    content: themeColorDark,
    media: '(prefers-color-scheme: dark)',
  },
] as const;
