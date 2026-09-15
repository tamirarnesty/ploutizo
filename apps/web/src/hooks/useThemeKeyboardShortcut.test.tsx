import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '@ploutizo/ui/components/theme-provider';
import {
  THEME_STORAGE_KEY,
  installPrefersColorScheme,
} from '@/test/prefersColorScheme';
import { useThemeKeyboardShortcut } from './useThemeKeyboardShortcut';
import type { ReactNode } from 'react';

const ShortcutHarness = ({ children }: { children?: ReactNode }) => {
  useThemeKeyboardShortcut();
  return <div>{children}</div>;
};

const renderShortcut = (children?: ReactNode) =>
  render(
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
    >
      <ShortcutHarness>{children}</ShortcutHarness>
    </ThemeProvider>
  );

const documentTheme = () =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const pressD = (target: EventTarget = document.body) => {
  fireEvent.keyDown(target as Element, { key: 'd' });
};

describe('useThemeKeyboardShortcut', () => {
  let colorScheme: ReturnType<typeof installPrefersColorScheme>;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    colorScheme = installPrefersColorScheme(false);
  });

  afterEach(() => {
    colorScheme.restore();
    window.localStorage.clear();
  });

  it('uses the reversible two-state toggle', () => {
    renderShortcut();

    pressD();

    expect(documentTheme()).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    pressD();

    expect(documentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it.each([
    ['input', () => <input aria-label="Note" />],
    ['textarea', () => <textarea aria-label="Note" />],
    ['select', () => <select aria-label="Note" />],
  ])('stays inactive while typing in a %s', (_label, Control) => {
    renderShortcut(<Control />);

    const field = screen.getByLabelText('Note');
    field.focus();
    pressD(field);

    expect(documentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('stays inactive when a nested SVG inside a contenteditable control has focus', () => {
    renderShortcut(
      <div contentEditable="true" suppressContentEditableWarning>
        <svg aria-label="Note" tabIndex={0}>
          <title>Note</title>
        </svg>
      </div>
    );

    const field = screen.getByLabelText('Note');
    field.focus();
    pressD(field);

    expect(documentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('stays inactive while typing in a contenteditable control', () => {
    renderShortcut(
      <div
        role="textbox"
        contentEditable="true"
        suppressContentEditableWarning
        aria-label="Note"
      />
    );

    const field = screen.getByLabelText('Note');
    field.focus();
    pressD(field);

    expect(documentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('ignores the shortcut when modifiers are held', () => {
    renderShortcut();

    fireEvent.keyDown(document.body, { key: 'd', metaKey: true });
    fireEvent.keyDown(document.body, { key: 'd', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'd', altKey: true });
    fireEvent.keyDown(document.body, { key: 'd', shiftKey: true });

    expect(documentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
