import type {
  ImportDraftPersistedRow,
  ImportReviewRow,
  UpdateImportDraftRowResult,
} from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { applyImportDraftRefundTargetFactDelta } from './mergeImportDraftRefundTargetFacts';
import { importReviewFieldValuesEqual } from './importReviewFieldEqual';
import { importReviewRowsEqual } from './importReviewRowsEqual';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';

const patchKeys = (patch: UpdateImportDraftRowInput) =>
  Object.keys(patch) as (keyof UpdateImportDraftRowInput)[];

/** Live diverged from this mutation on a patched field after the attempt snapshot. */
const isLiveNewerField = (
  live: ImportReviewRow,
  attempted: ImportReviewRow,
  original: ImportReviewRow,
  key: keyof UpdateImportDraftRowInput
) =>
  !importReviewFieldValuesEqual(live[key], attempted[key]) &&
  !importReviewFieldValuesEqual(live[key], original[key]);

const syncRefundTargetFacts = (
  draftId: string,
  patch: UpdateImportDraftRowInput,
  original: ImportReviewRow,
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
  attempted: ImportReviewRow,
  original: ImportReviewRow,
  patch: UpdateImportDraftRowInput,
  draftId: string,
  options?: { deferRederive?: boolean; deferRefundFactsMerge?: boolean }
) => {
  const serverRow = server?.row ?? null;
  const live = collection.get(attempted.id);

  if (!serverRow) {
    collection.utils.writeUpdate(live ?? attempted);
    if (!options?.deferRederive) {
      rederiveImportDraftWorkingCopy(draftId);
    }
    return;
  }

  const keys = patchKeys(patch);
  const preferLive =
    live !== undefined &&
    keys.some((key) => isLiveNewerField(live, attempted, original, key));
  const next: ImportReviewRow = { ...(preferLive ? live : attempted) };

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

  // Selection is session-only; a toggle during the debounce must survive the confirm.
  if (live) next.selectedForImport = live.selectedForImport;
  if (!live || !importReviewRowsEqual(live, next)) {
    collection.utils.writeUpdate(next);
  }
  if (!options?.deferRefundFactsMerge) {
    syncRefundTargetFacts(draftId, patch, original, server?.refundTargetFacts);
  }
  if (!options?.deferRederive) {
    rederiveImportDraftWorkingCopy(draftId);
  }
};
