import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { alertDialogMock, dialogMock, sheetMock } from '@/test/mockUiOverlays';

vi.mock('@ploutizo/ui/components/dialog', () => dialogMock);
vi.mock('@ploutizo/ui/components/sheet', () => sheetMock);
vi.mock('@ploutizo/ui/components/alert-dialog', () => alertDialogMock);

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
