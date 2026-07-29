import {
  computeImportDraftRowCounts,
  isImportRefundLinkBlocked,
} from '@ploutizo/utils';
import type { ExistingRefundTargetExpense } from '@ploutizo/utils';
import type { DbClient, ImportDraftRowRecord } from '@/lib/queries/imports';
import {
  adjustImportDraftRowCounts,
  listDraftRows,
  updateImportDraftRowQuery,
} from '@/lib/queries/imports';
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';
import {
  buildRefundLinkEvaluations,
  derivePersistedRowStatus,
} from '@/services/import-classification';

const collectRefundOfIds = (rows: readonly ImportDraftRowRecord[]): string[] =>
  rows.flatMap((row) => (row.reviewRefundOf ? [row.reviewRefundOf] : []));

/**
 * Re-evaluate refund-link validity for every draft row and persist status diffs.
 * Returns the full draft row set after sync.
 */
export const syncDraftRefundLinkStatuses = async (
  orgId: string,
  draftId: string,
  targetAccountId: string,
  client: DbClient,
  existingExpenses?: ReadonlyMap<string, ExistingRefundTargetExpense>
): Promise<ImportDraftRowRecord[]> => {
  const draftRows = await listDraftRows(orgId, draftId, client);
  const expenses =
    existingExpenses ??
    (await listRefundTargetExpensesByIds(orgId, collectRefundOfIds(draftRows)));
  const evaluations = buildRefundLinkEvaluations(
    draftRows,
    targetAccountId,
    expenses
  );

  const updates = draftRows.flatMap((row) => {
    const next = derivePersistedRowStatus(
      {
        status: row.status,
        reviewDate: row.reviewDate ?? null,
        reviewAmount: row.reviewAmount,
        reviewType: row.reviewType,
        reviewDescription: row.reviewDescription,
        parsedDate: row.parsedDate ?? null,
        parsedAmount: row.parsedAmount,
        parsedType: row.parsedType,
        parsedDescription: row.parsedDescription,
        reviewCategoryId: row.reviewCategoryId,
        reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
        reviewCounterpartAccountId: row.reviewCounterpartAccountId,
      },
      isImportRefundLinkBlocked(evaluations.get(row.id))
    );

    if (
      next.status === row.status &&
      next.invalidReason === row.invalidReason
    ) {
      return [];
    }

    return [{ row, next }];
  });

  const updatedById = new Map<string, ImportDraftRowRecord>();
  await Promise.all(
    updates.map(async ({ row, next }) => {
      const updated = await updateImportDraftRowQuery(
        orgId,
        row.id,
        { status: next.status, invalidReason: next.invalidReason },
        client
      );
      updatedById.set(row.id, updated ?? { ...row, ...next });
    })
  );

  const nextRows = draftRows.map((row) => updatedById.get(row.id) ?? row);

  const before = computeImportDraftRowCounts(draftRows);
  const after = computeImportDraftRowCounts(nextRows);
  await adjustImportDraftRowCounts(
    orgId,
    draftId,
    {
      validRowCount: after.validRowCount - before.validRowCount,
      invalidRowCount: after.invalidRowCount - before.invalidRowCount,
    },
    client
  );

  return nextRows;
};
