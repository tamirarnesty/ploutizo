export type ColorScheme = 'light' | 'dark';
export type ThemePreference = ColorScheme | 'system';

export const oppositeColorScheme = (appearance: ColorScheme): ColorScheme =>
  appearance === 'dark' ? 'light' : 'dark';

/**
 * Reversible two-state theme toggle.
 *
 * The control always targets the opposite of the currently resolved
 * appearance. If that target matches the OS, drop the explicit override so
 * the app resumes system-following; otherwise persist `light` or `dark`.
 *
 * Evaluate only on user activation — never when the OS preference changes.
 */
export const nextThemePreference = (
  resolvedAppearance: ColorScheme,
  systemAppearance: ColorScheme
): ThemePreference => {
  const target = oppositeColorScheme(resolvedAppearance);
  return target === systemAppearance ? 'system' : target;
};

export const themeToggleLabel = (resolvedAppearance: ColorScheme): string =>
  resolvedAppearance === 'dark'
    ? 'Switch to light mode'
    : 'Switch to dark mode';
