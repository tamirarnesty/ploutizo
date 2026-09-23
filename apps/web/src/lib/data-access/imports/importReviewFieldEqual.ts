/** Shallow equality for review patch fields (arrays compared element-wise). */
export const importReviewFieldValuesEqual = (
  left: unknown,
  right: unknown
): boolean => {
  if (Object.is(left, right)) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
};
