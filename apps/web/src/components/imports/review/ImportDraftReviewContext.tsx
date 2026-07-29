import { createContext, useContext, useMemo } from 'react';
import type { Account, ImportDraftRow, OrgMember } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { Category } from '@/lib/data-access/categories';
import type { ReactNode } from 'react';

interface ImportDraftReviewContextValue {
  draftId: string;
  accountId: string;
  categories: Category[];
  orgMembers: OrgMember[];
  accounts: Account[];
  billPaymentCategoryId: string | null;
  draftRows: readonly ImportDraftRow[];
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  failedRowIds: readonly string[];
}

const ImportDraftReviewContext =
  createContext<ImportDraftReviewContextValue | null>(null);

interface ImportDraftReviewProviderProps {
  draftId: string;
  accountId: string;
  categories: Category[];
  orgMembers: OrgMember[];
  accounts: Account[];
  billPaymentCategoryId: string | null;
  draftRows: ImportDraftRow[];
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  failedRowIds: string[];
  children: ReactNode;
}

export const ImportDraftReviewProvider = ({
  draftId,
  accountId,
  categories,
  orgMembers,
  accounts,
  billPaymentCategoryId,
  draftRows,
  updateRow,
  failedRowIds,
  children,
}: ImportDraftReviewProviderProps) => {
  const value = useMemo(
    () => ({
      draftId,
      accountId,
      categories,
      orgMembers,
      accounts,
      billPaymentCategoryId,
      draftRows,
      updateRow,
      failedRowIds,
    }),
    [
      draftId,
      accountId,
      categories,
      orgMembers,
      accounts,
      billPaymentCategoryId,
      draftRows,
      updateRow,
      failedRowIds,
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

/** Persist-failure cue — empty outside the review provider (e.g. loading shell). */
export const useImportDraftReviewFailedRowIds = (): readonly string[] =>
  useContext(ImportDraftReviewContext)?.failedRowIds ?? [];
