import { Layers2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { DatePicker } from '@ploutizo/ui/components/date-picker';
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
import { format, isValid, parseISO } from 'date-fns';
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

/** Filter values are ISO `yyyy-MM-dd` strings from the URL; anything else reads as unset. */
const parseFilterDate = (value: string): Date | undefined => {
  const date = parseISO(value);
  return value && isValid(date) ? date : undefined;
};

const toFilterValue = (date: Date) => format(date, 'yyyy-MM-dd');

// Shows the in-popover selection while open, and the committed filter otherwise.
const DateRangeFilterLabel = () => {
  const { open, pending, committed } = useDateRangePicker();
  const range = open ? pending : committed;
  if (range?.from && range.to) {
    return `${formatFilterDate(range.from)} – ${formatFilterDate(range.to)}`;
  }
  return range?.from
    ? `${formatFilterDate(range.from)} –`
    : 'Pick a date range';
};

// DateRangeFilterRenderer receives operator from the filter chip's active operator.
// It picks the single-date or range picker and migrates values on operator switch.
// DateRangePicker holds a range until Apply, preventing the onChange → navigate →
// URL sync → chip remount cycle that would reset the open state after the first click.
// DatePicker commits and closes on the one click a single date needs.
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

  if (isSingleDateOp(operator)) {
    return (
      <DatePicker
        value={from}
        // Clicking the picked day again reports '', which would drop the operator; keep the date instead.
        onChange={(isoDate) => {
          if (isoDate) onChange([isoDate]);
        }}
        // Sits inside the filter chip, which draws the border and hover.
        className="h-auto w-auto border-0 bg-transparent p-0 font-normal shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
      />
    );
  }

  const fromDate = parseFilterDate(from);
  const toDate = parseFilterDate(to);

  return (
    <DateRangePicker
      value={{ from: fromDate, to: toDate }}
      onApply={(range) =>
        onChange([toFilterValue(range.from), toFilterValue(range.to)])
      }
    >
      <DateRangePickerTrigger>
        <DateRangeFilterLabel />
      </DateRangePickerTrigger>
      <DateRangePickerContent side="bottom">
        <DateRangePickerCalendar />
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
