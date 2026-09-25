import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { Account, OrgMember } from '@ploutizo/types';
import type { ImportDraftRowEvaluation } from '@ploutizo/utils';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { Category } from '@/lib/data-access/categories';
import {
  getImportReviewRowEvaluation,
  subscribeImportReviewEvaluations,
} from '@/lib/data-access/imports/importReviewEvaluations';
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

export const useImportDraftRowEvaluation = (
  rowId: string
): ImportDraftRowEvaluation | null => {
  const { draftId } = useImportDraftReviewContext();
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      subscribeImportReviewEvaluations(draftId, onStoreChange),
    [draftId]
  );
  const getSnapshot = useCallback(
    () => getImportReviewRowEvaluation(draftId, rowId),
    [draftId, rowId]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
