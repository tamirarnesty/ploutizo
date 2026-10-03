import {
  CalendarDays,
  Coins,
  CreditCard,
  NotepadText,
  Tag,
} from 'lucide-react';
import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import type { TransactionRow } from '@ploutizo/validators';
import { RightAlignedColumnHeader } from '@/components/dashboard/card-balances/RightAlignedColumnHeader';
import { columnHeaderIcon } from '@/components/data-grid/columnHeaderIcon';
import {
  TransactionAccountCell,
  TransactionAmountCell,
  TransactionCategoryCell,
  TransactionDateCell,
  TransactionDescriptionCell,
} from './transactionColumnCells';
import type { ColumnDef } from '@tanstack/react-table';

export type TransactionColumnSortOptions = {
  enableSorting: boolean;
};

export type TransactionDescriptionColumnOptions =
  TransactionColumnSortOptions & {
    onOpenOriginal?: (id: string) => void;
  };

export const createTransactionDateColumn = ({
  enableSorting,
}: TransactionColumnSortOptions): ColumnDef<TransactionRow> => ({
  id: 'date',
  accessorKey: 'date',
  enableSorting,
  header: ({ column }) => (
    <DataGridColumnHeader
      column={column}
      title="Date"
      icon={columnHeaderIcon(CalendarDays)}
    />
  ),
  size: 120,
  meta: {
    headerClassName: 'min-w-[100px]',
    cellClassName: 'min-w-[100px]',
    skeleton: <Skeleton className="h-4 w-20 motion-safe:animate-pulse" />,
  },
  cell: ({ row }) => <TransactionDateCell row={row.original} />,
});

export const createTransactionDescriptionColumn = ({
  enableSorting,
  onOpenOriginal,
}: TransactionDescriptionColumnOptions): ColumnDef<TransactionRow> => ({
  id: 'description',
  enableSorting,
  header: ({ column }) => (
    <DataGridColumnHeader
      column={column}
      title="Description"
      icon={columnHeaderIcon(NotepadText)}
    />
  ),
  size: 200,
  meta: {
    grow: true,
    headerClassName: 'min-w-[200px]',
    cellClassName: 'min-w-[200px]',
    skeleton: <Skeleton className="h-4 w-40 motion-safe:animate-pulse" />,
  },
  cell: ({ row }) => (
    <TransactionDescriptionCell
      row={row.original}
      onOpenOriginal={onOpenOriginal}
    />
  ),
});

export const createTransactionCategoryColumn = ({
  enableSorting,
}: TransactionColumnSortOptions): ColumnDef<TransactionRow> => ({
  id: 'category',
  enableSorting,
  header: ({ column }) => (
    <DataGridColumnHeader
      column={column}
      title="Category"
      icon={columnHeaderIcon(Tag)}
    />
  ),
  size: 160,
  meta: {
    headerClassName: 'min-w-[140px]',
    cellClassName: 'min-w-[140px]',
    skeleton: (
      <Skeleton className="h-5 w-24 rounded-full motion-safe:animate-pulse" />
    ),
  },
  cell: ({ row }) => <TransactionCategoryCell row={row.original} />,
});

export const createTransactionAccountColumn = ({
  enableSorting,
}: TransactionColumnSortOptions): ColumnDef<TransactionRow> => ({
  id: 'account',
  enableSorting,
  header: ({ column }) => (
    <DataGridColumnHeader
      column={column}
      title="Account"
      icon={columnHeaderIcon(CreditCard)}
    />
  ),
  size: 220,
  meta: {
    headerClassName: 'min-w-[180px]',
    cellClassName: 'min-w-[180px]',
    skeleton: <Skeleton className="h-4 w-24 motion-safe:animate-pulse" />,
  },
  cell: ({ row }) => <TransactionAccountCell row={row.original} />,
});

export const createTransactionAmountColumn = ({
  enableSorting,
}: TransactionColumnSortOptions): ColumnDef<TransactionRow> => ({
  id: 'amount',
  accessorKey: 'amount',
  enableSorting,
  header: ({ column }) => (
    <RightAlignedColumnHeader
      column={column}
      title="Amount"
      icon={columnHeaderIcon(Coins)}
    />
  ),
  size: 120,
  meta: {
    headerClassName: 'min-w-[100px]',
    cellClassName: 'min-w-[100px]',
    skeleton: (
      <Skeleton className="ml-auto h-4 w-16 motion-safe:animate-pulse" />
    ),
  },
  cell: ({ row }) => <TransactionAmountCell row={row.original} />,
});

export type CoreTransactionColumnOptions = {
  date: TransactionColumnSortOptions;
  description: TransactionDescriptionColumnOptions;
  category: TransactionColumnSortOptions;
  account: TransactionColumnSortOptions;
  amount: TransactionColumnSortOptions;
};

export const createCoreTransactionColumnDefs = (
  options: CoreTransactionColumnOptions
) => ({
  date: createTransactionDateColumn(options.date),
  description: createTransactionDescriptionColumn(options.description),
  category: createTransactionCategoryColumn(options.category),
  account: createTransactionAccountColumn(options.account),
  amount: createTransactionAmountColumn(options.amount),
});

const recentTransactionSortOff = { enableSorting: false };

const recentTransactionCoreColumns = createCoreTransactionColumnDefs({
  date: recentTransactionSortOff,
  description: recentTransactionSortOff,
  category: recentTransactionSortOff,
  account: recentTransactionSortOff,
  amount: recentTransactionSortOff,
});

export const RECENT_TRANSACTION_COLUMNS: ColumnDef<TransactionRow>[] = [
  recentTransactionCoreColumns.date,
  recentTransactionCoreColumns.description,
  recentTransactionCoreColumns.category,
  recentTransactionCoreColumns.account,
  recentTransactionCoreColumns.amount,
];
