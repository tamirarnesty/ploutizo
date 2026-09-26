import {
  importMatchTargetQueryInput,
  matchDecisionsForSelectedRows,
} from '@ploutizo/utils';
import type { ImportDraftDurableRow } from '@ploutizo/utils';
import type { ImportSetFacts } from '@ploutizo/utils/import-set-verification';
import type { Transaction } from '@ploutizo/db';
import type { MatchTargetFact } from '@ploutizo/types';
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import type { AccountWriteReference } from '@/lib/queries/scope';
import { DomainError } from '@/lib/errors';
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
import { toImportDraftDurableRowFromRecord } from '@/services/import-draft-view';

export interface ImportSetFactsInput {
  orgId: string;
  accountId: string;
  rowCount: number;
  draftRows: readonly ImportDraftRowRecord[];
  selectedRowIds: ReadonlySet<string>;
}

const loadCounterpartAccounts = async (
  orgId: string,
  counterpartIds: readonly string[],
  tx: Transaction
) => {
  const uniqueIds = [...new Set(counterpartIds)];
  const accounts = await Promise.all(
    uniqueIds.map((accountId) =>
      fetchAccountWriteReference(orgId, accountId, {}, tx)
    )
  );
  const counterparts = new Map<string, AccountWriteReference>();
  for (let index = 0; index < uniqueIds.length; index++) {
    const account = accounts[index];
    if (account) counterparts.set(uniqueIds[index], account);
  }
  return counterparts;
};

const selectedExternalIds = (rows: readonly ImportDraftDurableRow[]) =>
  rows.flatMap((row) => {
    if (!row.selectedForImport) return [];
    const externalId = row.externalId?.trim();
    return externalId ? [externalId] : [];
  });

/** Apply the same match decisions the review session makes when rows are selected. */
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

/** Load durable draft rows plus current external facts for import set verification. */
export const loadImportSetFacts = async (
  tx: Transaction,
  input: ImportSetFactsInput
): Promise<ImportSetFacts> => {
  const { orgId, accountId, draftRows, selectedRowIds } = input;
  const durableRows = draftRows.map((row) =>
    toImportDraftDurableRowFromRecord(row, selectedRowIds.has(row.id))
  );
  const refundOfIds = draftRows.flatMap((row) =>
    row.reviewRefundOf ? [row.reviewRefundOf] : []
  );
  const counterpartIds = draftRows.flatMap((row) =>
    row.reviewCounterpartAccountId ? [row.reviewCounterpartAccountId] : []
  );

  const [
    existingExpenses,
    priorRefundsByTarget,
    existingTransactions,
    members,
    targetAccount,
    counterpartAccounts,
    activeExternalIdOwners,
  ] = await Promise.all([
    listRefundTargetExpensesByIds(orgId, refundOfIds, tx),
    sumPriorRefundTotalsByTransactionTarget(orgId, refundOfIds, tx),
    listImportMatchTargets(
      orgId,
      accountId,
      importMatchTargetQueryInput(draftRows),
      tx
    ),
    listOrgMembers(orgId, tx),
    fetchAccountWriteReference(orgId, accountId, {}, tx),
    loadCounterpartAccounts(orgId, counterpartIds, tx),
    listActiveExternalIdOwners(
      orgId,
      accountId,
      selectedExternalIds(durableRows),
      tx
    ),
  ]);

  if (!targetAccount) {
    throw new DomainError(500, 'Import target account is not writable.');
  }

  const matchTargets = [...existingTransactions.values()];
  return {
    rowCount: input.rowCount,
    targetAccount,
    counterpartAccounts,
    validAssigneeMemberIds: new Set(members.map((member) => member.id)),
    existingTransactions: matchTargets,
    existingExpenses,
    priorRefundsByTarget,
    activeExternalIdOwners,
    rows: applySelectionMatchDecisionsForImportSet(
      durableRows,
      selectedRowIds,
      accountId,
      matchTargets
    ),
  };
};
