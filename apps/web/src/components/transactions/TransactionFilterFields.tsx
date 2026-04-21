import { useState } from 'react';
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

interface DateRangeFilterRendererProps {
  values: string[];
  onChange: (values: string[]) => void;
}

// Local selection state means date clicks don't fire onChange until Apply,
// preventing the onChange → navigate → URL sync → chip remount cycle that
// would reset the open state after each click.
const DateRangeFilterRenderer = ({
  values,
  onChange,
}: DateRangeFilterRendererProps) => {
  const [open, setOpen] = useState(false);
  const [from = '', to = ''] = values;
  const fromDate = from && isValid(parseISO(from)) ? parseISO(from) : undefined;
  const toDate = to && isValid(parseISO(to)) ? parseISO(to) : undefined;

  const [pending, setPending] = useState<DateRange | undefined>(
    (fromDate ?? toDate) ? { from: fromDate, to: toDate } : undefined
  );

  const label =
    fromDate && toDate
      ? `${format(fromDate, 'MMM d, yyyy')} – ${format(toDate, 'MMM d, yyyy')}`
      : fromDate
        ? `From ${format(fromDate, 'MMM d, yyyy')}`
        : 'Pick a date range';

  const handleApply = () => {
    const newFrom = pending?.from ? format(pending.from, 'yyyy-MM-dd') : '';
    const newTo = pending?.to ? format(pending.to, 'yyyy-MM-dd') : '';
    onChange([newFrom, newTo]);
    setOpen(false);
  };

  const handleCancel = () => {
    // Reset pending to committed values
    setPending((fromDate ?? toDate) ? { from: fromDate, to: toDate } : undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>{label}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <Calendar
          mode="range"
          selected={pending}
          onSelect={setPending}
          numberOfMonths={2}
        />
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
  tags: { id: string; name: string }[]
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
        { value: 'transfer,settlement,contribution', label: 'Internal' },
      ],
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'custom',
      defaultOperator: 'between',
      // Date range uses between operator: values are [from, to] strings
      customRenderer: ({ values, onChange }) => (
        <DateRangeFilterRenderer values={values} onChange={onChange} />
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
