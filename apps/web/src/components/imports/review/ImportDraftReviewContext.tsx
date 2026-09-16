import { createContext, useContext, useMemo } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import type { Account, OrgMember } from '@ploutizo/types';
import type { ImportDraftRowEvaluation } from '@ploutizo/utils';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { Category } from '@/lib/data-access/categories';
import { getImportDraftRowsCollection } from '@/lib/data-access/imports/getImportDraftRowsCollection';
import { evaluateImportDraftWorkingCopy } from '@/lib/data-access/imports/rederiveImportDraftWorkingCopy';
import { useImportReviewAutosaveFailedRowIds } from '@/lib/data-access/imports/useImportReviewAutosave';
import type { ReactNode } from 'react';

export type ImportReviewAccountsStatus = 'pending' | 'error' | 'success';

interface ImportDraftReviewContextValue {
  draftId: string;
  cardAccountId: string;
  accounts: readonly Account[];
  accountsStatus: ImportReviewAccountsStatus;
  refetchAccounts: () => void;
  categories: Category[];
  orgMembers: OrgMember[];
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  failedRowIds: readonly string[];
  evaluations: Map<string, ImportDraftRowEvaluation> | null;
}

const ImportDraftReviewContext =
  createContext<ImportDraftReviewContextValue | null>(null);

interface ImportDraftReviewProviderProps {
  draftId: string;
  cardAccountId: string;
  accounts: readonly Account[];
  accountsStatus?: ImportReviewAccountsStatus;
  refetchAccounts?: () => void;
  categories: Category[];
  orgMembers: OrgMember[];
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  children: ReactNode;
}

const noopRefetchAccounts = () => {};

export const ImportDraftReviewProvider = ({
  draftId,
  cardAccountId,
  accounts,
  accountsStatus = 'success',
  refetchAccounts = noopRefetchAccounts,
  categories,
  orgMembers,
  updateRow,
  children,
}: ImportDraftReviewProviderProps) => {
  const failedRowIds = useImportReviewAutosaveFailedRowIds(draftId);
  const rowsCollection = useMemo(
    () => getImportDraftRowsCollection(draftId),
    [draftId]
  );
  const liveRows = useLiveQuery(
    (q) => q.from({ row: rowsCollection }),
    [rowsCollection]
  );
  const evaluations = useMemo(
    () => evaluateImportDraftWorkingCopy(draftId),
    [draftId, liveRows.data]
  );
  const value = useMemo(
    () => ({
      draftId,
      cardAccountId,
      accounts,
      accountsStatus,
      refetchAccounts,
      categories,
      orgMembers,
      updateRow,
      failedRowIds,
      evaluations,
    }),
    [
      draftId,
      cardAccountId,
      accounts,
      accountsStatus,
      refetchAccounts,
      categories,
      orgMembers,
      updateRow,
      failedRowIds,
      evaluations,
    ]
  );

  return (
    <ImportDraftReviewContext.Provider value={value}>
      {children}
    </ImportDraftReviewContext.Provider>
  );
};

export const useImportDraftReviewContext = () => {
  const context = useContext(ImportDraftReviewContext);
  if (!context) {
    throw new Error(
      'useImportDraftReviewContext must be used within ImportDraftReviewProvider'
    );
  }
  return context;
};

export const useImportDraftRowEvaluation = (rowId: string) =>
  useImportDraftReviewContext().evaluations?.get(rowId) ?? null;

/** Persist-failure cue — empty outside the review provider (e.g. loading shell). */
export const useImportDraftReviewFailedRowIds = (): readonly string[] =>
  useContext(ImportDraftReviewContext)?.failedRowIds ?? [];
