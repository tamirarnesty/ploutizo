import type {
  ImportDraftPersistedRow,
  ImportDraftRow,
  UpdateImportDraftRowResult,
} from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { applyImportDraftRefundTargetFactDelta } from './mergeImportDraftRefundTargetFacts';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
};

const patchKeys = (patch: UpdateImportDraftRowInput) =>
  Object.keys(patch) as (keyof UpdateImportDraftRowInput)[];

/** Live diverged from this mutation on a patched field after the attempt snapshot. */
const isLiveNewerField = (
  live: ImportDraftRow,
  attempted: ImportDraftRow,
  original: ImportDraftRow,
  key: keyof UpdateImportDraftRowInput
) =>
  !valuesEqual(live[key], attempted[key]) &&
  !valuesEqual(live[key], original[key]);

const syncRefundTargetFacts = (
  draftId: string,
  patch: UpdateImportDraftRowInput,
  original: ImportDraftRow,
  refundTargetFacts?: UpdateImportDraftRowResult['refundTargetFacts']
) => {
  const touchedRefundOf = Object.prototype.hasOwnProperty.call(
    patch,
    'reviewRefundOf'
  );
  const collection = getImportDraftRowsCollection(draftId);
  applyImportDraftRefundTargetFactDelta(draftId, {
    merge: refundTargetFacts,
    previousRefundOf: touchedRefundOf ? original.reviewRefundOf : undefined,
    nextRefundOf: touchedRefundOf ? patch.reviewRefundOf : undefined,
    rows: collection.toArray,
  });
};

/**
 * Confirm persisted durable fields into the synced store without clobbering a
 * newer live edit. Always re-derive — never merge server status / invalidReason.
 */
export const confirmPersistIntoCollection = (
  collection: ReturnType<typeof getImportDraftRowsCollection>,
  server: UpdateImportDraftRowResult | null,
  attempted: ImportDraftRow,
  original: ImportDraftRow,
  patch: UpdateImportDraftRowInput,
  draftId: string
) => {
  const serverRow = server?.row ?? null;
  const live = collection.get(attempted.id);

  if (!serverRow) {
    collection.utils.writeUpdate(live ?? attempted);
    rederiveImportDraftWorkingCopy(draftId);
    return;
  }

  const keys = patchKeys(patch);
  const preferLive =
    live !== undefined &&
    keys.some((key) => isLiveNewerField(live, attempted, original, key));
  const next: ImportDraftRow = { ...(preferLive ? live : attempted) };

  for (const key of keys) {
    Object.assign(next, {
      [key]:
        live !== undefined && isLiveNewerField(live, attempted, original, key)
          ? live[key]
          : serverRow[key as keyof ImportDraftPersistedRow],
    });
  }

  if (!preferLive) {
    const timestampSource = live ?? next;
    if (serverRow.updatedAt >= timestampSource.updatedAt) {
      next.updatedAt = serverRow.updatedAt;
    }
  }

  collection.utils.writeUpdate(next);
  syncRefundTargetFacts(draftId, patch, original, server?.refundTargetFacts);
  rederiveImportDraftWorkingCopy(draftId);
};
