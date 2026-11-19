/**
 * Light `--sidebar` (stone-50). The installed status bar sits on the top bar,
 * which is `bg-sidebar`. The manifest keeps a separate neutral for first paint.
 */
export const themeColorLight = '#fafaf9';

/** Dark `--sidebar` (stone-900). */
export const themeColorDark = '#1c1917';

export const themeColorForScheme = (scheme: 'light' | 'dark' | undefined) => {
  if (scheme === 'dark') return themeColorDark;
  if (scheme === 'light') return themeColorLight;
  return null;
};

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
