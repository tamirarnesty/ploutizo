import { createContext, useContext } from 'react';
import type { OrgMember } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { Category } from '@/lib/data-access/categories';
import type { ReactNode } from 'react';

interface ImportDraftReviewContextValue {
  draftId: string;
  categories: Category[];
  orgMembers: OrgMember[];
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
}

const ImportDraftReviewContext =
  createContext<ImportDraftReviewContextValue | null>(null);

interface ImportDraftReviewProviderProps {
  draftId: string;
  categories: Category[];
  orgMembers: OrgMember[];
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  children: ReactNode;
}

export const ImportDraftReviewProvider = ({
  draftId,
  categories,
  orgMembers,
  updateRow,
  children,
}: ImportDraftReviewProviderProps) => (
  <ImportDraftReviewContext.Provider
    value={{ draftId, categories, orgMembers, updateRow }}
  >
    {children}
  </ImportDraftReviewContext.Provider>
);

export const useImportDraftReviewContext = () => {
  const context = useContext(ImportDraftReviewContext);
  if (!context) {
    throw new Error(
      'useImportDraftReviewContext must be used within ImportDraftReviewProvider'
    );
  }
  return context;
};
