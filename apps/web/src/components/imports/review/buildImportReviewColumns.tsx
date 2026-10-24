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
import { createContext, useContext } from 'react';
import type { DataGridFeatures } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { columnHeaderIcon } from '@/components/data-grid/columnHeaderIcon';
import { ImportDraftReviewRowDetails } from './ImportDraftReviewRowDetails';
import { ImportReviewRowScope } from './ImportReviewRowScope';
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
import type { ReactNode, RefObject } from 'react';
import type { ColumnDef, HeaderContext } from '@tanstack/react-table';

export interface ImportReviewColumnsRuntime {
  headerChecked: boolean;
  headerIndeterminate: boolean;
  onHeaderCheckedChange: (checked: boolean) => void;
  isLoading: boolean;
  hasSelectableRows: boolean;
  onSelectionChange: (rowId: string, selected: boolean) => void;
}

export const ImportReviewColumnsRuntimeContext =
  createContext<ImportReviewColumnsRuntime | null>(null);

const useImportReviewColumnsRuntime = () => {
  const runtime = useContext(ImportReviewColumnsRuntimeContext);
  if (!runtime) {
    throw new Error(
      'Import review column headers must render inside ImportReviewColumnsRuntimeContext'
    );
  }
  return runtime;
};

export interface BuildImportReviewColumnsOptions {
  draftId: string;
  runtimeRef: RefObject<ImportReviewColumnsRuntime>;
}

const ImportReviewSelectionHeader = ({
  column,
  table,
}: HeaderContext<DataGridFeatures, ImportReviewTableRow>) => {
  const {
    headerChecked,
    headerIndeterminate,
    onHeaderCheckedChange,
    isLoading,
    hasSelectableRows,
  } = useImportReviewColumnsRuntime();
  const headerCheckboxLabel = headerChecked
    ? 'Clear ready rows'
    : 'Select ready rows';
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
    <div className="flex items-center gap-2">
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
};

export const buildImportReviewColumns = ({
  draftId,
  runtimeRef,
}: BuildImportReviewColumnsOptions): ColumnDef<
  DataGridFeatures,
  ImportReviewTableRow
>[] => {
  const withRowScope = (
    rowId: string,
    content: ReactNode,
    expanded?: boolean
  ) => (
    <ImportReviewRowScope draftId={draftId} rowId={rowId} expanded={expanded}>
      {content}
    </ImportReviewRowScope>
  );

  return [
    {
      id: 'selection',
      enableSorting: true,
      enablePinning: true,
      header: ImportReviewSelectionHeader,
      size: 112,
      meta: {
        headerClassName: 'min-w-28',
        cellClassName: 'min-w-28',
        skeleton: <Skeleton className="h-4 w-4" />,
        expandedContent: (row) =>
          withRowScope(row.id, <ImportDraftReviewRowDetails />),
      },
      cell: ({ row }) =>
        withRowScope(
          row.original.id,
          <ImportReviewSelectionCell
            draftId={draftId}
            rowId={row.original.id}
            expanded={row.getIsExpanded()}
            onExpandedChange={(expanded) => row.toggleExpanded(expanded)}
            onSelectionChange={(selected) =>
              runtimeRef.current.onSelectionChange(row.original.id, selected)
            }
          />,
          row.getIsExpanded()
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
      size: 192,
      meta: {
        headerClassName: 'min-w-48',
        cellClassName: 'min-w-48',
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      cell: ({ row }) =>
        withRowScope(row.original.id, <ImportReviewDateCell />),
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
      size: 144,
      meta: {
        headerClassName: 'min-w-36',
        cellClassName: 'min-w-36',
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      cell: ({ row }) =>
        withRowScope(row.original.id, <ImportReviewAmountCell />),
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
      size: 160,
      meta: {
        headerClassName: 'min-w-40',
        cellClassName: 'min-w-40',
        skeleton: <Skeleton className="h-4 w-16" />,
      },
      cell: ({ row }) =>
        withRowScope(row.original.id, <ImportReviewTypeCell />),
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
      size: 272,
      meta: {
        fillWidth: true,
        headerClassName: 'min-w-68',
        cellClassName: 'min-w-68',
        skeleton: <Skeleton className="h-4 w-48" />,
      },
      cell: ({ row }) =>
        withRowScope(row.original.id, <ImportReviewDescriptionCell />),
    },
    {
      id: 'category',
      accessorKey: 'reviewCategoryId',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Category / Paid from"
          icon={columnHeaderIcon(Tag)}
        />
      ),
      size: 192,
      meta: {
        headerClassName: 'min-w-48',
        cellClassName: 'min-w-48',
        skeleton: <Skeleton className="h-4 w-28" />,
      },
      cell: ({ row }) =>
        withRowScope(row.original.id, <ImportReviewCategoryOrPaidFromCell />),
    },
    {
      id: 'assignee',
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Assignee / Pay toward"
          icon={columnHeaderIcon(Users)}
        />
      ),
      size: 224,
      meta: {
        headerClassName: 'min-w-56',
        cellClassName: 'min-w-56',
        skeleton: <Skeleton className="h-4 w-32" />,
      },
      cell: ({ row }) =>
        withRowScope(row.original.id, <ImportReviewAssigneeCell />),
    },
  ];
};
