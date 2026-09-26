import { useRef } from 'react';
import type { ImportReviewRow } from '@ploutizo/types';

/**
 * Identity-only rows for TanStack Table `data`. Reviewed values and selection
 * come from row-scoped live queries (ADR 0005). TanStack rebuilds row models
 * when any `data[i]` reference changes — so these stubs must not update on
 * field saves or selection toggles.
 */
export type ImportReviewTableRow = { id: string };

const orderEqual = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((id, index) => id === right[index]);

export const useStableImportReviewTableRows = (
  rows: readonly ImportReviewRow[]
): ImportReviewTableRow[] => {
  const idStubCacheRef = useRef(new Map<string, ImportReviewTableRow>());
  const arrayCacheRef = useRef<ImportReviewTableRow[]>([]);
  const orderCacheRef = useRef<string[]>([]);

  const nextOrder = rows.map((row) => row.id);

  if (orderEqual(orderCacheRef.current, nextOrder)) {
    return arrayCacheRef.current;
  }

  const stubs = nextOrder.map((id) => {
    const cached = idStubCacheRef.current.get(id);
    if (cached) return cached;
    const stub = { id };
    idStubCacheRef.current.set(id, stub);
    return stub;
  });

  const seen = new Set(nextOrder);
  for (const id of idStubCacheRef.current.keys()) {
    if (!seen.has(id)) idStubCacheRef.current.delete(id);
  }

  orderCacheRef.current = nextOrder;
  arrayCacheRef.current = stubs;

  return stubs;
};
