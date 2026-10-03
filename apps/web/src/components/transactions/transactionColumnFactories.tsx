import {
  CalendarDays,
  Coins,
  CreditCard,
  NotepadText,
  Tag,
} from 'lucide-react';
import { Badge } from '@ploutizo/ui/components/badge';
import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { cn } from '@ploutizo/ui/lib/utils';
import { formatCurrency } from '@ploutizo/utils/currency';
import type { TransactionRow } from '@ploutizo/validators';
import { CachedLucideIcon } from '@/components/categories/CachedLucideIcon';
import { colourTokenBadgeStyle } from '@/components/colour/colour-token-style';
import { RightAlignedColumnHeader } from '@/components/dashboard/card-balances/RightAlignedColumnHeader';
import { columnHeaderIcon } from '@/components/data-grid/columnHeaderIcon';
import {
  formatTransactionAccount,
  formatTransactionAmount,
  formatTransactionDate,
  shouldShowTransactionCategory,
} from './transactionRowDisplay';
import type { ColumnDef } from '@tanstack/react-table';

export type TransactionColumnSortOptions = {
  enableSorting: boolean;
};

export type TransactionDescriptionColumnOptions =
  TransactionColumnSortOptions & {
    onOpenOriginal?: (id: string) => void;
  };

const TransactionDateCell = ({ row }: { row: TransactionRow }) => (
  <Text
    as="span"
    variant="body-sm"
    className="whitespace-nowrap text-muted-foreground"
  >
    {formatTransactionDate(row.date)}
  </Text>
);

const TransactionDescriptionCell = ({
  row,
  onOpenOriginal,
}: {
  row: TransactionRow;
  onOpenOriginal?: (id: string) => void;
}) => {
  const {
    description,
    notes,
    type,
    refundOfId,
    refundOfDate,
    refundOfAmountCents,
  } = row;
  const hasRefundLink = type === 'refund' && refundOfId !== null;

  const formattedRefundDate =
    hasRefundLink && refundOfDate ? formatTransactionDate(refundOfDate) : null;

  const notePreview = notes
    ? notes.length > 80
      ? notes.slice(0, 80) + '…'
      : notes
    : null;

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <Text
          as="span"
          variant="body-sm"
          className="min-w-0 truncate font-semibold"
        >
          {description}
        </Text>
        {notePreview ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="shrink-0 cursor-default text-muted-foreground hover:text-foreground" />
              }
              aria-label="Has note"
            >
              <NotepadText className="size-3.5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>{notePreview}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {hasRefundLink && onOpenOriginal ? (
        <button
          type="button"
          className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => onOpenOriginal(refundOfId)}
          aria-label={`View original transaction from ${formattedRefundDate}`}
        >
          <span aria-hidden="true">↩</span>
          <span>
            {formattedRefundDate} · {formatCurrency(refundOfAmountCents ?? 0)}
          </span>
        </button>
      ) : null}
    </div>
  );
};

const TransactionCategoryCell = ({ row }: { row: TransactionRow }) => {
  const { categoryName, categoryIcon, categoryColour } = row;
  const showCategory = shouldShowTransactionCategory(row);
  return showCategory ? (
    <Badge
      variant="outline"
      className="gap-1 px-1.5 py-0.5 text-xs font-normal"
      style={categoryColour ? colourTokenBadgeStyle(categoryColour) : undefined}
    >
      <CachedLucideIcon name={categoryIcon} size={12} />
      <span className="min-w-0 truncate">{categoryName}</span>
    </Badge>
  ) : (
    <Text as="span" variant="caption">
      —
    </Text>
  );
};

const TransactionAccountCell = ({ row }: { row: TransactionRow }) => (
  <div className="min-w-0">
    <Text variant="body-sm" className="min-w-0 truncate text-muted-foreground">
      {formatTransactionAccount(row)}
    </Text>
  </div>
);

const TransactionAmountCell = ({ row }: { row: TransactionRow }) => {
  const { displayValue, colorClass } = formatTransactionAmount(row);
  return (
    <Text
      variant="body-sm"
      className={cn(
        'block text-right font-medium whitespace-nowrap',
        colorClass
      )}
    >
      {displayValue}
    </Text>
  );
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
