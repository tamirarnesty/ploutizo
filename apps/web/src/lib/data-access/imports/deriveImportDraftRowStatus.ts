import {
  evaluateImportRefundLinks,
  isImportRefundLinkBlocked,
  toImportRefundLinkDraftRow,
} from '@ploutizo/utils';
import {
  deriveImportRowStatus,
  toImportRowStatusFields,
} from '@ploutizo/utils/import-row-status';
import type { ImportDraftRow } from '@ploutizo/types';

/** Derive status with same-import refund-link awareness (optimistic). */
export const deriveImportDraftRowStatus = (
  row: ImportDraftRow,
  draftRows: readonly ImportDraftRow[],
  targetAccountId: string
) => {
  const evaluations = evaluateImportRefundLinks(
    draftRows.map(toImportRefundLinkDraftRow),
    { targetAccountId }
  );
  return deriveImportRowStatus(
    toImportRowStatusFields({
      ...row,
      refundLinkBlocked: isImportRefundLinkBlocked(evaluations.get(row.id)),
    })
  );
};
