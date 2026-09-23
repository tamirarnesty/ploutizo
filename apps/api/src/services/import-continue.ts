import { db } from '@ploutizo/db';
import {
  importMatchTargetQueryInput,
  matchDecisionsForSelectedRows,
} from '@ploutizo/utils';
import type { ImportDraftDurableRow } from '@ploutizo/utils';
import type {
  ImportContinueDraftFacts,
  ImportExternalFacts,
  ImportFinalizeExternalFacts,
  PreparedImportOutcomeProjection,
} from '@ploutizo/utils/import-set-verification';
import type { Transaction } from '@ploutizo/db';
import type {
  ImportFinalizePreview,
  ImportRequirementFailureDetails,
  MatchTargetFact,
} from '@ploutizo/types';
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import type { AccountWriteReference } from '@/lib/queries/scope';
import type { ImportMatchTargetQueryInput } from '@/lib/queries/import-match-targets';
import { DomainError } from '@/lib/errors';
import { lockImportDraftBatch } from '@/lib/queries/imports';
import { verifyImportDraftProjectionForRowIds } from '@/services/import-draft-projection';
import { listOrgMembers } from '@/lib/queries/households';
import { fetchAccountWriteReference } from '@/lib/queries/scope';
import {
  listActiveExternalIdOwners,
  listImportMatchTargets,
} from '@/lib/queries/import-match-targets';
import {
  listRefundTargetExpensesByIds,
  sumPriorRefundTotalsByTransactionTarget,
} from '@/lib/queries/import-refund-targets';
import { toImportDraftDurableRow } from '@/services/import-draft-view';
import { toImportFinalizePreview } from '@/services/import-preview';

export const loadCounterpartAccounts = async (
  orgId: string,
  counterpartIds: readonly string[],
  tx: Transaction
) => {
  const counterparts = new Map<string, AccountWriteReference>();
  for (const accountId of [...new Set(counterpartIds)]) {
    const account = await fetchAccountWriteReference(orgId, accountId, {}, tx);
    if (account) counterparts.set(accountId, account);
  }
  return counterparts;
};

const loadImportExternalFacts = async (
  orgId: string,
  targetAccountId: string,
  input: {
    refundOfIds: string[];
    matchQuery: ImportMatchTargetQueryInput;
    counterpartIds: readonly string[];
    createdExternalIds: readonly string[];
    rowCount: number;
  },
  tx: Transaction
): Promise<ImportExternalFacts> => {
  const [
    existingExpenses,
    priorRefundsByTarget,
    existingTransactions,
    members,
    targetAccount,
  ] = await Promise.all([
    listRefundTargetExpensesByIds(orgId, input.refundOfIds, tx),
    sumPriorRefundTotalsByTransactionTarget(orgId, input.refundOfIds, tx),
    listImportMatchTargets(orgId, targetAccountId, input.matchQuery, tx),
    listOrgMembers(orgId, tx),
    fetchAccountWriteReference(orgId, targetAccountId, {}, tx),
  ]);

  if (!targetAccount) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }

  const [counterpartAccounts, activeExternalIdOwners] = await Promise.all([
    loadCounterpartAccounts(orgId, input.counterpartIds, tx),
    listActiveExternalIdOwners(
      orgId,
      targetAccountId,
      input.createdExternalIds,
      tx
    ),
  ]);

  return {
    rowCount: input.rowCount,
    targetAccount,
    counterpartAccounts,
    validAssigneeMemberIds: new Set(members.map((member) => member.id)),
    existingTransactions: [...existingTransactions.values()],
    existingExpenses,
    priorRefundsByTarget,
    activeExternalIdOwners,
  };
};

const withSelectionOverlay = (
  draftRows: readonly ImportDraftRowRecord[],
  selectedRowIds: ReadonlySet<string>
) =>
  draftRows.map((row) =>
    toImportDraftDurableRow(row, {
      selectedForImport: selectedRowIds.has(row.id),
    })
  );

