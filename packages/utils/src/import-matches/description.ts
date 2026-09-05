import { IMPORT_MATCH_FUZZY_DESCRIPTION_MIN_SIMILARITY } from './types';

export const normalizeImportMatchDescription = (
  value: string | null | undefined
): string =>
  (value ?? '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const descriptionTokens = (value: string): Set<string> =>
  new Set(value.split(' ').filter(Boolean));

const jaccardSimilarity = (left: string, right: string): number => {
  const leftTokens = descriptionTokens(left);
  const rightTokens = descriptionTokens(right);
  if (leftTokens.size === 0 && rightTokens.size === 0) return 1;
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  const union = leftTokens.size + rightTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

export const importDescriptionsAreSimilar = (
  left: string,
  right: string
): boolean => {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  return (
    jaccardSimilarity(left, right) >=
    IMPORT_MATCH_FUZZY_DESCRIPTION_MIN_SIMILARITY
  );
};
