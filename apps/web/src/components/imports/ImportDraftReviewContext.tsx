import { createContext, useContext } from 'react';
import type { OrgMember } from '@ploutizo/types';
import type { Category } from '@/lib/data-access/categories';
import type { ReactNode } from 'react';

interface ImportDraftReviewContextValue {
  draftId: string;
  categories: Category[];
  orgMembers: OrgMember[];
}

const ImportDraftReviewContext =
  createContext<ImportDraftReviewContextValue | null>(null);

interface ImportDraftReviewProviderProps {
  draftId: string;
  categories: Category[];
  orgMembers: OrgMember[];
  children: ReactNode;
}

export const ImportDraftReviewProvider = ({
  draftId,
  categories,
  orgMembers,
  children,
}: ImportDraftReviewProviderProps) => (
  <ImportDraftReviewContext.Provider
    value={{ draftId, categories, orgMembers }}
  >
    <div className="flex max-h-full min-h-0 w-full min-w-0 flex-col">
      {children}
    </div>
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
