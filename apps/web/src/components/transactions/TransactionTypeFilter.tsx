import {
  ToggleGroup,
  ToggleGroupItem,
} from '@ploutizo/ui/components/toggle-group';
import { singleSelectToggle } from '@/lib/single-select-toggle';

export type TransactionTypeSegment = 'all' | 'income' | 'expense';

const TYPE_SEGMENTS: TransactionTypeSegment[] = ['all', 'income', 'expense'];

const isTypeSegment = (value: string): value is TransactionTypeSegment =>
  TYPE_SEGMENTS.some((segment) => segment === value);

const SEGMENT_LABELS: Record<TransactionTypeSegment, string> = {
  all: 'All',
  income: 'Income',
  expense: 'Expense',
};

type TransactionTypeFilterProps = {
  /** Currently pressed segment; empty array renders when the URL holds a non-quick type. */
  value: TransactionTypeSegment[];
  onSelect: (segment: TransactionTypeSegment) => void;
};

/** Quick type filter — positive match only; other types and operators live in the Filters panel. */
export const TransactionTypeFilter = ({
  value,
  onSelect,
}: TransactionTypeFilterProps) => (
  <ToggleGroup
    variant="outline"
    size="sm"
    spacing={0}
    value={value}
    onValueChange={singleSelectToggle(isTypeSegment, onSelect)}
  >
    {TYPE_SEGMENTS.map((segment) => (
      <ToggleGroupItem key={segment} value={segment} className="px-2.5 text-xs">
        {SEGMENT_LABELS[segment]}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);
