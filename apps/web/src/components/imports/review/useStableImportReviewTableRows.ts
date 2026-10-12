import { useMemo, useState } from 'react';
import type { ImportReviewRow } from '@ploutizo/types';

/**
 * Identity-only rows for TanStack Table `data`. Reviewed values and selection
 * come from row-scoped live queries (ADR 0005). TanStack rebuilds row models
 * when any `data[i]` reference changes — so these stubs must not update on
 * field saves or selection toggles.
 */
export type ImportReviewTableRow = { id: string };

const ORDER_KEY_SEPARATOR = '\u0000';

export const useStableImportReviewTableRows = (
  rows: readonly ImportReviewRow[]
): ImportReviewTableRow[] => {
  const [idStubCache] = useState(() => new Map<string, ImportReviewTableRow>());
  const orderKey = rows.map((row) => row.id).join(ORDER_KEY_SEPARATOR);

  return useMemo(() => {
    const ids = orderKey ? orderKey.split(ORDER_KEY_SEPARATOR) : [];
    const stubs = ids.map((id) => {
      const cached = idStubCache.get(id);
      if (cached) return cached;
      const stub = { id };
      idStubCache.set(id, stub);
      return stub;
    });

    const seen = new Set(ids);
    for (const id of idStubCache.keys()) {
      if (!seen.has(id)) idStubCache.delete(id);
    }

    return stubs;
  }, [orderKey, idStubCache]);
};
