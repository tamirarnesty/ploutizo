import type { ImportMatchDraftRow } from './types';

export const collisionGroups = (
  rows: readonly ImportMatchDraftRow[]
): Map<string, string[]> => {
  const byExternalId = new Map<string, string[]>();
  for (const row of rows) {
    const externalId = row.externalId?.trim();
    if (!externalId) continue;
    const ids = byExternalId.get(externalId) ?? [];
    ids.push(row.id);
    byExternalId.set(externalId, ids);
  }
  const groups = new Map<string, string[]>();
  for (const ids of byExternalId.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      groups.set(
        id,
        ids.filter((otherId) => otherId !== id)
      );
    }
  }
  return groups;
};

/** True when more than one row in the collision group is selected for import. */
export const hasUnresolvedCollisionIssue = (
  collisionRowIds: readonly string[],
  selectedIds: ReadonlySet<string>,
  rowSelected: boolean
): boolean => {
  const selectedInCollisionGroup =
    (rowSelected ? 1 : 0) +
    collisionRowIds.filter((id) => selectedIds.has(id)).length;
  return collisionRowIds.length > 0 && selectedInCollisionGroup > 1;
};
