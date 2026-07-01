import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Inbox,
} from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Checkbox } from '@ploutizo/ui/components/checkbox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import type { ImportDraft, ImportDraftRow } from '@ploutizo/types';
import { IMPORT_REVIEW_PAGE_SIZE_OPTIONS } from '@/lib/prefs';
import { usePersistedPageSize } from '@/hooks/persistedPageSize';
import { useGetCategories } from '@/lib/data-access/categories';
import { useUpdateImportDraftRow } from '@/lib/data-access/imports';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { PendingInputFlushProvider } from '@/lib/money/pending-input-flush';
import {
  formatDraftAccountLabel,
  formatImportDraftReviewSubtitle,
  shouldDefaultExpandImportRow,
} from './importPresentation';
import {
  canContinueImportReview,
  getImportReviewContinueBlocker,
  getSelectableImportRows,
  isImportRowSelectable,
} from './importRowSelection';
import { ImportDraftReviewRow } from './ImportDraftReviewRow';

interface ImportDraftReviewProps {
  draft?: ImportDraft;
  isLoading?: boolean;
}

const HEADER_CELL_CLASSNAME =
  'sticky top-0 z-10 bg-muted px-3 py-2 font-medium';
const STICKY_HEADER_CELL_CLASSNAME =
  'sticky top-0 left-0 z-20 w-[88px] min-w-[88px] bg-muted px-2 py-2 font-medium shadow-[1px_0_0_var(--border)]';

const getImportReviewPageInfo = (
  rowCount: number,
  pageIndex: number,
  pageSize: number
) => {
  if (rowCount === 0) {
    return { from: 0, to: 0, pageCount: 1 };
  }

  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, rowCount);
  return { from, to, pageCount };
};

const ImportDraftReviewRowsSkeleton = () => (
  <>
    {Array.from({ length: 3 }, (_, i) => (
      <tr key={i} className="border-b border-border last:border-b-0">
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-4" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-20" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="ml-auto h-4 w-20" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-16" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-48" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-28" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-32" />
        </td>
      </tr>
    ))}
  </>
);

const getEmptyDraftDescription = (draft: ImportDraft): string => {
  if (draft.rows.length === 0) {
    return 'This import draft has no transactions to review.';
  }

  const parts = ['Every row in this draft is invalid or skipped.'];
  if (draft.invalidRowCount > 0) {
    parts.push(
      draft.invalidRowCount === 1
        ? '1 row is invalid.'
        : `${draft.invalidRowCount} rows are invalid.`
    );
  }
  return parts.join(' ');
};

