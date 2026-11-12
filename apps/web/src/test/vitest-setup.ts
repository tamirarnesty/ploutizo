import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('@clerk/shared/loadClerkJsScript', () => ({
  loadClerkJsScript: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => cleanup());

/**
 * Node 25+ may expose a non-functional `localStorage` global (e.g. missing
 * `--localstorage-file`). TanStack DB reads `localStorage.getItem('DEBUG')`
 * during collection.update — stub a minimal in-memory store when needed.
 */
try {
  globalThis.localStorage.getItem('__ploutizo_localStorage_probe__');
} catch {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } satisfies Storage);
}

// jsdom lacks `window.matchMedia`; default to a desktop, light-scheme viewport.
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

/** Base UI portals / menus rely on layout observers in browsers. */
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
}

/** Base UI ScrollArea reads animation state from the viewport in jsdom. */
if (typeof Element.prototype.getAnimations === 'undefined') {
  Element.prototype.getAnimations = () => [];
}

/**
 * jsdom does not implement `HTMLElement.isContentEditable`. TanStack Hotkeys
 * uses that getter for `ignoreInputs`, including nested focus inside editors.
 */
Object.defineProperty(HTMLElement.prototype, 'isContentEditable', {
  configurable: true,
  enumerable: true,
  get() {
    let node: HTMLElement | null = this;
    while (node) {
      const value = node.getAttribute('contenteditable');
      if (value === 'true' || value === '') return true;
      if (value === 'false') return false;
      node = node.parentElement;
    }
    return false;
  },
});
