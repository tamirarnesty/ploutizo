import { Layers2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Calendar } from '@ploutizo/ui/components/calendar';
import {
  DateRangePicker,
  DateRangePickerApply,
  DateRangePickerCalendar,
  DateRangePickerCancel,
  DateRangePickerContent,
  DateRangePickerFooter,
  DateRangePickerTrigger,
  useDateRangePicker,
} from '@ploutizo/ui/components/date-range-picker';
import { format } from 'date-fns';
import { memberFullLabel } from '@ploutizo/utils';
import type { FilterFieldConfig } from '@ploutizo/ui/components/reui/filters';

const SINGLE_DATE_OPS = new Set(['is', 'is_not', 'before', 'after']);
const RANGE_OPS = new Set(['between', 'not_between']);

const isSingleDateOp = (op: string): boolean => {
  return SINGLE_DATE_OPS.has(op);
};
const isRangeOp = (op: string): boolean => {
  return RANGE_OPS.has(op);
};

// State migration rules when switching operators:
// single→range:      [A]    → [A, '']
// range→single:      [A, B] → [A]
// same family (e.g. is↔is_not, between↔not_between): values unchanged
const migrateValues = (
  prevOp: string,
  nextOp: string,
  values: string[]
): string[] => {
  const prevIsRange = isRangeOp(prevOp);
  const nextIsRange = isRangeOp(nextOp);
  if (prevIsRange === nextIsRange) return values; // same family — keep values
  if (!prevIsRange && nextIsRange) return [values[0] ?? '', '']; // single → range
  return [values[0] ?? '']; // range → single
};

interface DateRangeFilterRendererProps {
  values: string[];
  onChange: (values: string[]) => void;
  operator: string;
}

const formatFilterDate = (date: Date) => format(date, 'MMM d, yyyy');

// Shows the in-popover selection while open, and the committed filter otherwise.
const DateFilterLabel = ({ operator }: { operator: string }) => {
  const { open, pending, committed } = useDateRangePicker();
  const range = open ? pending : committed;
  if (isSingleDateOp(operator)) {
    return range?.from ? formatFilterDate(range.from) : 'Pick a date';
  }
  if (range?.from && range.to) {
    return `${formatFilterDate(range.from)} – ${formatFilterDate(range.to)}`;
  }
  return range?.from
    ? `${formatFilterDate(range.from)} –`
    : 'Pick a date range';
};

const SingleDateCalendar = () => {
  const { pending, setPending } = useDateRangePicker();
  return (
    <Calendar
      mode="single"
      selected={pending?.from}
      onSelect={(date) =>
        setPending(date ? { from: date, to: date } : undefined)
      }
    />
  );
};

// DateRangeFilterRenderer receives operator from the filter chip's active operator.
// It controls calendar mode, label computation, and value migration on operator switch.
// DateRangePicker holds the selection until Apply, preventing the onChange → navigate →
// URL sync → chip remount cycle that would reset the open state after each click.
const DateRangeFilterRenderer = ({
  values,
  onChange,
  operator,
}: DateRangeFilterRendererProps) => {
  const [from = '', to = ''] = values;

  // Operator-change value migration.
  // valuesRef keeps a fresh snapshot of `values` so the migration effect reads
  // the current array and not a stale closure capture.
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const prevOperatorRef = useRef(operator);
  useEffect(() => {
    const prevOp = prevOperatorRef.current;
    prevOperatorRef.current = operator;
    if (prevOp === operator) return;
    const migrated = migrateValues(prevOp, operator, valuesRef.current);
    // Only call onChange if the value shape actually changes (avoids loop)
    if (
      migrated.length !== valuesRef.current.length ||
      migrated.some((v, i) => v !== valuesRef.current[i])
    ) {
      onChange(migrated);
    }
    // onChange intentionally omitted — we only react to operator changes.
  }, [operator]);
  // valuesRef.current is the correct way to read the current values snapshot here.

  const singleDate = isSingleDateOp(operator);

  return (
    <DateRangePicker
      value={singleDate ? { from, to: from } : { from, to }}
      onApply={(range) =>
        onChange(singleDate ? [range.from] : [range.from, range.to])
      }
    >
      <DateRangePickerTrigger>
        <DateFilterLabel operator={operator} />
      </DateRangePickerTrigger>
      <DateRangePickerContent side="bottom">
        {singleDate ? <SingleDateCalendar /> : <DateRangePickerCalendar />}
        <DateRangePickerFooter>
          <DateRangePickerCancel />
          <DateRangePickerApply />
        </DateRangePickerFooter>
      </DateRangePickerContent>
    </DateRangePicker>
  );
};

export const buildFilterFields = (
  accounts: { id: string; name: string }[],
  categories: { id: string; name: string }[],
  members: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }[],
  tags: { id: string; name: string }[],
  options?: { includeImportResult?: boolean }
): FilterFieldConfig<string>[] => {
  const fields: FilterFieldConfig<string>[] = [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'expense', label: 'Expense' },
        { value: 'income', label: 'Income' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'settlement', label: 'Settlement' },
        { value: 'refund', label: 'Refund' },
        { value: 'contribution', label: 'Contribution' },
        // D-25: Internal shortcut — sets type to comma-separated internal types
        {
          value: 'transfer,settlement,contribution',
          label: 'Internal',
          icon: <Layers2 className="size-3.5" />,
        },
      ],
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'custom',
      defaultOperator: 'between',
      // Explicit operators override ReUI defaults — avoids duplicate 'is' key in DEFAULT_OPERATORS
      // for type 'custom' (filters.tsx lines 588–595) which caused a React key warning.
      operators: [
        { value: 'is', label: 'is' },
        { value: 'is_not', label: 'is not' },
        { value: 'before', label: 'before' },
        { value: 'after', label: 'after' },
        { value: 'between', label: 'between' },
        { value: 'not_between', label: 'not between' },
      ],
      customRenderer: ({ values, onChange, operator }) => (
        <DateRangeFilterRenderer
          values={values}
          onChange={onChange}
          operator={operator}
        />
      ),
    },
    {
      key: 'accountId',
      label: 'Account',
      type: 'select',
      options: accounts.map((a) => ({ value: a.id, label: a.name })),
    },
    {
      key: 'categoryId',
      label: 'Category',
      type: 'select',
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'assigneeId',
      label: 'Assignee',
      type: 'select',
      options: members.map((m) => ({
        value: m.id,
        label: memberFullLabel(m),
      })),
    },
    {
      key: 'tagIds',
      label: 'Tags',
      type: 'multiselect',
      defaultOperator: 'is_any_of',
      options: tags.map((t) => ({ value: t.id, label: t.name })),
    },
  ];
  if (options?.includeImportResult) {
    fields.push({
      key: 'importOutcome',
      label: 'Import result',
      type: 'select',
      options: [
        { value: 'created', label: 'Created' },
        { value: 'matched', label: 'Matched' },
      ],
    });
  }
  return fields;
};
