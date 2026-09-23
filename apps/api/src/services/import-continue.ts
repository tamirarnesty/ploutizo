import { db } from '@ploutizo/db';
import { importMatchTargetQueryInput } from '@ploutizo/utils';
import { verifyImportSetForContinue } from '@ploutizo/utils/import-set-verification';
import type {
  ImportContinueDraftFacts,
  ImportExternalFacts,
  ImportFinalizeExternalFacts,
} from '@ploutizo/utils/import-set-verification';
import type { Transaction } from '@ploutizo/db';
import type {
  ImportFinalizePreview,
  ImportRequirementFailureDetails,
} from '@ploutizo/types';
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import type { AccountWriteReference } from '@/lib/queries/scope';
import type { ImportMatchTargetQueryInput } from '@/lib/queries/import-match-targets';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  fetchDraftSummaryById,
  listDraftRows,
  lockImportDraftBatch,
} from '@/lib/queries/imports';
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

  return {
    ...(await loadImportExternalFacts(
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
    )),
    rows: durableRows,
  };
};

export const loadImportFinalizeExternalFacts = async (
  orgId: string,
  targetAccountId: string,
  projection: readonly {
    outcome: string;
    transactionId: string | null;
    snapshot: {
      reviewedValues: {
        refundOf: string | null;
        counterpartAccountId: string | null;
        date: string | null;
      };
      provenance: { externalId: string | null };
    };
  }[],
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

    const draft = await fetchDraftSummaryById(orgId, batchId, tx);
    if (!draft) throw new NotFoundError('Import draft not found.');
    if (!draft.accountId) {
      throw new DomainError(500, 'Import draft is missing an account.');
    }

    const uniqueRowIds = [...new Set(rowIds)];
    const draftRows = await listDraftRows(orgId, batchId, tx);
    const rowIdSet = new Set(uniqueRowIds);
    const matching = draftRows.filter((row) => rowIdSet.has(row.id));
    if (matching.length !== uniqueRowIds.length) {
      throw new NotFoundError('Import draft row not found.');
    }

    const draftFacts = await loadImportContinueDraftFacts(
      orgId,
      draft.accountId,
      draft,
      draftRows,
      rowIdSet,
      tx
    );
    const verified = verifyImportSetForContinue(draftFacts);
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
      draft.rowCount,
      verified.projection
    );
  });
