import { Layers2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import { Calendar } from '@ploutizo/ui/components/calendar';
import { Button } from '@ploutizo/ui/components/button';
import { format, isValid, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { FilterFieldConfig } from '@ploutizo/ui/components/reui/filters';

const SINGLE_DATE_OPS = new Set(['is', 'is_not', 'before', 'after']);
const RANGE_OPS = new Set(['between', 'not_between']);

function isSingleDateOp(op: string): boolean {
  return SINGLE_DATE_OPS.has(op);
}
function isRangeOp(op: string): boolean {
  return RANGE_OPS.has(op);
}

// State migration rules when switching operators:
// single→range:      [A]    → [A, '']
// range→single:      [A, B] → [A]
// same family (e.g. is↔is_not, between↔not_between): values unchanged
function migrateValues(prevOp: string, nextOp: string, values: string[]): string[] {
  const prevIsRange = isRangeOp(prevOp);
  const nextIsRange = isRangeOp(nextOp);
  if (prevIsRange === nextIsRange) return values; // same family — keep values
  if (!prevIsRange && nextIsRange) return [values[0] ?? '', '']; // single → range
  return [values[0] ?? '']; // range → single
}

interface DateRangeFilterRendererProps {
  values: string[];
  onChange: (values: string[]) => void;
  operator: string;
}

// DateRangeFilterRenderer receives operator from the filter chip's active operator.
// It controls calendar mode, label computation, and value migration on operator switch.
// Local selection state means date clicks don't fire onChange until Apply,
// preventing the onChange → navigate → URL sync → chip remount cycle that
// would reset the open state after each click.
const DateRangeFilterRenderer = ({
  values,
  onChange,
  operator,
}: DateRangeFilterRendererProps) => {
  const [open, setOpen] = useState(false);
  const [from = '', to = ''] = values;
  const fromDate = from && isValid(parseISO(from)) ? parseISO(from) : undefined;
  const toDate = to && isValid(parseISO(to)) ? parseISO(to) : undefined;

  // pending tracks in-popover selection before Apply is clicked.
  const [pending, setPending] = useState<DateRange | undefined>(
    (fromDate ?? toDate) ? { from: fromDate, to: toDate } : undefined,
  );

  // Reset pending to committed values when popover opens (prevents stale pending after cancel).
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setPending((fromDate ?? toDate) ? { from: fromDate, to: toDate } : undefined);
    }
    prevOpen.current = open;
  }, [open, fromDate, toDate]);

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
  }, [operator]); // eslint-disable-line react-hooks/exhaustive-deps
  // onChange intentionally omitted — we only react to operator changes.
  // valuesRef.current is the correct way to read the current values snapshot here.

  // Compute trigger label from pending (real-time) or committed values when closed.
  const effectiveFrom = open ? pending?.from : fromDate;
  const effectiveTo = open ? pending?.to : toDate;

  let label: string;
  if (isSingleDateOp(operator)) {
    label = effectiveFrom ? format(effectiveFrom, 'MMM d, yyyy') : 'Pick a date';
  } else {
    if (effectiveFrom && effectiveTo) {
      label = `${format(effectiveFrom, 'MMM d, yyyy')} – ${format(effectiveTo, 'MMM d, yyyy')}`;
    } else if (effectiveFrom) {
      label = `${format(effectiveFrom, 'MMM d, yyyy')} –`;
    } else {
      label = 'Pick a date range';
    }
  }

  const handleApply = () => {
    if (isSingleDateOp(operator)) {
      const newFrom = pending?.from ? format(pending.from, 'yyyy-MM-dd') : '';
      onChange([newFrom]);
    } else {
      const newFrom = pending?.from ? format(pending.from, 'yyyy-MM-dd') : '';
      const newTo = pending?.to ? format(pending.to, 'yyyy-MM-dd') : '';
      onChange([newFrom, newTo]);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setPending((fromDate ?? toDate) ? { from: fromDate, to: toDate } : undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>{label}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        {isSingleDateOp(operator) ? (
          <Calendar
            mode="single"
            selected={pending?.from}
            onSelect={(date) => setPending(date ? { from: date, to: date } : undefined)}
          />
        ) : (
          <Calendar
            mode="range"
            selected={pending}
            onSelect={setPending}
            numberOfMonths={2}
          />
        )}
        <div className="flex justify-end gap-2 border-t border-border px-3 py-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export function buildFilterFields(
  accounts: { id: string; name: string }[],
  categories: { id: string; name: string }[],
  members: { id: string; displayName: string }[],
  tags: { id: string; name: string }[],
): FilterFieldConfig<string>[] {
  return [
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
        { value: 'transfer,settlement,contribution', label: 'Internal', icon: <Layers2 className="size-3.5" /> },
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
          operator={operator ?? 'between'}
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
      options: members.map((m) => ({ value: m.id, label: m.displayName })),
    },
    {
      key: 'tagIds',
      label: 'Tags',
      type: 'multiselect',
      defaultOperator: 'is_any_of',
      options: tags.map((t) => ({ value: t.id, label: t.name })),
    },
  ];
}
