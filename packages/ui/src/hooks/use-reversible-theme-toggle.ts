import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  type ColorScheme,
  nextThemePreference,
  themeToggleLabel,
} from '../lib/reversible-theme';

const toColorScheme = (value: string | undefined): ColorScheme =>
  value === 'dark' ? 'dark' : 'light';

export const useReversibleThemeToggle = () => {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedAppearance = toColorScheme(resolvedTheme);
  const systemAppearance = toColorScheme(systemTheme);
  const label = themeToggleLabel(resolvedAppearance);

  const toggleTheme = useCallback(() => {
    setTheme(nextThemePreference(resolvedAppearance, systemAppearance));
  }, [resolvedAppearance, setTheme, systemAppearance]);

  return {
    mounted,
    resolvedAppearance,
    label,
    toggleTheme,
  };
};
