import { ChevronsDown, ChevronsUp } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Checkbox } from '@ploutizo/ui/components/checkbox';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import type { ImportDraftRow } from '@ploutizo/types';
import {
  ImportReviewAmountCell,
  ImportReviewAssigneeCell,
  ImportReviewCategoryCell,
  ImportReviewDateCell,
  ImportReviewDescriptionCell,
  ImportReviewSelectionCell,
  ImportReviewTypeCell,
} from './importReviewCells';
import { ImportDraftReviewRowDetails } from './ImportDraftReviewRowDetails';
import type { ColumnDef } from '@tanstack/react-table';

export interface BuildImportReviewColumnsOptions {
  headerChecked: boolean;
  onHeaderCheckedChange: (checked: boolean) => void;
  onToggleAllExpanded: () => void;
  allRowsExpanded: boolean;
  isLoading: boolean;
  hasSelectableRowsOnPage: boolean;
  onSelectionChange: (row: ImportDraftRow, selected: boolean) => void;
  onExpandedChange: (row: ImportDraftRow, expanded: boolean) => void;
  isRowSelectable: (row: ImportDraftRow) => boolean;
  isRowExpanded: (rowId: string) => boolean;
}

export const buildImportReviewColumns = ({
  headerChecked,
  onHeaderCheckedChange,
  onToggleAllExpanded,
  allRowsExpanded,
  isLoading,
  hasSelectableRowsOnPage,
  onSelectionChange,
  onExpandedChange,
  isRowSelectable,
  isRowExpanded,
}: BuildImportReviewColumnsOptions): ColumnDef<ImportDraftRow>[] => {
  const toggleAllRowsLabel = allRowsExpanded
    ? 'Collapse all rows'
    : 'Expand all rows';

  return [
    {
      id: 'selection',
      enableSorting: false,
      enablePinning: true,
      header: () => (
        <div className="flex items-center gap-1">
          <Checkbox
            aria-label={
              headerChecked
                ? 'Deselect all rows on this page'
                : 'Select all rows on this page'
            }
            checked={headerChecked}
            disabled={isLoading || !hasSelectableRowsOnPage}
            onCheckedChange={(checked) => {
              onHeaderCheckedChange(checked === true);
            }}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isLoading}
                  aria-label={toggleAllRowsLabel}
                  onClick={onToggleAllExpanded}
                />
              }
            >
              {allRowsExpanded ? (
                <ChevronsUp className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronsDown className="size-3.5" aria-hidden="true" />
              )}
            </TooltipTrigger>
            <TooltipContent>{toggleAllRowsLabel}</TooltipContent>
          </Tooltip>
        </div>
      ),
      size: 88,
      meta: {
        headerClassName: 'min-w-[88px]',
        cellClassName: 'min-w-[88px]',
        skeleton: <Skeleton className="h-4 w-4" />,
        expandedContent: (row) => <ImportDraftReviewRowDetails row={row} />,
      },
      cell: ({ row }) => (
        <ImportReviewSelectionCell
          row={row.original}
          expanded={isRowExpanded(row.original.id)}
          selectable={isRowSelectable(row.original)}
          onExpandedChange={(expanded) =>
            onExpandedChange(row.original, expanded)
          }
          onSelectionChange={(selected) =>
            onSelectionChange(row.original, selected)
          }
        />
      ),
    },
    {
      id: 'date',
      accessorKey: 'reviewDate',
      header: 'Date',
      enableSorting: false,
      size: 150,
      meta: {
        headerClassName: 'min-w-[150px]',
        cellClassName: 'min-w-[150px]',
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      cell: ({ row }) => <ImportReviewDateCell row={row.original} />,
    },
    {
      id: 'amount',
      accessorKey: 'reviewAmount',
      header: 'Amount',
      enableSorting: false,
      size: 150,
      meta: {
        headerClassName: 'min-w-[150px]',
        cellClassName: 'min-w-[150px]',
        skeleton: <Skeleton className="ml-auto h-4 w-20" />,
      },
      cell: ({ row }) => <ImportReviewAmountCell row={row.original} />,
    },
    {
      id: 'type',
      accessorKey: 'reviewType',
      header: 'Type',
      enableSorting: false,
      size: 160,
      meta: {
        headerClassName: 'min-w-[160px]',
        cellClassName: 'min-w-[160px]',
        skeleton: <Skeleton className="h-4 w-16" />,
      },
      cell: ({ row }) => <ImportReviewTypeCell row={row.original} />,
    },
    {
      id: 'description',
      accessorKey: 'reviewDescription',
      header: 'Description',
      enableSorting: false,
      size: 300,
      meta: {
        headerClassName: 'min-w-[300px]',
        cellClassName: 'min-w-[300px]',
        skeleton: <Skeleton className="h-4 w-48" />,
      },
      cell: ({ row }) => <ImportReviewDescriptionCell row={row.original} />,
    },
    {
      id: 'category',
      accessorKey: 'reviewCategoryName',
      header: 'Category',
      enableSorting: false,
      size: 220,
      meta: {
        headerClassName: 'min-w-[220px]',
        cellClassName: 'min-w-[220px]',
        skeleton: <Skeleton className="h-4 w-28" />,
      },
      cell: ({ row }) => <ImportReviewCategoryCell row={row.original} />,
    },
    {
      id: 'assignee',
      header: 'Assignee',
      enableSorting: false,
      size: 300,
      meta: {
        headerClassName: 'min-w-[300px]',
        cellClassName: 'min-w-[300px]',
        skeleton: <Skeleton className="h-4 w-32" />,
      },
      cell: ({ row }) => <ImportReviewAssigneeCell row={row.original} />,
    },
  ];
};
