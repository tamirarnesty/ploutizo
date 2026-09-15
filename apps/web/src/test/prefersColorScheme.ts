import { vi } from 'vitest';

export const THEME_STORAGE_KEY = 'theme';

type ColorSchemeListener = (event: MediaQueryListEvent) => void;

export const installPrefersColorScheme = (initialDark: boolean) => {
  let matches = initialDark;
  const listeners = new Set<ColorSchemeListener>();

  const mql: MediaQueryList = {
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: (listener: ColorSchemeListener) => {
      listeners.add(listener);
    },
    removeListener: (listener: ColorSchemeListener) => {
      listeners.delete(listener);
    },
    addEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (typeof listener === 'function') {
        listeners.add(listener as ColorSchemeListener);
      }
    },
    removeEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (typeof listener === 'function') {
        listeners.delete(listener as ColorSchemeListener);
      }
    },
    dispatchEvent: () => true,
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      if (query.includes('prefers-color-scheme')) return mql;
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      };
    },
  });

  return {
    setDark: (next: boolean) => {
      matches = next;
      const event = {
        matches: next,
        media: mql.media,
      } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
};
