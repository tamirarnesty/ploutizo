import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { currentTogglePreference } from '@ploutizo/ui/hooks/use-reversible-theme-toggle';
import { ThemeProvider } from '@ploutizo/ui/components/theme-provider';
import { ThemeToggle } from '@ploutizo/ui/components/theme-toggle';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import {
  THEME_STORAGE_KEY,
  installPrefersColorScheme,
} from '@/test/prefersColorScheme';
import type { ReactNode } from 'react';

const ThemeHarness = ({ children }: { children: ReactNode }) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
    storageKey={THEME_STORAGE_KEY}
  >
    <TooltipProvider delay={0}>{children}</TooltipProvider>
  </ThemeProvider>
);

const renderThemeToggle = () =>
  render(
    <ThemeHarness>
      <ThemeToggle />
    </ThemeHarness>
  );

const themeToggle = (name: 'Switch to dark mode' | 'Switch to light mode') =>
  screen.findByRole('button', { name });

const documentTheme = () =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

describe('ThemeToggle', () => {
  let colorScheme: ReturnType<typeof installPrefersColorScheme> | undefined;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  afterEach(() => {
    colorScheme?.restore();
    colorScheme = undefined;
    window.localStorage.clear();
  });

  it('follows the operating system when no override is saved', async () => {
    colorScheme = installPrefersColorScheme(false);
    renderThemeToggle();

    expect(await themeToggle('Switch to dark mode')).toBeInTheDocument();
    expect(documentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();

    act(() => {
      colorScheme?.setDark(true);
    });

    expect(await themeToggle('Switch to light mode')).toBeInTheDocument();
    expect(documentTheme()).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('names the destination appearance on the control, tooltip, and icon', async () => {
    colorScheme = installPrefersColorScheme(false);
    const user = userEvent.setup();
    renderThemeToggle();

    const toggle = await themeToggle('Switch to dark mode');
    expect(toggle.querySelector('.lucide-moon')).not.toBeNull();
    expect(toggle.querySelector('.lucide-sun')).toBeNull();

    await user.hover(toggle);
    expect(await screen.findByText('Switch to dark mode')).toBeInTheDocument();
  });

  it('persists an override when the destination differs from the OS', async () => {
    colorScheme = installPrefersColorScheme(false);
    const user = userEvent.setup();
    renderThemeToggle();

    await user.click(await themeToggle('Switch to dark mode'));

    const lightToggle = await themeToggle('Switch to light mode');
    expect(lightToggle.querySelector('.lucide-sun')).not.toBeNull();
    expect(lightToggle.querySelector('.lucide-moon')).toBeNull();
    expect(documentTheme()).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('removes the override when the destination matches the OS', async () => {
    colorScheme = installPrefersColorScheme(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const user = userEvent.setup();
    renderThemeToggle();

    await user.click(await themeToggle('Switch to light mode'));

    expect(await themeToggle('Switch to dark mode')).toBeInTheDocument();
    expect(documentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('keeps an explicit override when the OS later matches it', async () => {
    colorScheme = installPrefersColorScheme(false);
    const user = userEvent.setup();
    renderThemeToggle();

    await user.click(await themeToggle('Switch to dark mode'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => {
      colorScheme?.setDark(true);
    });

    expect(await themeToggle('Switch to light mode')).toBeInTheDocument();
    expect(documentTheme()).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => {
      colorScheme?.setDark(false);
    });

    expect(await themeToggle('Switch to light mode')).toBeInTheDocument();
    expect(documentTheme()).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('targets the shown appearance when React theme state is still unset', () => {
    colorScheme = installPrefersColorScheme(true);
    document.documentElement.classList.add('dark');

    expect(currentTogglePreference()).toBe('light');
  });

  it('switches away from a dark system first paint instead of staying on system', async () => {
    colorScheme = installPrefersColorScheme(true);
    const user = userEvent.setup();
    renderThemeToggle();

    await user.click(await themeToggle('Switch to light mode'));

    expect(await themeToggle('Switch to dark mode')).toBeInTheDocument();
    expect(documentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