interface ImportReviewPaginationProps {
  rowCount: number;
  pageIndex: number;
  pageSize: number;
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const ImportReviewPagination = ({
  rowCount,
  pageIndex,
  pageSize,
  onPageIndexChange,
  onPageSizeChange,
}: ImportReviewPaginationProps) => {
  const { from, to, pageCount } = getImportReviewPageInfo(
    rowCount,
    pageIndex,
    pageSize
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page</span>
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="w-16" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top" className="min-w-20">
            {IMPORT_REVIEW_PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Text variant="body-sm" className="text-muted-foreground">
          {from} - {to} of {rowCount}
        </Text>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={pageIndex === 0}
            onClick={() => onPageIndexChange(pageIndex - 1)}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Text variant="body-sm" className="min-w-14 text-center">
            {pageIndex + 1} / {pageCount}
          </Text>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => onPageIndexChange(pageIndex + 1)}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ImportDraftReview = ({
  draft,
  isLoading = false,
}: ImportDraftReviewProps) => {
  const updateRow = useUpdateImportDraftRow();
  const { pagination, setPagination } = usePersistedPageSize('import-review');
  const initializedExpansionDraftIdRef = useRef<string | null>(null);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(
    () => new Set()
  );
  const { data: categories = [] } = useGetCategories();
  const { data: orgMembers = [] } = useGetOrgMembers();
  const rows = draft?.rows ?? [];
  const selectableRows = useMemo(() => getSelectableImportRows(rows), [rows]);
  const defaultExpandedRowIds = useMemo(
    () =>
      new Set(
        rows
          .filter((row) => shouldDefaultExpandImportRow(row))
          .map((row) => row.id)
      ),
    [rows]
  );
  const { pageIndex, pageSize } = pagination;
  const { pageCount } = getImportReviewPageInfo(
    rows.length,
    pageIndex,
    pageSize
  );
  const currentPageRows = useMemo(
    () => rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [pageIndex, pageSize, rows]
  );
  const currentPageSelectableRows = useMemo(
    () => getSelectableImportRows(currentPageRows),
    [currentPageRows]
  );
  const canContinue = draft ? canContinueImportReview(rows) : false;
  const continueBlocker = draft ? getImportReviewContinueBlocker(rows) : null;
  const hasReviewableRows = selectableRows.length > 0;

  useEffect(() => {
    if (pageIndex <= pageCount - 1) return;
    setPagination({ pageIndex: pageCount - 1, pageSize });
  }, [pageCount, pageIndex, pageSize, setPagination]);

  useEffect(() => {
    if (!draft) return;
    if (initializedExpansionDraftIdRef.current !== draft.id) {
      initializedExpansionDraftIdRef.current = draft.id;
      setExpandedRowIds(defaultExpandedRowIds);
      return;
    }

    const rowIds = new Set(rows.map((row) => row.id));
    setExpandedRowIds(
      (current) => new Set([...current].filter((id) => rowIds.has(id)))
    );
  }, [defaultExpandedRowIds, draft, rows]);

  const headerChecked =
    currentPageSelectableRows.length > 0 &&
    currentPageSelectableRows.every((row) => row.selectedForImport);

  const setRowSelection = (row: ImportDraftRow, selectedForImport: boolean) => {
    if (!draft || row.selectedForImport === selectedForImport) return;
    updateRow.mutate({
      draftId: draft.id,
      rowId: row.id,
      body: { selectedForImport },
    });
  };

  const setAllSelection = (selectedForImport: boolean) => {
    if (!draft) return;
    for (const row of currentPageSelectableRows) {
      if (row.selectedForImport === selectedForImport) continue;
      updateRow.mutate({
        draftId: draft.id,
        rowId: row.id,
        body: { selectedForImport },
      });
    }
  };

  const continueButton = <Button disabled={!canContinue}>Continue</Button>;

  const setPageIndex = (nextPageIndex: number) => {
    setPagination({ pageIndex: nextPageIndex, pageSize });
  };

  const setPageSize = (nextPageSize: number) => {
    setPagination({ pageIndex: 0, pageSize: nextPageSize });
  };

  const setRowExpanded = (rowId: string, expanded: boolean) => {
    setExpandedRowIds((current) => {
      const next = new Set(current);
      if (expanded) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  };

  const expandAllRows = () => {
    setExpandedRowIds(new Set(rows.map((row) => row.id)));
  };

  const collapseAllRows = () => {
    setExpandedRowIds(new Set());
  };

  const allRowsExpanded =
    rows.length > 0 && rows.every((row) => expandedRowIds.has(row.id));
  const toggleAllRowsLabel = allRowsExpanded
    ? 'Collapse all rows'
    : 'Expand all rows';

  return (
    <PendingInputFlushProvider>
      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {draft ? (
              <>
                <Text as="h2" variant="h3" className="truncate">
                  {formatDraftAccountLabel(draft)}
                </Text>
                <Text
                  variant="body-sm"
                  className="truncate text-muted-foreground"
                >
                  {formatImportDraftReviewSubtitle(draft)}
                </Text>
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-56" />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {draft ? (
              continueBlocker ? (
                <Tooltip>
                  <TooltipTrigger render={continueButton} />
                  <TooltipContent>{continueBlocker}</TooltipContent>
                </Tooltip>
              ) : (
                continueButton
              )
            ) : (
              <Skeleton className="h-9 w-24" />
            )}
            {draft && continueBlocker ? (
              <Text
                variant="body-sm"
                className="max-w-sm text-right text-muted-foreground"
              >
                {continueBlocker}
              </Text>
            ) : null}
          </div>
        </div>

        {!isLoading && draft && !hasReviewableRows ? (
          <Empty className="min-h-[280px] border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>No transactions to review</EmptyTitle>
              <EmptyDescription>
                {getEmptyDraftDescription(draft)}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-md border border-border">
              <div className="max-h-[640px] overflow-auto">
                <table className="w-full min-w-[1368px] text-left text-sm">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <th className={STICKY_HEADER_CELL_CLASSNAME}>
                        <div className="flex items-center gap-1">
                          <Checkbox
                            aria-label={
                              headerChecked
                                ? 'Deselect all rows on this page'
                                : 'Select all rows on this page'
                            }
                            checked={headerChecked}
                            disabled={
                              isLoading ||
                              !draft ||
                              currentPageSelectableRows.length === 0
                            }
                            onCheckedChange={(checked) => {
                              setAllSelection(checked === true);
                            }}
                          />
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={rows.length === 0}
                                  aria-label={toggleAllRowsLabel}
                                  onClick={() => {
                                    if (allRowsExpanded) {
                                      collapseAllRows();
                                      return;
                                    }
                                    expandAllRows();
                                  }}
                                />
                              }
                            >
                              {allRowsExpanded ? (
                                <ChevronsUp
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              ) : (
                                <ChevronsDown
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {toggleAllRowsLabel}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                      <th className={`${HEADER_CELL_CLASSNAME} w-[150px]`}>
                        Date
                      </th>
                      <th className={`${HEADER_CELL_CLASSNAME} w-[150px]`}>
                        Amount
                      </th>
                      <th className={`${HEADER_CELL_CLASSNAME} w-[160px]`}>
                        Type
                      </th>
                      <th className={`${HEADER_CELL_CLASSNAME} w-[300px]`}>
                        Description
                      </th>
                      <th className={`${HEADER_CELL_CLASSNAME} w-[220px]`}>
                        Category
                      </th>
                      <th className={`${HEADER_CELL_CLASSNAME} w-[300px]`}>
                        Assignee
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading || !draft ? (
                      <ImportDraftReviewRowsSkeleton />
                    ) : (
                      currentPageRows.map((row) => (
                        <ImportDraftReviewRow
                          key={row.id}
                          draftId={draft.id}
                          row={row}
                          categories={categories}
                          orgMembers={orgMembers}
                          selectable={isImportRowSelectable(row)}
                          expanded={expandedRowIds.has(row.id)}
                          onExpandedChange={(expanded) =>
                            setRowExpanded(row.id, expanded)
                          }
                          onSelectionChange={(selectedForImport) =>
                            setRowSelection(row, selectedForImport)
                          }
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <ImportReviewPagination
              rowCount={rows.length}
              pageIndex={pageIndex}
              pageSize={pageSize}
              onPageIndexChange={setPageIndex}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </section>
    </PendingInputFlushProvider>
  );
};
