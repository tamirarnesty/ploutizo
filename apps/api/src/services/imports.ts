import { db } from '@ploutizo/db';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
  ImportTargetAccount,
} from '@ploutizo/types';
import type {
  CreateImportDraftInput,
  UpdateImportDraftRowInput,
} from '@ploutizo/validators';
import { DomainError, NotFoundError } from '@/lib/errors';
import { listAccountMemberDetails } from '@/lib/queries/accounts';
import {
  discardImportDraftQuery,
  fetchActiveCreditCardAccount,
  fetchActiveDraftByAccount,
  fetchDraftRowForUpdate,
  fetchDraftSummaryById,
  insertImportBatch,
  insertImportBatchRows,
  listActiveImportDraftSummaries,
  listDraftRows,
  listImportTargetAccounts,
  listRecentImportHistory,
  touchImportDraft,
  updateImportDraftRowQuery,
} from '@/lib/queries/imports';
import {
  NORMALIZED_IMPORT_EXAMPLE_CSV,
  parsePloutizoNormalizedCsv,
} from '@/lib/imports/normalizedCsv';

const toImportDraftSummary = (
  row: Awaited<ReturnType<typeof listActiveImportDraftSummaries>>[number]
): ImportDraftSummary => {
  if (!row.accountId) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }
  return {
    ...row,
    accountId: row.accountId,
    importedAt: row.importedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    discardedAt: row.discardedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

const toImportDraftRow = (
  row: Awaited<ReturnType<typeof listDraftRows>>[number]
): ImportDraftRow => ({
  ...row,
  parsedDate: row.parsedDate ?? null,
  reviewDate: row.reviewDate ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const buildTargetOwners = async (
  orgId: string,
  targets: Awaited<ReturnType<typeof listImportTargetAccounts>>
) => {
  const memberRows = await listAccountMemberDetails(
    orgId,
    targets.map((target) => target.id)
  );
  const byAccount = new Map<ImportTargetAccount['id'], ImportTargetAccount['owners']>();
  for (const member of memberRows) {
    const owners = byAccount.get(member.accountId) ?? [];
    owners.push({
      id: member.memberId,
      displayName: member.displayName,
      imageUrl: member.imageUrl ?? null,
    });
    byAccount.set(member.accountId, owners);
  }
  return byAccount;
};

export const listImportTargets = async (
  orgId: string
): Promise<ImportTargetAccount[]> => {
  const targets = await listImportTargetAccounts(orgId);
  const ownersByAccount = await buildTargetOwners(orgId, targets);
  return targets.map((target) => ({
    ...target,
    owners: ownersByAccount.get(target.id) ?? [],
  }));
};

export const listActiveImportDrafts = async (
  orgId: string
): Promise<ImportDraftSummary[]> => {
  const rows = await listActiveImportDraftSummaries(orgId);
  return rows.map(toImportDraftSummary);
};

export const listImportHistory = async (
  orgId: string
): Promise<ImportDraftSummary[]> => {
  const rows = await listRecentImportHistory(orgId);
  return rows.map(toImportDraftSummary);
};

export const getImportDraft = async (
  orgId: string,
  draftId: string
): Promise<ImportDraft> => {
  const summary = await fetchDraftSummaryById(orgId, draftId);
  if (!summary) throw new NotFoundError('Import draft not found.');
  const rows = await listDraftRows(orgId, draftId);
  return {
    ...toImportDraftSummary(summary),
    rows: rows.map(toImportDraftRow),
  };
};

export const createNormalizedImportDraft = async (
  orgId: string,
  input: CreateImportDraftInput
): Promise<{ draft: ImportDraft; reusedExisting: boolean }> => {
  const account = await fetchActiveCreditCardAccount(orgId, input.accountId);
  if (!account) {
    throw new NotFoundError('Import target account not found.');
  }

  const existingDraft = await fetchActiveDraftByAccount(orgId, input.accountId);
  if (existingDraft) {
    return {
      draft: await getImportDraft(orgId, existingDraft.id),
      reusedExisting: true,
    };
  }

  const parsed = parsePloutizoNormalizedCsv(input.content);
  const draftId = await db.transaction(async (tx) => {
    const batch = await insertImportBatch(tx, {
      orgId,
      accountId: input.accountId,
      source: parsed.source,
      status: 'draft',
      fileName: input.fileName,
      importedAt: new Date(),
      rowCount: parsed.rowCount,
      validRowCount: parsed.validRowCount,
      invalidRowCount: parsed.invalidRowCount,
    });

    await insertImportBatchRows(
      tx,
      parsed.rows.map((row) => ({
        ...row,
        orgId,
        batchId: batch.id,
      }))
    );

    return batch.id;
  });

  return { draft: await getImportDraft(orgId, draftId), reusedExisting: false };
};

export const discardImportDraft = async (orgId: string, draftId: string) => {
  const row = await discardImportDraftQuery(orgId, draftId);
  if (!row) throw new NotFoundError('Import draft not found.');
  return row;
};

export const updateImportDraftRow = async (
  orgId: string,
  rowId: string,
  input: UpdateImportDraftRowInput
): Promise<ImportDraftRow> => {
  const row = await fetchDraftRowForUpdate(orgId, rowId);
  if (!row) throw new NotFoundError('Import draft row not found.');

  const updated = await updateImportDraftRowQuery(orgId, rowId, input);
  if (!updated) throw new NotFoundError('Import draft row not found.');
  await touchImportDraft(row.batchId);
  return toImportDraftRow(updated);
};

export const getNormalizedImportExampleCsv = () => NORMALIZED_IMPORT_EXAMPLE_CSV;
