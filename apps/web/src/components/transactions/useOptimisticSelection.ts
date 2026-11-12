import { startTransition, useOptimistic } from 'react';

/** `values` lags a toggle until navigation settles; rapid toggles build on the latest optimistic selection. */
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
