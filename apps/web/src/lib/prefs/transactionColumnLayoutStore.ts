import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_TRANSACTION_COLUMN_LAYOUT,
  TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY,
  isSameTransactionColumnOrder,
  isSameTransactionColumnWidths,
  parseStoredTransactionColumnLayout,
  transactionColumnLayoutFromUnknown,
} from './transactionColumnLayout';
import type { TransactionColumnLayout } from './transactionColumnLayout';
import type { StateStorage } from 'zustand/middleware';

type TransactionColumnLayoutState = TransactionColumnLayout & {
  setOrder: (order: string[] | null) => void;
  setWidths: (widths: Record<string, number>) => void;
  reset: () => void;
};

const readLayout = (): TransactionColumnLayout =>
  parseStoredTransactionColumnLayout(
    localStorage.getItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY)
  );

const createTransactionColumnLayoutStorage = (): StateStorage => ({
  getItem: () =>
    JSON.stringify({
      state: readLayout(),
      version: 0,
    }),

  setItem: (_name, value) => {
    let parsed: { state?: unknown };
    try {
      parsed = JSON.parse(value) as { state?: unknown };
    } catch {
      return;
    }
    const layout = transactionColumnLayoutFromUnknown(parsed.state);
    if (layout.order === null && Object.keys(layout.widths).length === 0) {
      if (
        localStorage.getItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY) !== null
      ) {
        localStorage.removeItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY);
      }
      return;
    }
    const serialized = JSON.stringify(layout);
    if (
      localStorage.getItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY) !== serialized
    ) {
      localStorage.setItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY, serialized);
    }
  },

  removeItem: () => {
    localStorage.removeItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY);
  },
});

export const useTransactionColumnLayoutStore =
  create<TransactionColumnLayoutState>()(
    persist(
      (set, get) => ({
        ...DEFAULT_TRANSACTION_COLUMN_LAYOUT,
        setOrder: (order) => {
          if (isSameTransactionColumnOrder(get().order, order)) return;
          set({ order });
        },
        setWidths: (widths) => {
          if (isSameTransactionColumnWidths(get().widths, widths)) return;
          set({ widths });
        },
        reset: () => {
          const { order, widths } = get();
          if (order === null && Object.keys(widths).length === 0) {
            return;
          }
          set({ ...DEFAULT_TRANSACTION_COLUMN_LAYOUT });
        },
      }),
      {
        name: TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY,
        storage: createJSONStorage(() =>
          createTransactionColumnLayoutStorage()
        ),
        partialize: (state) => ({
          order: state.order,
          widths: state.widths,
        }),
        skipHydration: true,
      }
    )
  );

if (typeof window !== 'undefined') {
  void useTransactionColumnLayoutStore.persist.rehydrate();

  window.addEventListener('storage', (event) => {
    if (event.key === TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY) {
      void useTransactionColumnLayoutStore.persist.rehydrate();
    }
  });
}

export const ensureTransactionColumnLayoutHydrated =
  async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    await useTransactionColumnLayoutStore.persist.rehydrate();
  };
