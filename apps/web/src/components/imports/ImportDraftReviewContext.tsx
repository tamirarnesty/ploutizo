import { createContext, useContext, useMemo } from 'react';
import type { OrgMember } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { Category } from '@/lib/data-access/categories';
import type { ReactNode } from 'react';

interface ImportDraftReviewContextValue {
  draftId: string;
  categories: Category[];
  orgMembers: OrgMember[];
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  failedRowIds: readonly string[];
}

const ImportDraftReviewContext =
  createContext<ImportDraftReviewContextValue | null>(null);

interface ImportDraftReviewProviderProps {
  draftId: string;
  categories: Category[];
  orgMembers: OrgMember[];
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  failedRowIds: string[];
  children: ReactNode;
}

export const ImportDraftReviewProvider = ({
  draftId,
  categories,
  orgMembers,
  updateRow,
  failedRowIds,
  children,
}: ImportDraftReviewProviderProps) => {
  const value = useMemo(
    () => ({
      draftId,
      categories,
      orgMembers,
      updateRow,
      failedRowIds,
    }),
    [draftId, categories, orgMembers, updateRow, failedRowIds]
  );

  return (
    <ImportDraftReviewContext.Provider value={value}>
      <div className="flex max-h-full min-h-0 w-full min-w-0 flex-col">
        {children}
      </div>
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
