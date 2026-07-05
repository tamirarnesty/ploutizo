import {
  CalendarDays,
  ChevronsDown,
  ChevronsUp,
  Coins,
  Layers2,
  NotepadText,
  Tag,
  Users,
} from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Checkbox } from '@ploutizo/ui/components/checkbox';
import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header';
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

const columnHeaderIcon = (Icon: typeof CalendarDays) => (
  <Icon aria-hidden="true" />
);

export interface BuildImportReviewColumnsOptions {
  headerChecked: boolean;
  headerIndeterminate: boolean;
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
  headerIndeterminate,
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

  const headerCheckboxLabel = headerIndeterminate
    ? 'Select all rows on this page'
    : headerChecked
      ? 'Deselect all rows on this page'
      : 'Select all rows on this page';

  return [
    {
      id: 'selection',
      enableSorting: false,
      enablePinning: true,
      header: () => (
        <div className="flex items-center gap-1">
          <Checkbox
            aria-label={headerCheckboxLabel}
            checked={headerChecked}
            indeterminate={headerIndeterminate}
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
        headerClassName: 'min-w-22',
        cellClassName: 'min-w-22',
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
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Date"
          icon={columnHeaderIcon(CalendarDays)}
        />
      ),
      enableSorting: false,
      size: 192,
      meta: {
        headerClassName: 'min-w-48',
        cellClassName: 'min-w-48',
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      cell: ({ row }) => <ImportReviewDateCell row={row.original} />,
    },
    {
      id: 'amount',
      accessorKey: 'reviewAmount',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Amount"
          icon={columnHeaderIcon(Coins)}
        />
      ),
      enableSorting: false,
      size: 144,
      meta: {
        headerClassName: 'min-w-36',
        cellClassName: 'min-w-36',
        skeleton: <Skeleton className="ml-auto h-4 w-20" />,
      },
      cell: ({ row }) => <ImportReviewAmountCell row={row.original} />,
    },
    {
      id: 'type',
      accessorKey: 'reviewType',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Type"
          icon={columnHeaderIcon(Layers2)}
        />
      ),
      enableSorting: false,
      size: 160,
      meta: {
        headerClassName: 'min-w-40',
        cellClassName: 'min-w-40',
        skeleton: <Skeleton className="h-4 w-16" />,
      },
      cell: ({ row }) => <ImportReviewTypeCell row={row.original} />,
    },
    {
      id: 'description',
      accessorKey: 'reviewDescription',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Description"
          icon={columnHeaderIcon(NotepadText)}
        />
      ),
      enableSorting: false,
      size: 272,
      meta: {
        grow: true,
        headerClassName: 'min-w-68',
        cellClassName: 'min-w-68',
        skeleton: <Skeleton className="h-4 w-48" />,
      },
      cell: ({ row }) => <ImportReviewDescriptionCell row={row.original} />,
    },
    {
      id: 'category',
      accessorKey: 'reviewCategoryName',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Category"
          icon={columnHeaderIcon(Tag)}
        />
      ),
      enableSorting: false,
      size: 192,
      meta: {
        headerClassName: 'min-w-48',
        cellClassName: 'min-w-48',
        skeleton: <Skeleton className="h-4 w-28" />,
      },
      cell: ({ row }) => <ImportReviewCategoryCell row={row.original} />,
    },
    {
      id: 'assignee',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Assignee"
          icon={columnHeaderIcon(Users)}
        />
      ),
      enableSorting: false,
      size: 224,
      meta: {
        headerClassName: 'min-w-56',
        cellClassName: 'min-w-56',
        skeleton: <Skeleton className="h-4 w-32" />,
      },
      cell: ({ row }) => <ImportReviewAssigneeCell row={row.original} />,
    },
  ];
};
