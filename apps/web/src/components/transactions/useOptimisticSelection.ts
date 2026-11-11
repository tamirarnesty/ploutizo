import { useMemo, useState } from 'react';

/**
 * Optimistic multi-select values for URL-backed filters. `values` lags behind
 * rapid toggles, so the draft wins until the committed values catch up.
 */
export const useOptimisticSelection = (
  values: string[],
  onChange: (values: string[]) => void
) => {
  const valuesKey = values.join('\u0000');
  const [draftValues, setDraftValues] = useState<string[] | null>(null);
  const [appliedValuesKey, setAppliedValuesKey] = useState(valuesKey);

  if (appliedValuesKey !== valuesKey) {
    setAppliedValuesKey(valuesKey);
    setDraftValues(null);
  }

  const selected = draftValues ?? values;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const commit = (next: string[]) => {
    setDraftValues(next);
    onChange(next);
  };

  const toggle = (value: string) => {
    const next = selectedSet.has(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    commit(next);
  };

  return { selected, selectedSet, commit, toggle };
};
