import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_SIZE_SCOPES } from './pageSizeConfig';

const createStorageMock = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

describe('pageSizeStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const loadStore = async () => {
    const mod = await import('./pageSizeStore');
    mod.usePageSizeStore.persist.rehydrate();
    return mod;
  };

  it('readStoredPageSize returns defaults when storage is empty', async () => {
    const { readStoredPageSize } = await loadStore();
    expect(readStoredPageSize('transactions')).toBe(25);
    expect(readStoredPageSize('accounts')).toBe(10);
  });

  it('readStoredPageSize falls back to default for invalid stored values', async () => {
    localStorage.setItem('ploutizo:transactions:page-size', 'not-a-number');
    const { readStoredPageSize } = await loadStore();
    expect(readStoredPageSize('transactions')).toBe(25);
  });

  it('persistPageSize writes the correct per-key localStorage entry', async () => {
    const { persistPageSize, readStoredPageSize } = await loadStore();
    persistPageSize('transactions', 50);
    expect(localStorage.getItem('ploutizo:transactions:page-size')).toBe('50');
    expect(readStoredPageSize('transactions')).toBe(50);
  });

  it('persistPageSize skips redundant write when value is unchanged', async () => {
    localStorage.setItem('ploutizo:transactions:page-size', '25');
    const { persistPageSize } = await loadStore();
    const setItemSpy = vi.spyOn(localStorage, 'setItem');

    persistPageSize('transactions', 25);

    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('cross-tab StorageEvent rehydrates store from updated key', async () => {
    const { readStoredPageSize } = await loadStore();
    expect(readStoredPageSize('accounts')).toBe(10);

    localStorage.setItem('ploutizo:accounts:page-size', '50');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'ploutizo:accounts:page-size',
        newValue: '50',
      })
    );

    expect(readStoredPageSize('accounts')).toBe(50);
  });

  it('readStoredPageSize returns default when window is undefined', async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error — simulate SSR environment
    delete globalThis.window;

    const { readStoredPageSize } = await import('./pageSizeStore');
    expect(readStoredPageSize('transactions')).toBe(
      PAGE_SIZE_SCOPES.transactions.defaultSize
    );

    globalThis.window = originalWindow;
  });
});
