import { useCallback, useMemo } from 'react';
import { useTransactionColumnLayoutStore } from '@/lib/prefs/transactionColumnLayoutStore';
import {
  TRANSACTION_COLUMN_IDS,
  TRANSACTION_COLUMN_SIZES,
  isTransactionColumnLayoutCustom,
  moveTransactionColumn,
  resolveTransactionColumnOrder,
  resolveTransactionColumnWidths,
} from '@/lib/prefs/transactionColumnLayout';
import type {
  ColumnOrderState,
  ColumnSizingState,
  Updater,
} from '@tanstack/react-table';

const commitOrder = (order: readonly string[]) => {
  const resolved = resolveTransactionColumnOrder(order, TRANSACTION_COLUMN_IDS);
  const stored = isTransactionColumnLayoutCustom(
    resolved,
    {},
    TRANSACTION_COLUMN_IDS
  )
    ? resolved
    : null;
  useTransactionColumnLayoutStore.getState().setOrder(stored);
};

const commitWidths = (widths: ColumnSizingState) => {
  useTransactionColumnLayoutStore
    .getState()
    .setWidths(
      resolveTransactionColumnWidths(widths, TRANSACTION_COLUMN_SIZES)
    );
};

const currentOrder = (): ColumnOrderState =>
  resolveTransactionColumnOrder(
    useTransactionColumnLayoutStore.getState().order,
    TRANSACTION_COLUMN_IDS
  );

const currentWidths = (): ColumnSizingState =>
  resolveTransactionColumnWidths(
    useTransactionColumnLayoutStore.getState().widths,
    TRANSACTION_COLUMN_SIZES
  );

export const useTransactionColumnLayout = () => {
  const storedOrder = useTransactionColumnLayoutStore((state) => state.order);
  const storedWidths = useTransactionColumnLayoutStore((state) => state.widths);

  const columnOrder = useMemo(
    () => resolveTransactionColumnOrder(storedOrder, TRANSACTION_COLUMN_IDS),
    [storedOrder]
  );
  const columnSizing = useMemo(
    () =>
      resolveTransactionColumnWidths(storedWidths, TRANSACTION_COLUMN_SIZES),
    [storedWidths]
  );
  const isCustom = isTransactionColumnLayoutCustom(
    columnOrder,
    columnSizing,
    TRANSACTION_COLUMN_IDS
  );

  const onColumnOrderChange = useCallback(
    (updater: Updater<ColumnOrderState>) => {
      commitOrder(
        typeof updater === 'function' ? updater(currentOrder()) : updater
      );
    },
    []
  );

  const onColumnSizingChange = useCallback(
    (updater: Updater<ColumnSizingState>) => {
      commitWidths(
        typeof updater === 'function' ? updater(currentWidths()) : updater
      );
    },
    []
  );

  const moveColumn = useCallback((activeId: string, overId: string) => {
    const current = resolveTransactionColumnOrder(
      useTransactionColumnLayoutStore.getState().order,
      TRANSACTION_COLUMN_IDS
    );
    commitOrder(moveTransactionColumn(current, activeId, overId));
  }, []);

  const reset = useCallback(() => {
    useTransactionColumnLayoutStore.getState().reset();
  }, []);

  return {
    columnOrder,
    columnSizing,
    isCustom,
    moveColumn,
    onColumnOrderChange,
    onColumnSizingChange,
    reset,
  };
};
