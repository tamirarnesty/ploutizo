/**
 * An amount axis domain that always includes zero, so bars and lines start from it and net-negative values
 * (refunds exceeding spend) extend below or left of it. Null values are absent points and do not count.
 */
export const amountDomain = (
  values: readonly (number | null)[]
): [number, number] => {
  const finite = values.filter(
    (value): value is number => value !== null && Number.isFinite(value)
  );
  const min = Math.min(...finite, 0);
  const max = Math.max(...finite, 0);
  if (min === max) {
    return [min - 1, max + 1];
  }
  return [min, max];
};
