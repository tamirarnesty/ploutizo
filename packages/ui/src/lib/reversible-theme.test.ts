import { describe, expect, it } from 'vitest';
import {
  nextThemePreference,
  oppositeColorScheme,
  themeToggleLabel,
} from './reversible-theme';

describe('nextThemePreference', () => {
  it('persists an override when the destination differs from the OS', () => {
    expect(nextThemePreference('light', 'light')).toBe('dark');
    expect(nextThemePreference('dark', 'dark')).toBe('light');
  });

  it('removes the override when the destination matches the OS', () => {
    expect(nextThemePreference('light', 'dark')).toBe('system');
    expect(nextThemePreference('dark', 'light')).toBe('system');
  });
});

describe('themeToggleLabel', () => {
  it('names the destination appearance, not the current or stored state', () => {
    expect(themeToggleLabel('light')).toBe('Switch to dark mode');
    expect(themeToggleLabel('dark')).toBe('Switch to light mode');
  });
});

describe('oppositeColorScheme', () => {
  it('returns the other appearance', () => {
    expect(oppositeColorScheme('light')).toBe('dark');
    expect(oppositeColorScheme('dark')).toBe('light');
  });
});
