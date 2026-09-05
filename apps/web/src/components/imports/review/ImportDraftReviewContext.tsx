import { createContext, useContext, useMemo } from 'react';
import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import type { ImportDraftRowEvaluation } from '@ploutizo/utils';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { Category } from '@/lib/data-access/categories';
import { evaluateImportDraftWorkingCopy } from '@/lib/data-access/imports/rederiveImportDraftWorkingCopy';
import type { ReactNode } from 'react';

interface ImportDraftReviewContextValue {
  draftId: string;
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
  rows: readonly ImportDraftRow[];
  categories: Category[];
  orgMembers: OrgMember[];
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  failedRowIds: string[];
  children: ReactNode;
}

export const ImportDraftReviewProvider = ({
  draftId,
  rows,
  categories,
  orgMembers,
  updateRow,
  failedRowIds,
  children,
}: ImportDraftReviewProviderProps) => {
  const evaluations = useMemo(
    () => evaluateImportDraftWorkingCopy(draftId, rows),
    [draftId, rows]
  );
  const value = useMemo(
    () => ({
      draftId,
      categories,
      orgMembers,
      updateRow,
      failedRowIds,
      evaluations,
    }),
    [draftId, categories, orgMembers, updateRow, failedRowIds, evaluations]
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
