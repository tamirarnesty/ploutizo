/** Serialize prior refund totals for JSON API responses. */
export const priorRefundsByTargetToRecord = (
  map: ReadonlyMap<string, number> | undefined
): Record<string, number> => {
  if (!map) return {};
  return Object.fromEntries(map);
};

export const priorRefundsByTargetFromRecord = (
  record: Record<string, number> | undefined
): Map<string, number> => new Map(Object.entries(record ?? {}));
