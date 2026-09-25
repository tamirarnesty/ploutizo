import { createContext, memo, useContext } from 'react';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import type { ImportReviewRow } from '@ploutizo/types';
import { useImportReviewRow } from '@/lib/data-access/imports/useImportReviewRow';
import type { ReactNode } from 'react';

interface ImportReviewRowScopeValue {
  rowId: string;
  row: ImportReviewRow;
}

const ImportReviewRowScopeContext =
  createContext<ImportReviewRowScopeValue | null>(null);

export const useImportReviewRowScope = () => {
  const context = useContext(ImportReviewRowScopeContext);
  if (!context) {
    throw new Error(
      'useImportReviewRowScope must be used within ImportReviewRowScope'
    );
  }
  return context;
};

interface ImportReviewRowScopeProps {
  draftId: string;
  rowId: string;
  /** Busts the children memo when this row expands or collapses. */
  expanded?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

const ImportReviewRowScopeInner = ({
  draftId,
  rowId,
  children,
  fallback = <Skeleton className="h-8 w-full" />,
}: ImportReviewRowScopeProps) => {
  const row = useImportReviewRow(draftId, rowId);

  if (!row) {
    return <>{fallback}</>;
  }

  return (
    <ImportReviewRowScopeContext.Provider value={{ rowId, row }}>
      {children}
    </ImportReviewRowScopeContext.Provider>
  );
};

/**
 * Ignore `children` identity so unrelated table re-renders do not remount row cells.
 * Expansion is a prop so expand and collapse still replace the row body.
 */
export const ImportReviewRowScope = memo(
  ImportReviewRowScopeInner,
  (prev, next) =>
    prev.draftId === next.draftId &&
    prev.rowId === next.rowId &&
    prev.expanded === next.expanded
);

ImportReviewRowScope.displayName = 'ImportReviewRowScope';

/** Test/fixture provider when the rows collection is not mounted. */
export const ImportReviewRowScopeFixture = ({
  row,
  children,
}: {
  row: ImportReviewRow;
  children: ReactNode;
}) => (
  <ImportReviewRowScopeContext.Provider value={{ rowId: row.id, row }}>
    {children}
  </ImportReviewRowScopeContext.Provider>
);
