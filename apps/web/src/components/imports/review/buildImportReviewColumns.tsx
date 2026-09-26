import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronsDown,
  ChevronsUp,
  ChevronsUpDown,
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
import { ImportDraftReviewRowDetails } from './ImportDraftReviewRowDetails';
import {
  ImportReviewAmountCell,
  ImportReviewAssigneeCell,
  ImportReviewCategoryOrPaidFromCell,
  ImportReviewDateCell,
  ImportReviewDescriptionCell,
  ImportReviewSelectionCell,
  ImportReviewTypeCell,
} from './importReviewCells';
import type { ImportReviewTableRow } from './useStableImportReviewTableRows';
import type { ColumnDef } from '@tanstack/react-table';

const columnHeaderIcon = (Icon: typeof CalendarDays) => (
  <Icon aria-hidden="true" />
);

export interface BuildImportReviewColumnsOptions {
  draftId: string;
  headerChecked: boolean;
  headerIndeterminate: boolean;
  onHeaderCheckedChange: (checked: boolean) => void;
  isLoading: boolean;
  hasSelectableRows: boolean;
  onSelectionChange: (rowId: string, selected: boolean) => void;
}

export const buildImportReviewColumns = ({
  draftId,
  headerChecked,
  headerIndeterminate,
  onHeaderCheckedChange,
  isLoading,
  hasSelectableRows,
  onSelectionChange,
}: BuildImportReviewColumnsOptions): ColumnDef<ImportReviewTableRow>[] => {
  const headerCheckboxLabel = headerChecked
    ? 'Clear ready rows'
    : 'Select ready rows';

  return [
    {
      id: 'selection',
      enableSorting: true,
      enablePinning: true,
      header: ({ column, table }) => {
        const allRowsExpanded = table.getIsAllRowsExpanded();
        const toggleAllRowsLabel = allRowsExpanded
          ? 'Collapse all rows'
          : 'Expand all rows';
        const statusSort = column.getIsSorted();
        const statusSortLabel =
          statusSort === 'asc'
            ? 'Ready first'
            : statusSort === 'desc'
              ? 'Clear sort'
              : 'Needs attention first';
        const cycleStatusSort = () => {
          if (statusSort === 'asc') {
            column.toggleSorting(true);
          } else if (statusSort === 'desc') {
            column.clearSorting();
          } else {
            column.toggleSorting(false);
          }
        };

        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Checkbox
                    aria-label={headerCheckboxLabel}
                    checked={headerChecked}
                    indeterminate={headerIndeterminate}
                    disabled={isLoading || !hasSelectableRows}
                    onCheckedChange={(checked) => {
                      onHeaderCheckedChange(checked === true);
                    }}
                  />
                }
              />
              <TooltipContent>{headerCheckboxLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={isLoading}
                    aria-label={statusSortLabel}
                    onClick={cycleStatusSort}
                  />
                }
              >
                {statusSort === 'desc' ? (
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                ) : statusSort === 'asc' ? (
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                ) : (
                  <ChevronsUpDown className="size-3.5" aria-hidden="true" />
                )}
              </TooltipTrigger>
              <TooltipContent>{statusSortLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={isLoading}
                    aria-label={toggleAllRowsLabel}
                    onClick={table.getToggleAllRowsExpandedHandler()}
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
        );
      },
      size: 112,
      meta: {
        headerClassName: 'min-w-28',
        cellClassName: 'min-w-28',
        skeleton: <Skeleton className="h-4 w-4" />,
        expandedContent: () => <ImportDraftReviewRowDetails />,
      },
      cell: ({ row }) => (
        <ImportReviewSelectionCell
          draftId={draftId}
          rowId={row.original.id}
          expanded={row.getIsExpanded()}
          onExpandedChange={(expanded) => row.toggleExpanded(expanded)}
          onSelectionChange={(selected) =>
            onSelectionChange(row.original.id, selected)
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
          ascendingLabel="Oldest first"
          descendingLabel="Newest first"
        />
      ),
      size: 192,
      meta: {
        headerClassName: 'min-w-48',
        cellClassName: 'min-w-48',
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      cell: () => <ImportReviewDateCell />,
    },
    {
      id: 'amount',
      accessorKey: 'reviewAmount',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Amount"
          icon={columnHeaderIcon(Coins)}
          ascendingLabel="Smallest first"
          descendingLabel="Largest first"
        />
      ),
      size: 144,
      meta: {
        headerClassName: 'min-w-36',
        cellClassName: 'min-w-36',
        skeleton: <Skeleton className="ml-auto h-4 w-20" />,
      },
      cell: () => <ImportReviewAmountCell />,
    },
    {
      id: 'type',
      accessorKey: 'reviewType',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Type"
          icon={columnHeaderIcon(Layers2)}
          ascendingLabel="A to Z"
          descendingLabel="Z to A"
        />
      ),
      size: 160,
      meta: {
        headerClassName: 'min-w-40',
        cellClassName: 'min-w-40',
        skeleton: <Skeleton className="h-4 w-16" />,
      },
      cell: () => <ImportReviewTypeCell />,
    },
    {
      id: 'description',
      accessorKey: 'reviewDescription',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Description"
          icon={columnHeaderIcon(NotepadText)}
          ascendingLabel="A to Z"
          descendingLabel="Z to A"
        />
      ),
      size: 272,
      meta: {
        grow: true,
        headerClassName: 'min-w-68',
        cellClassName: 'min-w-68',
        skeleton: <Skeleton className="h-4 w-48" />,
      },
      cell: () => <ImportReviewDescriptionCell />,
    },
    {
      id: 'category',
      accessorKey: 'reviewCategoryId',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Category / Paid from"
          icon={columnHeaderIcon(Tag)}
          ascendingLabel="A to Z"
          descendingLabel="Z to A"
        />
      ),
      size: 192,
      meta: {
        headerClassName: 'min-w-48',
        cellClassName: 'min-w-48',
        skeleton: <Skeleton className="h-4 w-28" />,
      },
      cell: () => <ImportReviewCategoryOrPaidFromCell />,
    },
    {
      id: 'assignee',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Assignee / Pay toward"
          icon={columnHeaderIcon(Users)}
          ascendingLabel="A to Z"
          descendingLabel="Z to A"
        />
      ),
      size: 224,
      meta: {
        headerClassName: 'min-w-56',
        cellClassName: 'min-w-56',
        skeleton: <Skeleton className="h-4 w-32" />,
      },
      cell: () => <ImportReviewAssigneeCell />,
    },
  ];
};
