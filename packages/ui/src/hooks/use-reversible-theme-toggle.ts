import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  type ColorScheme,
  type ThemePreference,
  nextThemePreference,
  themeToggleLabel,
} from '../lib/reversible-theme';

const SYSTEM_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

const toColorScheme = (value: string | undefined): ColorScheme =>
  value === 'dark' ? 'dark' : 'light';

export const readResolvedAppearance = (): ColorScheme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

export const readSystemAppearance = (): ColorScheme =>
  window.matchMedia(SYSTEM_COLOR_SCHEME_QUERY).matches ? 'dark' : 'light';

export const currentTogglePreference = (): ThemePreference =>
  nextThemePreference(readResolvedAppearance(), readSystemAppearance());

export const useReversibleThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedAppearance = toColorScheme(resolvedTheme);
  const label = themeToggleLabel(resolvedAppearance);

  const toggleTheme = useCallback(() => {
    setTheme(currentTogglePreference());
  }, [setTheme]);

  return {
    mounted,
    resolvedAppearance,
    label,
    toggleTheme,
  };
};
