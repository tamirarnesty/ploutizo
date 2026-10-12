import { createContext, memo, useContext, useMemo } from 'react';
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

export const useOptionalImportReviewRowScope = () =>
  useContext(ImportReviewRowScopeContext);

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
  const scope = useMemo(() => (row ? { rowId, row } : null), [rowId, row]);

  if (!scope) {
    return <>{fallback}</>;
  }

  return (
    <ImportReviewRowScopeContext.Provider value={scope}>
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
}) => {
  const scope = useMemo(() => ({ rowId: row.id, row }), [row]);
  return (
    <ImportReviewRowScopeContext.Provider value={scope}>
      {children}
    </ImportReviewRowScopeContext.Provider>
  );
};
