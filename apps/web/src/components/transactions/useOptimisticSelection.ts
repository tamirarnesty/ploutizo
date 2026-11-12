import { startTransition, useOptimistic } from 'react';

/**
 * Multi-select state for URL-backed filters. `values` lags behind a toggle
 * until navigation settles, so the new selection is shown optimistically for
 * the lifetime of the `onChange` promise. Rapid toggles each build on the
 * latest optimistic selection, and React reverts to the committed `values`
 * only once every pending change has settled.
 */
export const useOptimisticSelection = (
  values: string[],
  onChange: (values: string[]) => Promise<void>
) => {
  const [selected, setSelected] = useOptimistic(
    values,
    (_current, next: string[]) => next
  );

  const commit = (next: string[]) => {
    startTransition(async () => {
      setSelected(next);
      await onChange(next);
    });
  };

  const toggle = (value: string) => {
    commit(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  return { selected, commit, toggle };
};
