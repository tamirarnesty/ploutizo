/** Reorder items by id list; unknown ids are omitted; trailing items not in orderedIds are appended. */
export const reorderByIds = <T extends { id: string }>(
  items: T[],
  orderedIds: string[]
): T[] => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const reordered: T[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    if (seen.has(id)) continue;
    const item = byId.get(id);
    if (item) {
      reordered.push(item);
      seen.add(id);
    }
  }

  for (const item of items) {
    if (!seen.has(item.id)) {
      reordered.push(item);
    }
  }

  return reordered;
};
