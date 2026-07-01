import { useMemo } from 'react';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { Checkbox } from '@ploutizo/ui/components/checkbox';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportDraft, ImportDraftRow } from '@ploutizo/types';
import { useGetCategories } from '@/lib/data-access/categories';
import { useUpdateImportDraftRow } from '@/lib/data-access/imports';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { PendingInputFlushProvider } from '@/lib/money/pending-input-flush';
import { formatDraftAccountLabel } from './importPresentation';
import {
  canContinueImportReview,
  getSelectableImportRows,
  getSelectedImportRows,
  isImportRowSelectable,
} from './importRowSelection';
import { ImportDraftReviewRow } from './ImportDraftReviewRow';

interface ImportDraftReviewProps {
  draft?: ImportDraft;
  isLoading?: boolean;
}

const ImportDraftReviewRowsSkeleton = () => (
  <>
    {Array.from({ length: 3 }, (_, i) => (
      <tr key={i} className="border-b border-border last:border-b-0">
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-4" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-6 w-16 rounded-full" />
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
          <Skeleton className="h-4 w-28" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-32" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-24" />
        </td>
      </tr>
    ))}
  </>
);

export const ImportDraftReview = ({
  draft,
  isLoading = false,
}: ImportDraftReviewProps) => {
  const updateRow = useUpdateImportDraftRow();
  const { data: categories = [] } = useGetCategories();
  const { data: orgMembers = [] } = useGetOrgMembers();
  const rows = draft?.rows ?? [];
  const selectableRows = useMemo(() => getSelectableImportRows(rows), [rows]);
  const selectedRows = useMemo(() => getSelectedImportRows(rows), [rows]);
  const selectedCount = selectedRows.length;
  const canContinue = draft ? canContinueImportReview(rows) : false;

  const headerChecked =
    selectableRows.length > 0 &&
    selectableRows.every((row) => row.selectedForImport);

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
    for (const row of selectableRows) {
      if (row.selectedForImport === selectedForImport) continue;
      updateRow.mutate({
        draftId: draft.id,
        rowId: row.id,
        body: { selectedForImport },
      });
    }
  };

  const continueLabel =
    selectedCount === 0
      ? 'Select rows to continue'
      : `Continue with ${selectedCount} selected`;

  return (
    <PendingInputFlushProvider>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {draft ? (
              <>
                <Text as="h2" variant="h3" className="truncate">
                  {formatDraftAccountLabel(draft)}
                </Text>
                <Text
                  variant="body-sm"
                  className="truncate text-muted-foreground"
                >
                  {draft.fileName ?? 'Untitled CSV'}
                </Text>
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {draft ? (
              <>
                <Badge variant="outline">
                  {draft.validRowCount} reviewable
                </Badge>
                {draft.invalidRowCount > 0 ? (
                  <Badge variant="destructive">
                    {draft.invalidRowCount} invalid
                  </Badge>
                ) : null}
                <Button disabled={!canContinue}>{continueLabel}</Button>
              </>
            ) : (
              <>
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-9 w-44" />
              </>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="w-12 px-3 py-2 font-medium">
                    <Checkbox
                      aria-label={
                        headerChecked ? 'Deselect all rows' : 'Select all rows'
                      }
                      checked={headerChecked}
                      disabled={
                        isLoading || !draft || selectableRows.length === 0
                      }
                      onCheckedChange={(checked) => {
                        setAllSelection(checked === true);
                      }}
                    />
                  </th>
                  <th className="w-32 px-3 py-2 font-medium">Status</th>
                  <th className="w-28 px-3 py-2 font-medium">Date</th>
                  <th className="w-32 px-3 py-2 font-medium">Amount</th>
                  <th className="w-28 px-3 py-2 font-medium">Type</th>
                  <th className="min-w-[220px] px-3 py-2 font-medium">
                    Description
                  </th>
                  <th className="w-40 px-3 py-2 font-medium">Category</th>
                  <th className="min-w-[240px] px-3 py-2 font-medium">
                    Assignee
                  </th>
                  <th className="w-44 px-3 py-2 font-medium">Notes</th>
                  <th className="min-w-[220px] px-3 py-2 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {isLoading || !draft ? (
                  <ImportDraftReviewRowsSkeleton />
                ) : (
                  draft.rows.map((row) => (
                    <ImportDraftReviewRow
                      key={row.id}
                      draftId={draft.id}
                      row={row}
                      categories={categories}
                      orgMembers={orgMembers}
                      selectable={isImportRowSelectable(row)}
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
      </section>
    </PendingInputFlushProvider>
  );
};