/** Mirror selection-endpoint match decisions for session-only import sets. */
export const applySelectionMatchDecisionsForImportSet = (
  rows: readonly ImportDraftDurableRow[],
  selectedRowIds: ReadonlySet<string>,
  targetAccountId: string,
  existingTransactions: readonly MatchTargetFact[]
): ImportDraftDurableRow[] => {
  if (selectedRowIds.size === 0) return [...rows];

  const matchPatches = matchDecisionsForSelectedRows(rows, {
    rowIds: [...selectedRowIds],
    selectedForImport: true,
    targetAccountId,
    existingTransactions,
  });

  return rows.map((row) => {
    const nextMatch = matchPatches.get(row.id);
    if (nextMatch === undefined) return row;
    return { ...row, reviewMatchedTransactionId: nextMatch };
  });
};

export const loadImportContinueDraftFacts = async (
  orgId: string,
  targetAccountId: string,
  draft: { rowCount: number },
  draftRows: readonly ImportDraftRowRecord[],
  selectedRowIds: ReadonlySet<string>,
  tx: Transaction
): Promise<ImportContinueDraftFacts> => {
  const durableRows = withSelectionOverlay(draftRows, selectedRowIds);
  const createdExternalIds = durableRows.flatMap((row) => {
    if (!row.selectedForImport) return [];
    const externalId = row.externalId?.trim();
    return externalId ? [externalId] : [];
  });

  const externalFacts = await loadImportExternalFacts(
    orgId,
    targetAccountId,
    {
      refundOfIds: draftRows.flatMap((row) =>
        row.reviewRefundOf ? [row.reviewRefundOf] : []
      ),
      matchQuery: importMatchTargetQueryInput(draftRows),
      counterpartIds: draftRows.flatMap((row) =>
        row.reviewCounterpartAccountId ? [row.reviewCounterpartAccountId] : []
      ),
      createdExternalIds,
      rowCount: draft.rowCount,
    },
    tx
  );

  return {
    ...externalFacts,
    rows: applySelectionMatchDecisionsForImportSet(
      durableRows,
      selectedRowIds,
      targetAccountId,
      externalFacts.existingTransactions
    ),
  };
};

export const loadImportFinalizeExternalFacts = async (
  orgId: string,
  targetAccountId: string,
  projection: readonly PreparedImportOutcomeProjection[],
  rowCount: number,
  tx: Transaction
): Promise<ImportFinalizeExternalFacts> =>
  loadImportExternalFacts(
    orgId,
    targetAccountId,
    {
      refundOfIds: projection.flatMap((row) =>
        row.snapshot.reviewedValues.refundOf
          ? [row.snapshot.reviewedValues.refundOf]
          : []
      ),
      matchQuery: importMatchTargetQueryInput(
        projection.map((row) => ({
          reviewDate: row.snapshot.reviewedValues.date,
          parsedDate: row.snapshot.reviewedValues.date,
          externalId: row.snapshot.provenance.externalId,
          reviewMatchedTransactionId:
            row.outcome === 'matched' ? row.transactionId : null,
        }))
      ),
      counterpartIds: projection.flatMap((row) =>
        row.snapshot.reviewedValues.counterpartAccountId
          ? [row.snapshot.reviewedValues.counterpartAccountId]
          : []
      ),
      createdExternalIds: projection.flatMap((row) => {
        if (row.outcome !== 'created') return [];
        const externalId = row.snapshot.provenance.externalId?.trim();
        return externalId ? [externalId] : [];
      }),
      rowCount,
    },
    tx
  );

export const continueImportDraft = async (
  orgId: string,
  batchId: string,
  rowIds: string[]
): Promise<ImportFinalizePreview> =>
  db.transaction(async (tx) => {
    await lockImportDraftBatch(tx, orgId, batchId);

    const verified = await verifyImportDraftProjectionForRowIds(
      orgId,
      batchId,
      rowIds,
      tx
    );
    if (!verified.ready) {
      throw new DomainError<ImportRequirementFailureDetails>(
        400,
        'Some selected rows are not ready to import.',
        'IMPORT_CONTINUE_NOT_READY',
        { rows: verified.failures }
      );
    }

    return toImportFinalizePreview(
      batchId,
      verified.draft.rowCount,
      verified.projection
    );
  });
