import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY } from './transactionColumnLayout';

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

describe('transactionColumnLayoutStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const loadStore = async () => {
    const mod = await import('./transactionColumnLayoutStore');
    await mod.ensureTransactionColumnLayoutHydrated();
    return mod;
  };

  it('hydrates a saved sequence and widths', async () => {
    localStorage.setItem(
      TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        order: ['amount', 'date', 'actions'],
        widths: { date: 180 },
      })
    );
    const { useTransactionColumnLayoutStore } = await loadStore();
    expect(useTransactionColumnLayoutStore.getState().order).toEqual([
      'amount',
      'date',
      'actions',
    ]);
    expect(useTransactionColumnLayoutStore.getState().widths).toEqual({
      date: 180,
    });
  });

  it('hydrates the default when the save cannot be read', async () => {
    localStorage.setItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY, '{');
    const { useTransactionColumnLayoutStore } = await loadStore();
    expect(useTransactionColumnLayoutStore.getState().order).toBeNull();
    expect(useTransactionColumnLayoutStore.getState().widths).toEqual({});
  });

  it('removes the saved layout when it is reset', async () => {
    const { useTransactionColumnLayoutStore } = await loadStore();
    useTransactionColumnLayoutStore.getState().setOrder(['amount', 'date']);
    useTransactionColumnLayoutStore.getState().setWidths({ date: 180 });
    expect(localStorage.getItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY)).toBe(
      JSON.stringify({
        order: ['amount', 'date'],
        widths: { date: 180 },
      })
    );

    useTransactionColumnLayoutStore.getState().reset();
    expect(
      localStorage.getItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY)
    ).toBeNull();
    expect(useTransactionColumnLayoutStore.getState().order).toBeNull();
    expect(useTransactionColumnLayoutStore.getState().widths).toEqual({});
  });

  it('picks up a layout written in another tab', async () => {
    const { useTransactionColumnLayoutStore } = await loadStore();
    expect(useTransactionColumnLayoutStore.getState().order).toBeNull();

    const saved = JSON.stringify({
      order: ['amount', 'date'],
      widths: { amount: 200 },
    });
    localStorage.setItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY, saved);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY,
        newValue: saved,
      })
    );
    await useTransactionColumnLayoutStore.persist.rehydrate();

    expect(useTransactionColumnLayoutStore.getState().order).toEqual([
      'amount',
      'date',
    ]);
    expect(useTransactionColumnLayoutStore.getState().widths).toEqual({
      amount: 200,
    });
  });
});
