import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  type ColorScheme,
  nextThemePreference,
  themeToggleLabel,
} from '../lib/reversible-theme';

const SYSTEM_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

const toColorScheme = (value: string | undefined): ColorScheme =>
  value === 'dark' ? 'dark' : 'light';

const readSystemAppearance = (): ColorScheme =>
  window.matchMedia(SYSTEM_COLOR_SCHEME_QUERY).matches ? 'dark' : 'light';

export const useReversibleThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedAppearance = toColorScheme(resolvedTheme);
  const label = themeToggleLabel(resolvedAppearance);

  const toggleTheme = useCallback(() => {
    setTheme(nextThemePreference(resolvedAppearance, readSystemAppearance()));
  }, [resolvedAppearance, setTheme]);

  return {
    mounted,
    resolvedAppearance,
    label,
    toggleTheme,
  };
};
