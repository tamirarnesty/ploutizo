import { NotepadText } from 'lucide-react';
import { Badge } from '@ploutizo/ui/components/badge';
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
import {
  formatTransactionAccount,
  formatTransactionAmount,
  formatTransactionDate,
  shouldShowTransactionCategory,
} from './transactionRowDisplay';

export const TransactionDateCell = ({ row }: { row: TransactionRow }) => (
  <Text
    as="span"
    variant="body-sm"
    className="whitespace-nowrap text-muted-foreground"
  >
    {formatTransactionDate(row.date)}
  </Text>
);

export const TransactionDescriptionCell = ({
  row,
  onOpenOriginal,
}: {
  row: TransactionRow;
  onOpenOriginal: (id: string) => void;
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
      {hasRefundLink ? (
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

export const TransactionCategoryCell = ({ row }: { row: TransactionRow }) => {
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

export const TransactionAccountCell = ({ row }: { row: TransactionRow }) => (
  <div className="min-w-0">
    <Text variant="body-sm" className="min-w-0 truncate text-muted-foreground">
      {formatTransactionAccount(row)}
    </Text>
  </div>
);

export const TransactionAmountCell = ({ row }: { row: TransactionRow }) => {
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
